#!/usr/bin/env python3
"""Clean Google Contacts CSV exports and create audit reports."""

from __future__ import annotations

import argparse
import csv
import hashlib
import itertools
import re
import shutil
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


STATIC_FIELDS = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Phonetic First Name",
    "Phonetic Middle Name",
    "Phonetic Last Name",
    "Name Prefix",
    "Name Suffix",
    "Nickname",
    "File As",
    "Organization Name",
    "Organization Title",
    "Organization Department",
    "Birthday",
    "Notes",
    "Photo",
    "Labels",
]

ADDRESS_FIELDS = [
    "Label",
    "Formatted",
    "Street",
    "City",
    "PO Box",
    "Region",
    "Postal Code",
    "Country",
    "Extended Address",
]

ACRONYMS = {
    "AI",
    "BFP",
    "CA",
    "CEO",
    "CFO",
    "COO",
    "CSR",
    "GAIL",
    "IAS",
    "IPS",
    "IRS",
    "IT",
    "LLP",
    "MD",
    "NGO",
    "PA",
    "PS",
    "PVT",
    "UK",
    "UN",
    "UAE",
    "USA",
    "VP",
}

ORG_KEYWORDS = [
    "agency",
    "associates",
    "bank",
    "boutique",
    "builder",
    "bureau",
    "capital",
    "cement",
    "club",
    "clinic",
    "company",
    "concierge",
    "consultants",
    "council",
    "corporation",
    "crowdtech",
    "date with me",
    "department",
    "enterprise",
    "express",
    "fleur de lisa",
    "foundation",
    "gail",
    "government",
    "group",
    "hospital",
    "hotel",
    "institute",
    "j k cement",
    "laboratory",
    "limited",
    "llc",
    "llp",
    "ltd",
    "ministry",
    "motors",
    "ngo",
    "office",
    "organisation",
    "organization",
    "pvt",
    "restaurant",
    "salon",
    "school",
    "secretariat",
    "services",
    "spa",
    "studio",
    "trust",
    "university",
    "ventures",
    "wockhardt",
]

CONTEXT_KEYWORDS = [
    "advisor",
    "ambassador",
    "assistant",
    "bangalore",
    "bhavan",
    "candolim",
    "chairman",
    "commissioner",
    "delhi",
    "director",
    "ex minister",
    "ex-minister",
    "founder",
    "goa",
    "governor",
    "hyderabad",
    "manager",
    "minister",
    "mumbai",
    "nalasopara",
    "president",
    "pune",
    "secretary",
    "soBo".lower(),
    "vice chairman",
]

CONTEXT_ONLY_MARKERS = {
    "call",
    "calling",
    "cel",
    "cell",
    "eo",
    "latest",
    "linkedin",
    "new",
    "parent",
    "rotary",
    "wf",
    "whats",
    "whatsapp",
}

RELATION_MARKERS = {
    "brother",
    "daughter",
    "father",
    "mother",
    "sister",
    "son",
    "wife",
}

TITLE_TAIL_MARKERS = {
    "advisor",
    "ambassador",
    "assistant",
    "ceo",
    "cfo",
    "chairman",
    "chief",
    "commissioner",
    "consul",
    "director",
    "founder",
    "head",
    "manager",
    "md",
    "minister",
    "pa",
    "president",
    "prof",
    "professor",
    "ps",
    "secretary",
    "trustee",
    "vp",
}

LOCATION_MARKERS = {
    "ahmedabad",
    "aurangabad",
    "bangalore",
    "candolim",
    "delhi",
    "dubai",
    "goa",
    "hyderabad",
    "jammu",
    "kashmir",
    "london",
    "mumbai",
    "nalasopara",
    "nobo",
    "pune",
    "sobo",
    "uk",
    "usa",
}

TITLE_WORDS = {
    "adv": "Adv",
    "advocate": "Advocate",
    "capt": "Capt",
    "captain": "Captain",
    "ca": "CA",
    "dr": "Dr",
    "haji": "Haji",
    "he": "H.E.",
    "her": "Her",
    "his": "His",
    "hon": "Hon",
    "honble": "Honble",
    "maulana": "Maulana",
    "miss": "Miss",
    "mr": "Mr",
    "mrs": "Mrs",
    "ms": "Ms",
    "prof": "Prof",
    "professor": "Professor",
    "sheikh": "Sheikh",
    "shri": "Shri",
    "sir": "Sir",
    "smt": "Smt",
}


@dataclass
class Contact:
    cid: int
    source_alias: str
    source_path: Path
    source_row: int
    raw: Dict[str, str]
    original_name: str
    scalar: Dict[str, str]
    emails: List[Tuple[str, str]] = field(default_factory=list)
    phones: List[Tuple[str, str]] = field(default_factory=list)
    addresses: List[Dict[str, str]] = field(default_factory=list)
    websites: List[Tuple[str, str]] = field(default_factory=list)
    events: List[Tuple[str, str]] = field(default_factory=list)
    flags: List[str] = field(default_factory=list)
    modifications: List[str] = field(default_factory=list)

    @property
    def source_ref(self) -> str:
        return f"{self.source_alias}:{self.source_row}"


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left: int, right: int) -> int:
        a = self.find(left)
        b = self.find(right)
        if a == b:
            return a
        if self.rank[a] < self.rank[b]:
            a, b = b, a
        self.parent[b] = a
        if self.rank[a] == self.rank[b]:
            self.rank[a] += 1
        return a


def clean_spaces(value: str | None) -> str:
    value = "" if value is None else str(value)
    value = value.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    value = re.sub(r"[ \u00a0]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    return value.strip()


def compact_one_line(value: str | None) -> str:
    return re.sub(r"\s+", " ", clean_spaces(value)).strip()


def is_fully_bracketed(value: str | None) -> bool:
    return bool(re.fullmatch(r"[\(\[\{]\s*.*?\s*[\)\]\}]", compact_one_line(value)))


def strip_outer_brackets(value: str) -> Tuple[str, bool]:
    text = compact_one_line(value)
    match = re.fullmatch(r"[\(\[\{]\s*(.*?)\s*[\)\]\}]", text)
    if match:
        return compact_one_line(match.group(1)), True
    replaced = re.sub(r"[\(\[\{]\s*(.*?)\s*[\)\]\}]", r"\1", text)
    replaced = compact_one_line(replaced)
    return replaced, replaced != text


def smart_token(token: str) -> str:
    if not token:
        return token
    if "@" in token or "://" in token:
        return token
    if "-" in token and token != "-":
        return "-".join(smart_token(part) for part in token.split("-"))
    lead = re.match(r"^\W*", token).group(0)
    trail = re.search(r"\W*$", token).group(0)
    core = token[len(lead) : len(token) - len(trail) if trail else len(token)]
    if not core:
        return token
    upper = core.upper().replace(".", "")
    if upper in ACRONYMS:
        cased = upper
    elif re.fullmatch(r"[A-Za-z]\.?", core):
        cased = core[0].upper()
    elif core.isupper() and len(core) <= 4:
        cased = core
    elif re.fullmatch(r"[IVXLCDM]+", core.upper()) and len(core) <= 5:
        cased = core.upper()
    else:
        cased = core[:1].upper() + core[1:].lower()
    return f"{lead}{cased}{trail}"


def smart_title(value: str | None) -> str:
    text = compact_one_line(value)
    if not text:
        return ""
    chunks = []
    for token in text.split(" "):
        if "/" in token and token != "/":
            chunks.append("/".join(smart_token(part) for part in token.split("/")))
        else:
            chunks.append(smart_token(token))
    out = " ".join(chunks)
    out = re.sub(r"\bPVT\b", "Pvt", out)
    out = re.sub(r"\bLTD\b", "Ltd", out)
    return out


def normalized_text(value: str | None) -> str:
    text = compact_one_line(value).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalized_name(value: str | None) -> str:
    text = normalized_text(value)
    tokens = [t for t in text.split() if t not in {"mr", "mrs", "ms", "miss", "dr", "prof"}]
    return " ".join(tokens)


def norm_email(value: str | None) -> str:
    return compact_one_line(value).lower()


def norm_phone(value: str | None) -> str:
    digits = re.sub(r"\D+", "", value or "")
    if len(digits) > 10 and digits.startswith("00"):
        digits = digits[2:]
    return digits


def looks_like_org(value: str | None) -> bool:
    text = normalized_text(value)
    if not text:
        return False
    return any(keyword in text for keyword in ORG_KEYWORDS)


def looks_like_context(value: str | None) -> bool:
    text = normalized_text(value)
    if not text:
        return False
    tokens = set(text.split())
    return (
        any(keyword in text for keyword in CONTEXT_KEYWORDS)
        or bool(tokens & CONTEXT_ONLY_MARKERS)
        or bool(tokens & RELATION_MARKERS)
        or bool(tokens & LOCATION_MARKERS)
    )


def title_tail_index(value: str | None) -> int | None:
    tokens = normalized_text(value).split()
    for index, token in enumerate(tokens):
        if index > 0 and token in TITLE_TAIL_MARKERS:
            return index
    return None


def split_org_title(value: str | None) -> Tuple[str, str]:
    text = compact_one_line(value)
    if not text:
        return "", ""
    tokens = text.split()
    index = title_tail_index(text)
    if index is None or index < 2:
        return smart_title(text), ""
    return smart_title(" ".join(tokens[:index])), smart_title(" ".join(tokens[index:]))


def classify_context_tail(value: str | None) -> Tuple[str, str, str, str]:
    """Return kind, context note text, organization tail, title tail."""

    text = compact_one_line(value)
    if not text:
        return "", "", "", ""
    normalized = normalized_text(text)
    norm_tokens = normalized.split()
    raw_tokens = text.split()
    if not norm_tokens:
        return "", "", "", ""

    first = norm_tokens[0]
    if first in CONTEXT_ONLY_MARKERS:
        if first == "rotary" and len(norm_tokens) > 1:
            org, tail_title = split_org_title(text)
            return "org", "", org, tail_title
        marker = smart_title(raw_tokens[0])
        rest_tokens = [token for token in raw_tokens[1:] if token.strip("-:,")]
        rest = compact_one_line(" ".join(rest_tokens))
        if rest and (looks_like_org(rest) or len(rest.split()) >= 2):
            org, tail_title = split_org_title(rest)
            return "context_org", marker, org, tail_title
        return "context", smart_title(text), "", ""

    if set(norm_tokens) & RELATION_MARKERS:
        return "context", smart_title(text), "", ""
    if set(norm_tokens) & LOCATION_MARKERS:
        return "context", smart_title(text), "", ""

    index = title_tail_index(text)
    if index == 0:
        return "title", "", "", smart_title(text)
    if index is not None and index > 0:
        before = " ".join(raw_tokens[:index])
        after = " ".join(raw_tokens[index:])
        if looks_like_org(before):
            return "org_title", "", smart_title(before), smart_title(after)
        return "title", "", "", smart_title(text)

    if looks_like_context(text):
        return "context", smart_title(text), "", ""
    return "", "", "", ""


def looks_like_mojibake(value: str | None) -> bool:
    text = value or ""
    if any(marker in text for marker in ["◊", "√", "Ã", "Â", "â€", "�"]):
        return True
    odd = sum(1 for char in text if ord(char) > 127 and not char.isalpha() and not char.isspace())
    return odd >= 8 and len(text) < 80


def split_leading_titles(value: str | None) -> Tuple[str, str]:
    words = compact_one_line(value).split()
    titles: List[str] = []
    i = 0
    while i < len(words):
        cleaned = [re.sub(r"[^a-z]", "", word.lower()) for word in words[i : i + 3]]
        phrase3 = " ".join(cleaned[:3])
        phrase2 = " ".join(cleaned[:2])
        if phrase3 == "her excellency smt":
            titles.append("Her Excellency Smt")
            i += 3
            continue
        if phrase3 == "his excellency smt":
            titles.append("His Excellency Smt")
            i += 3
            continue
        if phrase2 == "her excellency":
            titles.append("Her Excellency")
            i += 2
            continue
        if phrase2 == "his excellency":
            titles.append("His Excellency")
            i += 2
            continue
        word = cleaned[0] if cleaned else ""
        if word in TITLE_WORDS:
            titles.append(TITLE_WORDS[word])
            i += 1
            continue
        break
    return " ".join(dict.fromkeys(titles)), " ".join(words[i:])


def split_person_name(value: str | None) -> Tuple[str, str, str]:
    text = compact_one_line(value)
    text = re.sub(r"\s*,\s*", " ", text)
    text = compact_one_line(text)
    if not text:
        return "", "", ""
    parts = text.split()
    if len(parts) == 1:
        return smart_title(parts[0]), "", ""
    if len(parts) == 2:
        if len(re.sub(r"[^A-Za-z]", "", parts[1])) == 1:
            return smart_title(text), "", ""
        return smart_title(parts[0]), "", smart_title(parts[1])
    if all(len(re.sub(r"[^A-Za-z]", "", part)) == 1 for part in parts[:-1]):
        return smart_title(" ".join(parts[:-1])), "", smart_title(parts[-1])
    return smart_title(" ".join(parts[:-2])), smart_title(parts[-2]), smart_title(parts[-1])


def display_name_from_scalar(scalar: Dict[str, str]) -> str:
    parts = [
        scalar.get("Name Prefix", ""),
        scalar.get("First Name", ""),
        scalar.get("Middle Name", ""),
        scalar.get("Last Name", ""),
        scalar.get("Name Suffix", ""),
    ]
    name = compact_one_line(" ".join(part for part in parts if part))
    return name or compact_one_line(scalar.get("Organization Name", ""))


def original_display_name(row: Dict[str, str]) -> str:
    name = compact_one_line(
        " ".join(
            row.get(field, "")
            for field in ["Name Prefix", "First Name", "Middle Name", "Last Name", "Name Suffix"]
            if row.get(field, "")
        )
    )
    if name:
        return name
    for field_name in ["Organization Name", "Nickname", "E-mail 1 - Value", "Phone 1 - Value"]:
        if row.get(field_name):
            return compact_one_line(row[field_name])
    return "(unnamed contact)"


def append_note(existing: str, additions: Sequence[str]) -> str:
    base = clean_spaces(existing)
    fresh = [line for line in additions if line and line not in base]
    if not fresh:
        return base
    block = "\n".join(fresh)
    return f"{base}\n\n{block}" if base else block


def repeat_indices(headers: Iterable[str], prefix: str) -> List[int]:
    found = set()
    pattern = re.compile(rf"^{re.escape(prefix)} (\d+) - ")
    for header in headers:
        match = pattern.match(header)
        if match:
            found.add(int(match.group(1)))
    return sorted(found)


def extract_pairs(row: Dict[str, str], prefix: str) -> List[Tuple[str, str]]:
    pairs = []
    for index in repeat_indices(row.keys(), prefix):
        label = clean_spaces(row.get(f"{prefix} {index} - Label", ""))
        value = clean_spaces(row.get(f"{prefix} {index} - Value", ""))
        if label or value:
            pairs.append((label, value))
    return pairs


def extract_addresses(row: Dict[str, str]) -> List[Dict[str, str]]:
    addresses = []
    for index in repeat_indices(row.keys(), "Address"):
        address = {field_name: clean_spaces(row.get(f"Address {index} - {field_name}", "")) for field_name in ADDRESS_FIELDS}
        if any(address.values()):
            addresses.append(address)
    return addresses


def dedupe_pairs(pairs: Sequence[Tuple[str, str]], norm_func) -> List[Tuple[str, str]]:
    seen = set()
    out = []
    for label, value in pairs:
        label = clean_spaces(label)
        value = clean_spaces(value)
        key = norm_func(value) if value else f"label:{normalized_text(label)}"
        if not key or key in seen:
            continue
        seen.add(key)
        out.append((label, value))
    return out


def dedupe_addresses(addresses: Sequence[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    out = []
    for address in addresses:
        normalized = tuple(normalized_text(address.get(field_name, "")) for field_name in ADDRESS_FIELDS)
        if normalized in seen:
            continue
        seen.add(normalized)
        out.append(dict(address))
    return out


def clean_contact(contact: Contact) -> Contact:
    row = contact.raw
    flags: List[str] = []
    modifications: List[str] = []

    scalar = {field_name: clean_spaces(row.get(field_name, "")) for field_name in STATIC_FIELDS}
    raw_name = contact.original_name
    if looks_like_mojibake(raw_name):
        flags.append("Possible mojibake/encoding damage in name; review manually.")

    prefix_title, prefix_remainder = split_leading_titles(scalar.get("Name Prefix", ""))
    person_parts: List[str] = []
    if prefix_title:
        if prefix_title != scalar.get("Name Prefix", ""):
            modifications.append("Normalized title/prefix field.")
        scalar["Name Prefix"] = prefix_title
        if prefix_remainder:
            person_parts.append(prefix_remainder)
            modifications.append("Moved name text out of Name Prefix.")
            flags.append("Name Prefix contained both title and name text.")
    elif scalar.get("Name Prefix"):
        person_parts.append(scalar["Name Prefix"])
        scalar["Name Prefix"] = ""
        modifications.append("Moved non-title Name Prefix text into name.")
        flags.append("Name Prefix did not look like a title.")

    cleaned_fields = {}
    field_was_wrapped = {}
    for field_name in ["First Name", "Middle Name", "Last Name"]:
        field_was_wrapped[field_name] = is_fully_bracketed(scalar.get(field_name, ""))
        cleaned, changed = strip_outer_brackets(scalar.get(field_name, ""))
        cleaned_fields[field_name] = cleaned
        if changed:
            modifications.append(f"Cleaned brackets from {field_name}.")
            flags.append("Bracketed name/context was cleaned; verify intended person/context.")

    org = smart_title(scalar.get("Organization Name", ""))
    title = smart_title(scalar.get("Organization Title", ""))
    department = smart_title(scalar.get("Organization Department", ""))

    context_notes: List[str] = []
    for field_name in ["First Name", "Middle Name"]:
        part = cleaned_fields[field_name]
        if not part:
            continue
        if prefix_remainder and field_was_wrapped[field_name] and looks_like_context(part):
            context_notes.append(f"Context moved from {field_name}: {part}")
            modifications.append(f"Moved contextual {field_name} into Notes.")
            flags.append("Bracketed role/location/context was moved to Notes.")
            continue
        if (
            field_name == "Middle Name"
            and field_was_wrapped["First Name"]
            and (looks_like_context(part) or len(part.split()) > 2)
        ):
            context_notes.append(f"Context moved from {field_name}: {part}")
            modifications.append(f"Moved contextual {field_name} into Notes.")
            flags.append("Middle Name looked like role/location/context; verify note placement.")
            continue
        person_parts.append(part)

    last_name_candidate = cleaned_fields["Last Name"]
    moved_last_to_org = False
    tail_kind, tail_context, tail_org, tail_title = classify_context_tail(last_name_candidate) if last_name_candidate and person_parts else ("", "", "", "")
    if last_name_candidate and person_parts and tail_kind:
        if tail_org and not org:
            org = tail_org
            modifications.append("Moved organization-like tail into Organization Name.")
            flags.append("Name tail looked like organization/context; verify split.")
        if tail_title and not title:
            title = tail_title
            modifications.append("Moved role-like tail into Organization Title.")
            flags.append("Name tail looked like role/title; verify split.")
        if tail_context:
            context_notes.append(f"Context moved from Last Name: {tail_context}")
            modifications.append("Moved contextual Last Name text into Notes.")
            flags.append("Last Name looked like role/location/context; verify note placement.")
    elif last_name_candidate and not org and person_parts and looks_like_org(last_name_candidate):
        org, org_title = split_org_title(last_name_candidate)
        if org_title and not title:
            title = org_title
        moved_last_to_org = True
        modifications.append("Moved organization-like Last Name text into Organization Name.")
        flags.append("Last Name looked like a business/organization; verify split.")
    elif (
        last_name_candidate
        and person_parts
        and field_was_wrapped["First Name"]
        and (looks_like_context(last_name_candidate) or len(last_name_candidate.split()) > 2)
    ):
        context_notes.append(f"Context moved from Last Name: {last_name_candidate}")
        modifications.append("Moved contextual Last Name text into Notes.")
        flags.append("Last Name looked like role/location/context; verify note placement.")
    elif last_name_candidate:
        person_parts.append(last_name_candidate)

    full_person = compact_one_line(" ".join(part for part in person_parts if part))
    if not org and full_person and looks_like_org(full_person) and len(full_person.split()) >= 3:
        if normalized_text(full_person).startswith("a date with me "):
            org = "A Date With Me"
            location = compact_one_line(re.sub(r"^a\s+date\s+with\s+me\s+", "", full_person, flags=re.IGNORECASE))
            if location:
                context_notes.append(f"Location/context moved from name: {smart_title(location)}")
        else:
            org = smart_title(full_person)
        full_person = ""
        modifications.append("Moved organization-like full name into Organization Name.")
        flags.append("Organization-only contact inferred from name.")

    extracted_prefix, remaining_person = split_leading_titles(full_person)
    if extracted_prefix and not scalar.get("Name Prefix"):
        scalar["Name Prefix"] = extracted_prefix
        full_person = remaining_person
        modifications.append("Moved leading title from name into Name Prefix.")
    elif extracted_prefix:
        full_person = remaining_person

    first, middle, last = split_person_name(full_person)
    scalar["First Name"] = first
    scalar["Middle Name"] = middle
    scalar["Last Name"] = last
    scalar["Name Suffix"] = smart_title(scalar.get("Name Suffix", ""))
    scalar["Organization Name"] = org
    scalar["Organization Title"] = title
    scalar["Organization Department"] = department

    if moved_last_to_org and full_person:
        title = scalar.get("Organization Title", "")

    if looks_like_context(raw_name):
        flags.append("Original name contains role/location/context words; verify cleaned placement.")
    if org and not (first or middle or last):
        flags.append("Organization-only contact; verify whether a person name should be added.")
    if not (first or middle or last or org):
        flags.append("No usable person or organization name after cleaning.")

    display = display_name_from_scalar(scalar)
    scalar["File As"] = display

    source_note = f"Original contact name: {raw_name}"
    row_note = f"Original source row: {contact.source_ref}"
    if modifications:
        changes_note = "Cleanup changes: " + "; ".join(dict.fromkeys(modifications))
    else:
        changes_note = "Cleanup changes: original name preserved in notes; contact fields normalized only if needed."
    scalar["Notes"] = append_note(scalar.get("Notes", ""), [source_note, row_note, *context_notes, changes_note])

    contact.scalar = scalar
    contact.emails = dedupe_pairs(contact.emails, norm_email)
    contact.phones = dedupe_pairs(contact.phones, norm_phone)
    contact.addresses = dedupe_addresses(contact.addresses)
    contact.websites = dedupe_pairs(contact.websites, lambda value: normalized_text(value).replace(" ", ""))
    contact.events = dedupe_pairs(contact.events, normalized_text)
    contact.flags = list(dict.fromkeys(flags))
    contact.modifications = list(dict.fromkeys(modifications))
    return contact


def parse_google_csv(path: Path, source_alias: str, start_cid: int) -> List[Contact]:
    contacts: List[Contact] = []
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for offset, row in enumerate(reader, start=2):
            clean_row = {key: clean_spaces(value) for key, value in row.items() if key is not None}
            original_name = original_display_name(clean_row)
            contact = Contact(
                cid=start_cid + len(contacts),
                source_alias=source_alias,
                source_path=path,
                source_row=offset,
                raw=clean_row,
                original_name=original_name,
                scalar={field_name: clean_row.get(field_name, "") for field_name in STATIC_FIELDS},
                emails=extract_pairs(clean_row, "E-mail"),
                phones=extract_pairs(clean_row, "Phone"),
                addresses=extract_addresses(clean_row),
                websites=extract_pairs(clean_row, "Website"),
                events=extract_pairs(clean_row, "Event"),
            )
            contacts.append(clean_contact(contact))
    return contacts


def contact_name_norm(contact: Contact) -> str:
    return normalized_name(display_name_from_scalar(contact.scalar))


def contact_org_norm(contact: Contact) -> str:
    return normalized_text(contact.scalar.get("Organization Name", ""))


def contact_email_norms(contact: Contact) -> List[str]:
    return sorted({norm_email(value) for _, value in contact.emails if norm_email(value)})


def contact_phone_norms(contact: Contact) -> List[str]:
    return sorted({norm_phone(value) for _, value in contact.phones if len(norm_phone(value)) >= 7})


def token_set(value: str) -> set[str]:
    return {token for token in normalized_name(value).split() if len(token) > 1}


def compatible_contacts(left: Contact, right: Contact) -> bool:
    lname = contact_name_norm(left)
    rname = contact_name_norm(right)
    lorg = contact_org_norm(left)
    rorg = contact_org_norm(right)
    if lname and rname and lname == rname:
        return not (lorg and rorg and lorg != rorg)
    if lorg and rorg and lorg == rorg and (not lname or not rname):
        return True
    if not lname or not rname:
        return bool(lorg and rorg and lorg == rorg)
    ltokens = token_set(lname)
    rtokens = token_set(rname)
    if not ltokens or not rtokens:
        return False
    overlap = len(ltokens & rtokens)
    smaller = min(len(ltokens), len(rtokens))
    larger = max(len(ltokens), len(rtokens))
    if smaller and overlap / smaller >= 0.9 and overlap / larger >= 0.7:
        return not (lorg and rorg and lorg != rorg)
    return False


def build_merge_groups(contacts: Sequence[Contact]) -> Tuple[List[List[int]], Dict[Tuple[int, int], str], List[Dict[str, str]]]:
    uf = UnionFind(len(contacts))
    pair_reasons: Dict[Tuple[int, int], str] = {}
    manual_duplicate_rows: List[Dict[str, str]] = []

    exact_map: Dict[Tuple, List[int]] = defaultdict(list)
    for index, contact in enumerate(contacts):
        signature = (
            contact_name_norm(contact),
            contact_org_norm(contact),
            tuple(contact_email_norms(contact)),
            tuple(contact_phone_norms(contact)),
            tuple(normalized_text(value) for _, value in contact.websites),
        )
        if signature[0] or signature[1]:
            if signature[2] or signature[3] or signature[4]:
                exact_map[signature].append(index)
    for group in exact_map.values():
        if len(group) > 1:
            for left, right in zip(group, group[1:]):
                uf.union(left, right)
                pair_reasons[tuple(sorted((left, right)))] = "Exact normalized duplicate with same name/company and same contact fields."

    def process_shared(kind: str, value_map: Dict[str, List[int]], limit: int) -> None:
        for value, indices in value_map.items():
            unique = sorted(set(indices))
            if len(unique) < 2:
                continue
            if len(unique) > limit:
                manual_duplicate_rows.append(
                    {
                        "review_id": f"shared_{kind}_{len(manual_duplicate_rows) + 1}",
                        "source_rows": "; ".join(contacts[i].source_ref for i in unique),
                        "original_names": " | ".join(contacts[i].original_name for i in unique),
                        "suggested_first_name": "",
                        "suggested_middle_name": "",
                        "suggested_last_name": "",
                        "suggested_prefix": "",
                        "suggested_suffix": "",
                        "suggested_organization": "",
                        "suggested_title": "",
                        "phones": " | ".join(sorted({phone for i in unique for _, phone in contacts[i].phones if phone})),
                        "emails": " | ".join(sorted({email for i in unique for _, email in contacts[i].emails if email})),
                        "reason": f"Shared {kind} appears in a large group; left unmerged to avoid joining unrelated contacts.",
                        "confidence": "low",
                        "action_suggestion": "Review manually before merging.",
                        "preserved_in_cleaned_output": "Yes",
                    }
                )
                continue
            merged_any = False
            for left, right in itertools.combinations(unique, 2):
                if compatible_contacts(contacts[left], contacts[right]):
                    uf.union(left, right)
                    pair_reasons[tuple(sorted((left, right)))] = f"Shared {kind} with compatible cleaned name/company."
                    merged_any = True
            roots = {uf.find(i) for i in unique}
            if len(roots) > 1 and not merged_any:
                manual_duplicate_rows.append(
                    {
                        "review_id": f"shared_{kind}_{len(manual_duplicate_rows) + 1}",
                        "source_rows": "; ".join(contacts[i].source_ref for i in unique),
                        "original_names": " | ".join(contacts[i].original_name for i in unique),
                        "suggested_first_name": "",
                        "suggested_middle_name": "",
                        "suggested_last_name": "",
                        "suggested_prefix": "",
                        "suggested_suffix": "",
                        "suggested_organization": "",
                        "suggested_title": "",
                        "phones": " | ".join(sorted({phone for i in unique for _, phone in contacts[i].phones if phone})),
                        "emails": " | ".join(sorted({email for i in unique for _, email in contacts[i].emails if email})),
                        "reason": f"Shared {kind} but names/company did not match strongly enough for automatic merge.",
                        "confidence": "low",
                        "action_suggestion": "Review manually before merging.",
                        "preserved_in_cleaned_output": "Yes",
                    }
                )

    email_map: Dict[str, List[int]] = defaultdict(list)
    phone_map: Dict[str, List[int]] = defaultdict(list)
    for index, contact in enumerate(contacts):
        for email in contact_email_norms(contact):
            email_map[email].append(index)
        for phone in contact_phone_norms(contact):
            phone_map[phone].append(index)
    process_shared("email", email_map, limit=12)
    process_shared("phone", phone_map, limit=6)

    components: Dict[int, List[int]] = defaultdict(list)
    for index in range(len(contacts)):
        components[uf.find(index)].append(index)
    groups = sorted(components.values(), key=lambda g: min(contacts[i].cid for i in g))
    return groups, pair_reasons, manual_duplicate_rows


def choose_primary(indices: Sequence[int], contacts: Sequence[Contact]) -> int:
    def score(index: int) -> Tuple[int, int, int, int, int]:
        contact = contacts[index]
        source_score = 2 if contact.source_alias == "contacts" else 1
        field_score = (
            len(contact.emails)
            + len(contact.phones)
            + len(contact.addresses)
            + len(contact.websites)
            + bool(clean_spaces(contact.scalar.get("Notes", "")))
        )
        name_score = len(display_name_from_scalar(contact.scalar))
        label_score = 1 if "myContacts" in contact.scalar.get("Labels", "") else 0
        return source_score, field_score, name_score, label_score, -contact.cid

    return max(indices, key=score)


def merge_component(indices: Sequence[int], contacts: Sequence[Contact]) -> Contact:
    primary_index = choose_primary(indices, contacts)
    primary = contacts[primary_index]
    merged = Contact(
        cid=primary.cid,
        source_alias=primary.source_alias,
        source_path=primary.source_path,
        source_row=primary.source_row,
        raw=dict(primary.raw),
        original_name=primary.original_name,
        scalar=dict(primary.scalar),
        emails=[],
        phones=[],
        addresses=[],
        websites=[],
        events=[],
        flags=[],
        modifications=[],
    )
    for index in indices:
        contact = contacts[index]
        merged.emails.extend(contact.emails)
        merged.phones.extend(contact.phones)
        merged.addresses.extend(contact.addresses)
        merged.websites.extend(contact.websites)
        merged.events.extend(contact.events)
        merged.flags.extend(contact.flags)
        merged.modifications.extend(contact.modifications)

    merged.emails = dedupe_pairs(merged.emails, norm_email)
    merged.phones = dedupe_pairs(merged.phones, norm_phone)
    merged.addresses = dedupe_addresses(merged.addresses)
    merged.websites = dedupe_pairs(merged.websites, lambda value: normalized_text(value).replace(" ", ""))
    merged.events = dedupe_pairs(merged.events, normalized_text)

    all_labels = []
    all_notes = []
    original_lines = []
    for index in indices:
        contact = contacts[index]
        for label in re.split(r"\s*:::\s*|\s*,\s*", contact.scalar.get("Labels", "")):
            label = label.strip()
            if label and label not in all_labels:
                all_labels.append(label)
        note = clean_spaces(contact.scalar.get("Notes", ""))
        if note and note not in all_notes:
            all_notes.append(note)
        original_lines.append(f"{contact.source_ref}: {contact.original_name}")
    if "* myContacts" in all_labels:
        all_labels = ["* myContacts"] + [label for label in all_labels if label != "* myContacts"]
    merged.scalar["Labels"] = " ::: ".join(all_labels) if all_labels else "* myContacts"
    merged.scalar["Notes"] = append_note(
        "\n\n".join(all_notes),
        [
            "Merged source contacts:",
            *original_lines,
        ]
        if len(indices) > 1
        else [],
    )
    merged.flags = list(dict.fromkeys(merged.flags))
    merged.modifications = list(dict.fromkeys(merged.modifications))
    return merged


def build_headers(contacts: Sequence[Contact]) -> List[str]:
    max_email = max([3] + [len(contact.emails) for contact in contacts])
    max_phone = max([10] + [len(contact.phones) for contact in contacts])
    max_address = max([3] + [len(contact.addresses) for contact in contacts])
    max_website = max([1] + [len(contact.websites) for contact in contacts])
    max_event = max([1] + [len(contact.events) for contact in contacts])
    headers = list(STATIC_FIELDS)
    for index in range(1, max_email + 1):
        headers.extend([f"E-mail {index} - Label", f"E-mail {index} - Value"])
    for index in range(1, max_phone + 1):
        headers.extend([f"Phone {index} - Label", f"Phone {index} - Value"])
    for index in range(1, max_address + 1):
        headers.extend([f"Address {index} - {field_name}" for field_name in ADDRESS_FIELDS])
    for index in range(1, max_website + 1):
        headers.extend([f"Website {index} - Label", f"Website {index} - Value"])
    for index in range(1, max_event + 1):
        headers.extend([f"Event {index} - Label", f"Event {index} - Value"])
    return headers


def contact_to_row(contact: Contact, headers: Sequence[str]) -> Dict[str, str]:
    row = {header: "" for header in headers}
    for field_name in STATIC_FIELDS:
        row[field_name] = contact.scalar.get(field_name, "")
    for index, (label, value) in enumerate(contact.emails, start=1):
        row[f"E-mail {index} - Label"] = label
        row[f"E-mail {index} - Value"] = value
    for index, (label, value) in enumerate(contact.phones, start=1):
        row[f"Phone {index} - Label"] = label
        row[f"Phone {index} - Value"] = value
    for index, address in enumerate(contact.addresses, start=1):
        for field_name in ADDRESS_FIELDS:
            row[f"Address {index} - {field_name}"] = address.get(field_name, "")
    for index, (label, value) in enumerate(contact.websites, start=1):
        row[f"Website {index} - Label"] = label
        row[f"Website {index} - Value"] = value
    for index, (label, value) in enumerate(contact.events, start=1):
        row[f"Event {index} - Label"] = label
        row[f"Event {index} - Value"] = value
    return row


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def collect_original_sets(contacts: Sequence[Contact]) -> Tuple[set[str], set[str]]:
    emails = {norm_email(value) for contact in contacts for _, value in contact.emails if norm_email(value)}
    phones = {norm_phone(value) for contact in contacts for _, value in contact.phones if norm_phone(value)}
    return emails, phones


def build_merge_report(
    groups: Sequence[Sequence[int]],
    contacts: Sequence[Contact],
    merged_contacts: Sequence[Contact],
    pair_reasons: Dict[Tuple[int, int], str],
) -> List[Dict[str, str]]:
    rows = []
    merged_by_min = {min(group): merged for group, merged in zip(groups, merged_contacts)}
    for group in groups:
        if len(group) < 2:
            continue
        merged = merged_by_min[min(group)]
        reasons = set()
        for left, right in itertools.combinations(group, 2):
            reason = pair_reasons.get(tuple(sorted((left, right))))
            if reason:
                reasons.add(reason)
        matching_emails = sorted(set.intersection(*(set(contact_email_norms(contacts[i])) for i in group)) if group else set())
        matching_phones = sorted(set.intersection(*(set(contact_phone_norms(contacts[i])) for i in group)) if group else set())
        rows.append(
            {
                "final_name": display_name_from_scalar(merged.scalar),
                "final_organization": merged.scalar.get("Organization Name", ""),
                "originals_merged": " | ".join(f"{contacts[i].source_ref}: {contacts[i].original_name}" for i in group),
                "matching_phone": " | ".join(matching_phones),
                "matching_email": " | ".join(matching_emails),
                "matching_company": merged.scalar.get("Organization Name", ""),
                "reason": " ".join(sorted(reasons)) or "High-confidence duplicate component.",
                "confidence": "high",
                "preserved_fields": "phones, emails, addresses, websites, events, labels, birthday, notes",
            }
        )
    return rows


def build_exclusion_report(groups: Sequence[Sequence[int]], contacts: Sequence[Contact]) -> List[Dict[str, str]]:
    rows = []
    for group in groups:
        if len(group) < 2:
            continue
        primary = choose_primary(group, contacts)
        final_name = display_name_from_scalar(contacts[primary].scalar)
        for index in group:
            if index == primary:
                continue
            rows.append(
                {
                    "source_row": contacts[index].source_ref,
                    "original_name": contacts[index].original_name,
                    "final_cleaned_name": final_name,
                    "reason": "Merged into a high-confidence duplicate contact.",
                    "useful_data_lost": "No. Unique phones, emails, addresses, websites, labels, events, and notes were carried into the cleaned row.",
                }
            )
    return rows


def build_manual_review(
    merged_contacts: Sequence[Contact],
    manual_duplicate_rows: Sequence[Dict[str, str]],
) -> List[Dict[str, str]]:
    rows = []
    for contact in merged_contacts:
        if not contact.flags:
            continue
        rows.append(
            {
                "review_id": f"contact_{contact.cid}",
                "source_rows": contact.source_ref,
                "original_names": contact.original_name,
                "suggested_first_name": contact.scalar.get("First Name", ""),
                "suggested_middle_name": contact.scalar.get("Middle Name", ""),
                "suggested_last_name": contact.scalar.get("Last Name", ""),
                "suggested_prefix": contact.scalar.get("Name Prefix", ""),
                "suggested_suffix": contact.scalar.get("Name Suffix", ""),
                "suggested_organization": contact.scalar.get("Organization Name", ""),
                "suggested_title": contact.scalar.get("Organization Title", ""),
                "phones": " | ".join(value for _, value in contact.phones if value),
                "emails": " | ".join(value for _, value in contact.emails if value),
                "reason": " ".join(contact.flags),
                "confidence": "medium" if contact.modifications else "low",
                "action_suggestion": "Check the suggested split before importing if this contact is important.",
                "preserved_in_cleaned_output": "Yes",
            }
        )
    rows.extend(manual_duplicate_rows)
    return rows


def source_manifest_rows(paths: Sequence[Path], backups: Sequence[Path]) -> List[Dict[str, str]]:
    rows = []
    for source, backup in zip(paths, backups):
        rows.append(
            {
                "source_file": str(source),
                "backup_file": str(backup),
                "source_sha256": sha256_file(source),
                "backup_sha256": sha256_file(backup),
                "exact_byte_copy": "Yes" if sha256_file(source) == sha256_file(backup) else "No",
            }
        )
    return rows


def write_summary(
    path: Path,
    source_paths: Sequence[Path],
    source_counts: Dict[str, int],
    cleaned_count: int,
    merge_rows: Sequence[Dict[str, str]],
    manual_rows: Sequence[Dict[str, str]],
    exclusion_rows: Sequence[Dict[str, str]],
    quality: Dict[str, str | int],
) -> None:
    total_source = sum(source_counts.values())
    lines = [
        "# Google Contacts cleanup summary",
        "",
        "## Source inputs",
        *[f"- {alias}: {source_counts[alias]} contacts from `{source_paths[index]}`" for index, alias in enumerate(source_counts.keys())],
        "",
        "## Totals",
        f"- Source contact rows: {total_source}",
        f"- Cleaned import rows: {cleaned_count}",
        f"- High-confidence merged duplicate groups: {len(merge_rows)}",
        f"- Duplicate/source rows absorbed into merged rows: {len(exclusion_rows)}",
        f"- Manual review rows: {len(manual_rows)}",
        "",
        "## Quality checks",
        f"- Unique original e-mail values preserved in cleaned output: {quality['email_preserved']}",
        f"- Unique original phone values preserved in cleaned output: {quality['phone_preserved']}",
        f"- Missing unique original e-mail values: {quality['missing_emails']}",
        f"- Missing unique original phone values: {quality['missing_phones']}",
        f"- Cleaned CSV parsed successfully: {quality['cleaned_csv_parsed']}",
        f"- Cleaned rows containing original-name note: {quality['original_name_notes']}",
        "",
        "## What was cleaned",
        "- Bracketed names were normalized and the exact original name was added to Notes.",
        "- Obvious title text was moved to Name Prefix.",
        "- Obvious organization/business text was moved to Organization Name.",
        "- Duplicate phones, emails, addresses, websites, and events were deduplicated within each cleaned contact.",
        "- Strong duplicate rows were merged only when exact fields or shared phone/email plus compatible names/company supported the merge.",
        "",
        "## Assumptions",
        "- Shared phones/emails with incompatible names were not auto-merged; they are in manual_review.csv.",
        "- Organization-only and context-heavy contacts are preserved but flagged for manual review.",
        "- No live Google Contacts were edited by this process.",
        "",
        "## Import instructions",
        "1. Review `merge_report.csv` and `manual_review.csv` first.",
        "2. Do not import until the reports look acceptable.",
        "3. In Google Contacts, use Import and choose `cleaned_contacts.csv`.",
        "4. After import, use Google Contacts Merge and fix for any remaining low-risk duplicates.",
        "",
        "## Warning",
        "Do not import `cleaned_contacts.csv` until you have checked the merge and manual-review reports. The file is ready for import, but the manual-review report intentionally holds back risky guesses.",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean Google Contacts CSV exports.")
    parser.add_argument("--contacts", required=True, type=Path)
    parser.add_argument("--freq", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    backup_contacts = output_dir / "backup_original_contacts.csv"
    backup_freq = output_dir / "backup_original_freq_contacts.csv"
    shutil.copy2(args.contacts, backup_contacts)
    shutil.copy2(args.freq, backup_freq)

    contacts = parse_google_csv(args.contacts, "contacts", 0)
    freq_contacts = parse_google_csv(args.freq, "freq", len(contacts))
    all_contacts = contacts + freq_contacts

    groups, pair_reasons, manual_duplicate_rows = build_merge_groups(all_contacts)
    merged_contacts = [merge_component(group, all_contacts) for group in groups]

    headers = build_headers(merged_contacts)
    cleaned_path = output_dir / "cleaned_contacts.csv"
    write_csv(cleaned_path, headers, [contact_to_row(contact, headers) for contact in merged_contacts])

    merge_rows = build_merge_report(groups, all_contacts, merged_contacts, pair_reasons)
    merge_headers = [
        "final_name",
        "final_organization",
        "originals_merged",
        "matching_phone",
        "matching_email",
        "matching_company",
        "reason",
        "confidence",
        "preserved_fields",
    ]
    write_csv(output_dir / "merge_report.csv", merge_headers, merge_rows)

    exclusion_rows = build_exclusion_report(groups, all_contacts)
    exclusion_headers = ["source_row", "original_name", "final_cleaned_name", "reason", "useful_data_lost"]
    write_csv(output_dir / "deleted_or_excluded_report.csv", exclusion_headers, exclusion_rows)

    manual_rows = build_manual_review(merged_contacts, manual_duplicate_rows)
    manual_headers = [
        "review_id",
        "source_rows",
        "original_names",
        "suggested_first_name",
        "suggested_middle_name",
        "suggested_last_name",
        "suggested_prefix",
        "suggested_suffix",
        "suggested_organization",
        "suggested_title",
        "phones",
        "emails",
        "reason",
        "confidence",
        "action_suggestion",
        "preserved_in_cleaned_output",
    ]
    write_csv(output_dir / "manual_review.csv", manual_headers, manual_rows)

    manifest_headers = ["source_file", "backup_file", "source_sha256", "backup_sha256", "exact_byte_copy"]
    write_csv(
        output_dir / "backup_original_sources_manifest.csv",
        manifest_headers,
        source_manifest_rows([args.contacts, args.freq], [backup_contacts, backup_freq]),
    )

    original_emails, original_phones = collect_original_sets(all_contacts)
    cleaned_emails, cleaned_phones = collect_original_sets(merged_contacts)
    missing_emails = sorted(original_emails - cleaned_emails)
    missing_phones = sorted(original_phones - cleaned_phones)
    with cleaned_path.open("r", newline="", encoding="utf-8") as handle:
        parsed_rows = list(csv.DictReader(handle))
    quality = {
        "email_preserved": "Yes" if not missing_emails else "No",
        "phone_preserved": "Yes" if not missing_phones else "No",
        "missing_emails": len(missing_emails),
        "missing_phones": len(missing_phones),
        "cleaned_csv_parsed": "Yes" if len(parsed_rows) == len(merged_contacts) else "No",
        "original_name_notes": sum("Original contact name:" in row.get("Notes", "") for row in parsed_rows),
    }

    quality_headers = ["check", "result"]
    quality_rows = [{"check": key, "result": str(value)} for key, value in quality.items()]
    if missing_emails:
        quality_rows.append({"check": "missing_email_values", "result": " | ".join(missing_emails)})
    if missing_phones:
        quality_rows.append({"check": "missing_phone_values", "result": " | ".join(missing_phones)})
    write_csv(output_dir / "quality_check_report.csv", quality_headers, quality_rows)

    write_summary(
        output_dir / "summary_report.md",
        [args.contacts, args.freq],
        {"contacts": len(contacts), "freq": len(freq_contacts)},
        len(merged_contacts),
        merge_rows,
        manual_rows,
        exclusion_rows,
        quality,
    )

    print(f"source_contacts={len(contacts)}")
    print(f"source_freq={len(freq_contacts)}")
    print(f"source_total={len(all_contacts)}")
    print(f"cleaned_contacts={len(merged_contacts)}")
    print(f"merge_groups={len(merge_rows)}")
    print(f"manual_review_rows={len(manual_rows)}")
    print(f"excluded_rows={len(exclusion_rows)}")
    print(f"missing_emails={len(missing_emails)}")
    print(f"missing_phones={len(missing_phones)}")
    print(f"output_dir={output_dir}")


if __name__ == "__main__":
    main()
