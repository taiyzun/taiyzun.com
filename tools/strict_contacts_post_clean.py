#!/usr/bin/env python3
"""Strict post-clean pass for Google Contacts display names.

This script does not merge, delete, or drop contact data. It only refines the
already generated replacement CSV by removing obvious role, location, service,
and organization descriptors from personal name fields, moving that context to
organization/title/notes/manual-review reports.
"""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


CONTACT_FIELDS = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Name Prefix",
    "Name Suffix",
    "Nickname",
    "File As",
    "Organization Name",
    "Organization Title",
    "Organization Department",
    "Notes",
]

PHONE_LABEL_FIELDS = [f"Phone {idx} - Label" for idx in range(1, 11)]
PHONE_VALUE_FIELDS = [f"Phone {idx} - Value" for idx in range(1, 11)]
EMAIL_LABEL_FIELDS = [f"E-mail {idx} - Label" for idx in range(1, 4)]
EMAIL_VALUE_FIELDS = [f"E-mail {idx} - Value" for idx in range(1, 4)]

TITLE_WORDS = {
    "adv": "Adv",
    "advocate": "Advocate",
    "ca": "CA",
    "capt": "Capt",
    "captain": "Captain",
    "dr": "Dr",
    "haji": "Haji",
    "hon": "Hon",
    "maj": "Major",
    "major": "Major",
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

NAME_PREFIX_WORDS = {
    "capt": "Capt",
    "captain": "Captain",
    "dr": "Dr",
    "haji": "Haji",
    "hon": "Hon",
    "maj": "Major",
    "major": "Major",
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

LEADING_PREFIX_PHRASES = [
    ("her excellency smt", "Her Excellency Smt"),
    ("her excellency", "Her Excellency"),
    ("h h shri", "H H Shri"),
    ("h h", "H H"),
]

ROLE_PREFIX_WORDS = {
    "adv": "Advocate",
    "advocate": "Advocate",
    "ca": "CA",
    "doct": "Doctor",
}

ACRONYMS = {
    "AI",
    "BFP",
    "BJP",
    "BSE",
    "CA",
    "CEO",
    "CFO",
    "CMD",
    "COO",
    "CSR",
    "DCP",
    "DCGI",
    "DG",
    "GAIL",
    "IAS",
    "IMC",
    "IPS",
    "IRS",
    "IT",
    "KEM",
    "LIC",
    "LLC",
    "LLP",
    "MD",
    "NGO",
    "ODT",
    "OSD",
    "PA",
    "PR",
    "PS",
    "PVT",
    "TV",
    "UAE",
    "UK",
    "UN",
    "UP",
    "USA",
    "VP",
    "WF",
}

ROLE_PHRASES = {
    "account manager": "Account Manager",
    "assistant": "Assistant",
    "chief": "Chief",
    "chief executive officer": "CEO",
    "commissioner": "Commissioner",
    "consul": "Consul",
    "consultant": "Consultant",
    "creative director": "Creative Director",
    "csr head": "CSR Head",
    "deputy managing director": "Deputy Managing Director",
    "director": "Director",
    "driver": "Driver",
    "editor": "Editor",
    "electrician": "Electrician",
    "executive director": "Executive Director",
    "film director": "Film Director",
    "film directors": "Film Directors",
    "film maker": "Film Maker",
    "film producer": "Film Producer",
    "founder": "Founder",
    "gastroenterologist": "Gastroenterologist",
    "general manager": "General Manager",
    "general secretary": "General Secretary",
    "head": "Head",
    "homeopath": "Homeopath",
    "manager": "Manager",
    "marketing manager": "Marketing Manager",
    "minister": "Minister",
    "min": "Minister",
    "model": "Model",
    "nephrologist": "Nephrologist",
    "ophthalmologist": "Ophthalmologist",
    "orthodontist": "Orthodontist",
    "owner": "Owner",
    "paediatrician": "Paediatrician",
    "photographer": "Photographer",
    "plumber": "Plumber",
    "president": "President",
    "producer": "Producer",
    "product manager": "Product Manager",
    "professor": "Professor",
    "publicist": "Publicist",
    "secretary": "Secretary",
    "senior director": "Senior Director",
    "singer": "Singer",
    "shooter": "Shooter",
    "specialist": "Specialist",
    "trustee": "Trustee",
    "vice chairman": "Vice Chairman",
    "zonal manager": "Zonal Manager",
    "actor": "Actor",
    "actress": "Actress",
    "artist": "Artist",
    "chairman": "Chairman",
    "ceo": "CEO",
    "cfo": "CFO",
    "cmd": "CMD",
    "coo": "COO",
    "csr": "CSR",
    "dcp": "DCP",
    "doctor": "Doctor",
    "eo": "EO",
    "film": "Film",
    "hr": "HR",
    "journalist": "Journalist",
    "md": "MD",
    "organiser": "Organiser",
    "organizer": "Organizer",
    "pa": "PA",
    "ps": "PS",
    "surgeon": "Surgeon",
    "vp": "VP",
    "writer": "Writer",
}

ORG_PHRASES = {
    "a date with me": "A Date With Me",
    "adfactors pr": "Adfactors PR",
    "aditya birla": "Aditya Birla",
    "aditya birla group": "Aditya Birla Group",
    "ajmera group": "Ajmera Group",
    "art gallery": "Art Gallery",
    "artificial intelligence": "Artificial Intelligence",
    "asian paint": "Asian Paint",
    "asian paints": "Asian Paints",
    "atom o sphere": "Atom O Sphere",
    "bank of india": "Bank Of India",
    "birla": "Birla",
    "birla group": "Birla Group",
    "bombay hospital": "Bombay Hospital",
    "bse": "BSE",
    "cancer": "Cancer",
    "cancer foundation": "Cancer Foundation",
    "cm office": "CM Office",
    "crypto relief": "Crypto Relief",
    "dry fruits": "Dry Fruits",
    "dry cleaning": "Dry Cleaning",
    "fleur de lisa salon": "Fleur De Lisa Salon",
    "government of maharashtra": "Government Of Maharashtra",
    "govt of maharashtra": "Govt Of Maharashtra",
    "guru nanak hospital": "Guru Nanak Hospital",
    "harmony foundation": "Harmony Foundation",
    "imc": "IMC",
    "indiabulls": "Indiabulls",
    "indian express": "Indian Express",
    "import export": "Import Export",
    "maker towers": "Maker Towers",
    "mantra events": "Mantra Events",
    "nationalist congress party": "Nationalist Congress Party",
    "pegasus events": "Pegasus Events",
    "real estate": "Real Estate",
    "real estste": "Real Estate",
    "real eatate": "Real Estate",
    "rotary club": "Rotary Club",
    "rustomjee": "Rustomjee",
    "sri sri art of living": "Sri Sri Art Of Living",
    "art of living": "Art Of Living",
    "contemporary art": "Contemporary Art",
    "salon": "Salon",
    "spa": "Spa",
    "symbiosis": "Symbiosis",
    "think tank events": "Think Tank Events",
    "wockhardt foundation": "Wockhardt Foundation",
    "wockhardt hospital": "Wockhardt Hospital",
    "wockhardt hospitals": "Wockhardt Hospitals",
    "wockhardt": "Wockhardt",
    "wock": "Wockhardt",
}

ORG_SINGLE_TOKENS = {
    "agency",
    "airport",
    "bank",
    "boardroom",
    "boutique",
    "clinic",
    "college",
    "company",
    "consultancy",
    "corp",
    "crypto",
    "department",
    "dept",
    "devices",
    "event",
    "events",
    "export",
    "foundation",
    "funds",
    "gallery",
    "group",
    "health",
    "hosp",
    "hospital",
    "hospitals",
    "hotel",
    "import",
    "institute",
    "laboratory",
    "llc",
    "llp",
    "ltd",
    "ministry",
    "ngo",
    "office",
    "party",
    "pharma",
    "pharmacy",
    "polyclinic",
    "projects",
    "production",
    "purchase",
    "pvt",
    "real",
    "restaurant",
    "school",
    "studio",
    "technology",
    "trust",
    "university",
    "univ",
}

LOCATION_PHRASES = {
    "abu dhabi": "Abu Dhabi",
    "bangalore": "Bangalore",
    "bangkok": "Bangkok",
    "bengaluru": "Bengaluru",
    "bkc": "BKC",
    "bombay": "Bombay",
    "boston": "Boston",
    "candolim": "Candolim",
    "chandigarh": "Chandigarh",
    "chennai": "Chennai",
    "delhi": "Delhi",
    "denmark": "Denmark",
    "dimapur": "Dimapur",
    "dubai": "Dubai",
    "europe": "Europe",
    "georgia": "Georgia",
    "goa": "Goa",
    "gurgaon": "Gurgaon",
    "haridwar": "Haridwar",
    "hyderabad": "Hyderabad",
    "india": "India",
    "iran": "Iran",
    "ireland": "Ireland",
    "israel": "Israel",
    "jaipur": "Jaipur",
    "jammu": "Jammu",
    "juhu": "Juhu",
    "kashmir": "Kashmir",
    "kolkatta": "Kolkatta",
    "kolkata": "Kolkata",
    "kota": "Kota",
    "london": "London",
    "maharashtra": "Maharashtra",
    "mumbai": "Mumbai",
    "nagpur": "Nagpur",
    "nagaland": "Nagaland",
    "nalasopara": "Nalasopara",
    "noida": "Noida",
    "pattaya": "Pattaya",
    "pune": "Pune",
    "rajkot": "Rajkot",
    "san diego": "San Diego",
    "sobo": "SoBo",
    "south mumbai": "South Mumbai",
    "tel aviv": "Tel Aviv",
    "uae": "UAE",
    "us": "US",
    "uk": "UK",
    "usa": "USA",
    "vashi": "Vashi",
}

NOTE_PHRASES = {
    "24 hrs": "24 Hrs",
    "added by whatsapp": "Added By WhatsApp",
    "ai": "AI",
    "another": "Another",
    "call": "Call",
    "calling": "Calling",
    "cel": "Cel",
    "celeb": "Celeb",
    "cell": "Cell",
    "co ord": "Coordinator",
    "daughter": "Daughter",
    "email": "Email",
    "ex": "Ex",
    "fb": "FB",
    "friend": "Friend",
    "interviewee": "Interviewee",
    "latest": "Latest",
    "linkedin": "LinkedIn",
    "miss queen of beauty": "Miss Queen Of Beauty",
    "mr kailash satyarthi": "Mr Kailash Satyarthi",
    "ms dhoni": "MS Dhoni",
    "medical tourism": "Medical Tourism",
    "mobile": "Mobile",
    "movies": "Movies",
    "mgr": "Manager",
    "new": "New",
    "no": "No",
    "nobo": "NoBo",
    "odt": "ODT",
    "parent": "Parent",
    "patient": "Patient",
    "padma shri": "Padma Shri",
    "peace chocs": "Peace Chocs",
    "phone": "Phone",
    "ref": "Ref",
    "sameer n": "Sameer N",
    "sikku": "Sikku",
    "son": "Son",
    "sugar testing": "Sugar Testing",
    "suspect": "Suspect",
    "tv": "TV",
    "tv movies": "TV Movies",
    "wf": "WF",
    "whatsapp": "WhatsApp",
    "whats app": "WhatsApp",
    "wife": "Wife",
    "zahid": "Zahid",
}

GENERIC_ONLY = {
    "driver",
    "electrician",
    "home",
    "hotel",
    "office",
    "plumber",
    "shop",
    "test",
    "unknown",
}

ORG_HEAD_TOKENS = {
    "advanced",
    "aesthetic",
    "ajmera",
    "ananda",
    "antarim",
    "bhabha",
    "bombay",
    "indiabulls",
    "rustomjee",
    "wockhardt",
}

ALL_PHRASE_RULES: List[Tuple[str, str, str]] = []
for _mapping, _kind in [
    (ORG_PHRASES, "org"),
    (ROLE_PHRASES, "role"),
    (LOCATION_PHRASES, "location"),
    (NOTE_PHRASES, "note"),
]:
    for _phrase, _label in _mapping.items():
        ALL_PHRASE_RULES.append((_phrase, _kind, _label))
ALL_PHRASE_RULES.sort(key=lambda item: len(item[0].split()), reverse=True)


def read_csv(path: Path) -> Tuple[List[str], List[Dict[str, str]]]:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def clean_spaces(value: str | None) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    text = re.sub(r"[ \u00a0]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def one_line(value: str | None) -> str:
    return re.sub(r"\s+", " ", clean_spaces(value)).strip()


def norm(value: str | None) -> str:
    text = one_line(value).lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9+]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def display_from_row(row: Dict[str, str]) -> str:
    name = one_line(row.get("File As", ""))
    if name:
        return name
    parts = [row.get("Name Prefix", ""), row.get("First Name", ""), row.get("Middle Name", ""), row.get("Last Name", "")]
    name = one_line(" ".join(part for part in parts if part))
    return name or one_line(row.get("Organization Name", ""))


def smart_token(token: str) -> str:
    token = token.strip(" .,-_/()[]{}")
    if not token:
        return ""
    upper = token.upper().replace(".", "")
    if upper in ACRONYMS:
        return upper
    if len(upper) == 1 and upper.isalpha():
        return upper
    lower = token.lower()
    if lower in TITLE_WORDS:
        return TITLE_WORDS[lower]
    if "'" in token:
        return "'".join(smart_token(part) for part in token.split("'"))
    if "-" in token:
        return "-".join(smart_token(part) for part in token.split("-"))
    return lower.capitalize()


def smart_title(value: str | None) -> str:
    text = one_line(value)
    if not text:
        return ""
    text = text.replace("™", "")
    text = re.sub(r"[_]+", " ", text)
    text = re.sub(r"\s*[-:/]+\s*", " - ", text)
    text = re.sub(r"\s+", " ", text).strip(" -")
    return " ".join(filter(None, (smart_token(part) if part != "-" else "-" for part in text.split(" "))))


def split_repeated_halves(text: str) -> str:
    tokens = text.split()
    if len(tokens) >= 4 and len(tokens) % 2 == 0:
        mid = len(tokens) // 2
        if [t.lower() for t in tokens[:mid]] == [t.lower() for t in tokens[mid:]]:
            return " ".join(tokens[:mid])
    return text


def remove_phrase_tokens(tokens: List[str], phrase: str) -> Tuple[List[str], bool]:
    phrase_tokens = phrase.split()
    if not phrase_tokens or len(phrase_tokens) > len(tokens):
        return tokens, False
    lowered = [t.lower() for t in tokens]
    changed = False
    out = tokens[:]
    i = 0
    while i <= len(out) - len(phrase_tokens):
        window = [t.lower() for t in out[i : i + len(phrase_tokens)]]
        if window == phrase_tokens:
            del out[i : i + len(phrase_tokens)]
            changed = True
            continue
        i += 1
    return out, changed


def append_unique(target: List[str], value: str) -> None:
    value = smart_title(value)
    if value and value.lower() not in {item.lower() for item in target}:
        target.append(value)


def merge_phrase(existing: str, additions: Sequence[str]) -> str:
    values = [one_line(existing)] if one_line(existing) else []
    for addition in additions:
        addition = smart_title(addition)
        if addition and addition.lower() not in {v.lower() for v in values}:
            values.append(addition)
    return "; ".join(values)


def merge_prefix(existing: str, additions: Sequence[str]) -> str:
    values = []
    for part in re.split(r"[;,]+", one_line(existing)):
        part = smart_title(part)
        if part and part.lower() not in {value.lower() for value in values}:
            values.append(part)
    for addition in additions:
        addition = smart_title(addition)
        if addition and addition.lower() not in {value.lower() for value in values}:
            values.append(addition)
    return " ".join(values)


def remove_leading_phrase(tokens: List[str], phrase: str) -> Tuple[List[str], bool]:
    phrase_tokens = phrase.split()
    if len(tokens) < len(phrase_tokens):
        return tokens, False
    if [norm(token) for token in tokens[: len(phrase_tokens)]] == phrase_tokens:
        return tokens[len(phrase_tokens) :], True
    return tokens, False


def route_prefixes_and_titles(name: str, moved: Dict[str, List[str]]) -> Tuple[str, List[str]]:
    tokens = [token for token in name.split() if token and token != "-"]
    prefixes: List[str] = []

    changed = True
    while changed and tokens:
        changed = False
        for phrase, label in LEADING_PREFIX_PHRASES:
            tokens, removed = remove_leading_phrase(tokens, phrase)
            if removed:
                append_unique(prefixes, label)
                changed = True
                break
        if changed or not tokens:
            continue
        token_norm = norm(tokens[0])
        if token_norm in NAME_PREFIX_WORDS:
            append_unique(prefixes, NAME_PREFIX_WORDS[token_norm])
            tokens = tokens[1:]
            changed = True
        elif token_norm in ROLE_PREFIX_WORDS:
            append_unique(moved["role"], ROLE_PREFIX_WORDS[token_norm])
            tokens = tokens[1:]
            changed = True

    filtered: List[str] = []
    for token in tokens:
        token_norm = norm(token)
        if token_norm in ROLE_PREFIX_WORDS:
            append_unique(moved["role"], ROLE_PREFIX_WORDS[token_norm])
        elif token_norm in NAME_PREFIX_WORDS:
            append_unique(moved["note"], f"Removed misplaced salutation/title: {NAME_PREFIX_WORDS[token_norm]}")
        else:
            filtered.append(token)

    return smart_title(" ".join(filtered)), prefixes


def clean_existing_prefix(existing: str, moved: Dict[str, List[str]]) -> str:
    tokens = [token for token in one_line(existing).split() if token]
    prefixes: List[str] = []
    while tokens:
        removed_any = False
        for phrase, label in LEADING_PREFIX_PHRASES:
            tokens, removed = remove_leading_phrase(tokens, phrase)
            if removed:
                append_unique(prefixes, label)
                removed_any = True
                break
        if removed_any:
            continue
        token = tokens.pop(0)
        token_norm = norm(token)
        if token_norm in ROLE_PREFIX_WORDS:
            append_unique(moved["role"], ROLE_PREFIX_WORDS[token_norm])
        elif token_norm in NAME_PREFIX_WORDS:
            append_unique(prefixes, NAME_PREFIX_WORDS[token_norm])
        elif token_norm:
            append_unique(moved["note"], f"Removed unclear previous Name Prefix value: {token}")
    return merge_prefix("", prefixes)


def clean_designation(value: str, moved: Dict[str, List[str]]) -> str:
    parts = []
    for part in re.split(r";+", one_line(value)):
        tokens = [token for token in part.split() if token]
        kept = []
        for token in tokens:
            token_norm = norm(token)
            if token_norm in NAME_PREFIX_WORDS:
                append_unique(moved["note"], f"Removed salutation/title from designation: {NAME_PREFIX_WORDS[token_norm]}")
            else:
                kept.append(token)
        cleaned = smart_title(" ".join(kept))
        if cleaned and cleaned.lower() not in {existing.lower() for existing in parts}:
            parts.append(cleaned)
    return "; ".join(parts)


def format_india_number(national: str) -> str:
    if len(national) == 10 and national[0] in "6789":
        return f"+91 {national[:5]} {national[5:]}"
    if len(national) == 10:
        return f"+91 {national[:2]} {national[2:6]} {national[6:]}"
    if len(national) == 11:
        return f"+91 {national[:4]} {national[4:7]} {national[7:]}"
    return f"+91 {national}"


def context_has(context: str, terms: Sequence[str]) -> bool:
    if not context:
        return False
    pattern = r"(?<![A-Za-z])(?:" + "|".join(re.escape(term) for term in sorted(terms, key=len, reverse=True)) + r")(?![A-Za-z])"
    return bool(re.search(pattern, context, flags=re.I))


def phone_context(row: Dict[str, str]) -> str:
    return " ".join(
        one_line(row.get(field, ""))
        for field in ["File As", "Organization Name", "Organization Title", "Organization Department", "Notes"]
    )


def format_country_number(country_code: str, national: str) -> str:
    national = re.sub(r"\D+", "", national)
    if country_code == "1" and len(national) == 10:
        return f"+1 {national[:3]} {national[3:6]} {national[6:]}"
    if country_code == "44":
        if len(national) == 10:
            return f"+44 {national[:4]} {national[4:]}"
        return f"+44 {national}"
    if country_code == "66":
        if len(national) == 8:
            return f"+66 {national[:1]} {national[1:4]} {national[4:]}"
        if len(national) == 9:
            return f"+66 {national[:2]} {national[2:5]} {national[5:]}"
        return f"+66 {national}"
    if country_code == "971":
        if len(national) == 8:
            return f"+971 {national[:1]} {national[1:4]} {national[4:]}"
        if len(national) == 9:
            return f"+971 {national[:2]} {national[2:5]} {national[5:]}"
        return f"+971 {national}"
    if country_code == "65" and len(national) == 8:
        return f"+65 {national[:4]} {national[4:]}"
    if country_code == "230":
        return f"+230 {national}"
    if country_code == "852":
        return f"+852 {national}"
    if country_code == "61":
        return f"+61 {national}"
    if country_code == "33":
        return f"+33 {national}"
    if country_code == "40":
        return f"+40 {national}"
    if country_code == "81":
        return f"+81 {national}"
    if country_code == "248":
        return f"+248 {national}"
    return f"+{country_code}{national}"


def format_known_international_digits(digits: str) -> str:
    if digits.startswith("9191") and len(digits) == 14:
        return format_india_number(digits[4:])
    if digits.startswith("910") and len(digits) in {13, 14}:
        return format_india_number(digits[3:])
    if digits.startswith("91") and len(digits) in {12, 13}:
        return format_india_number(digits[2:])
    if digits.startswith("1") and len(digits) == 11:
        return format_country_number("1", digits[1:])
    if digits.startswith("971") and len(digits) in {11, 12}:
        return format_country_number("971", digits[3:])
    if digits.startswith("44") and len(digits) in {11, 12}:
        return format_country_number("44", digits[2:])
    if digits.startswith("66") and len(digits) in {10, 11}:
        return format_country_number("66", digits[2:])
    if digits.startswith("65") and len(digits) == 10:
        return format_country_number("65", digits[2:])
    if digits.startswith("230") and len(digits) in {10, 11}:
        return format_country_number("230", digits[3:])
    if digits.startswith("852") and len(digits) == 11:
        return format_country_number("852", digits[3:])
    if digits.startswith("61") and len(digits) in {10, 11}:
        return format_country_number("61", digits[2:])
    if digits.startswith("33") and len(digits) in {11, 12}:
        return format_country_number("33", digits[2:])
    if digits.startswith("40") and len(digits) in {10, 11}:
        return format_country_number("40", digits[2:])
    if digits.startswith("81") and len(digits) in {11, 12}:
        return format_country_number("81", digits[2:])
    if digits.startswith("248") and len(digits) == 10:
        return format_country_number("248", digits[3:])
    return "+" + digits


def normalize_phone_number(value: str, context: str = "") -> Tuple[str, bool]:
    original = one_line(value)
    if not original:
        return "", False
    extension = ""
    ext_match = re.search(r"\b(?:ext|extension|x)\s*[:.-]?\s*(\d{1,8})\b", original, flags=re.I)
    number_part = original
    if ext_match:
        extension = f" ext {ext_match.group(1)}"
        number_part = original[: ext_match.start()].strip()

    digits = re.sub(r"\D+", "", number_part)
    if not digits:
        return original, False

    normalized = original
    if original.startswith("+"):
        normalized = format_known_international_digits(digits)
    elif digits.startswith("00") and len(digits) > 4:
        normalized = format_known_international_digits(digits[2:])
    elif context_has(context, ["usa", "new york", "los angeles", "boston", "san diego"]) and len(digits) == 10 and re.search(r"\(\s*\d{3}\s*\)", original):
        normalized = format_country_number("1", digits)
    elif context_has(context, ["london", "uk"]) and digits.startswith("0") and len(digits) in {10, 11}:
        normalized = format_country_number("44", digits[1:])
    elif context_has(context, ["bangkok", "pattaya", "thailand"]) and digits.startswith("0") and len(digits) in {9, 10}:
        normalized = format_country_number("66", digits[1:])
    elif context_has(context, ["bangkok", "pattaya", "thailand"]) and len(digits) in {8, 9}:
        normalized = format_country_number("66", digits)
    elif context_has(context, ["dubai", "uae", "abu dhabi"]) and digits.startswith("0") and len(digits) in {9, 10}:
        normalized = format_country_number("971", digits[1:])
    elif context_has(context, ["singapore"]) and len(digits) == 8 and digits[0] in "89":
        normalized = format_country_number("65", digits)
    elif context_has(context, ["mauritius"]) and len(digits) in {7, 8}:
        normalized = format_country_number("230", digits)
    elif digits.startswith("91") and len(digits) in {12, 13}:
        national = digits[2:]
        normalized = format_india_number(national)
    elif digits.startswith("0") and len(digits) in {11, 12}:
        normalized = format_india_number(digits[1:])
    elif len(digits) == 10 and digits[0] in "6789":
        normalized = format_india_number(digits)
    else:
        normalized = one_line(original)

    if extension and " ext " not in normalized.lower():
        normalized += extension
    return normalized, normalized != original


def india_mobile_number(value: str) -> bool:
    digits = re.sub(r"\D+", "", value)
    return digits.startswith("91") and len(digits) >= 12 and digits[-10:][0] in "6789"


def normalize_phone_label(label: str, value: str) -> str:
    raw = one_line(label)
    lower = raw.lower()
    if "fax" in lower:
        return "Work Fax" if "work" in lower else "Home Fax"
    if "companymainphone" in lower:
        return "Work"
    if "assistantphone" in lower:
        return "Work"
    if "carphone" in lower:
        return "Mobile"
    if "radiophone" in lower:
        return "Other"
    if raw in {"Home", "Work", "Mobile", "Other", "Pager"}:
        if raw == "Home" and india_mobile_number(value):
            return "Mobile"
        return raw
    if not raw:
        return "Mobile" if india_mobile_number(value) else "Work"
    return "Other"


def normalize_email_label(label: str, value: str) -> str:
    raw = one_line(label).lstrip("*").strip()
    if raw in {"Home", "Work", "Other"}:
        return raw
    return "Other" if one_line(value) else raw


def split_phone_value(value: str) -> List[str]:
    raw = one_line(value)
    if not raw:
        return []
    parts = re.split(r"\s*:::\s*|\s*[;,]\s*(?=\+?\d)", raw)
    out: List[str] = []
    for part in parts:
        part = one_line(part)
        if not part:
            continue
        if len(re.sub(r"\D+", "", part)) < 7:
            continue
        # Split slash-separated values only when both sides look phone-like.
        slash_parts = re.split(r"\s*/\s*", part)
        if len(slash_parts) > 1 and all(len(re.sub(r"\D+", "", item)) >= 7 for item in slash_parts):
            out.extend(one_line(item) for item in slash_parts if one_line(item))
        else:
            out.append(part)
    return out


def normalize_contact_methods(row: Dict[str, str]) -> List[str]:
    changes: List[str] = []
    context = phone_context(row)
    phone_entries: List[Tuple[str, str]] = []
    seen_phone_keys: set[str] = set()
    for idx in range(1, 11):
        label_key = f"Phone {idx} - Label"
        value_key = f"Phone {idx} - Value"
        old_value = row.get(value_key, "")
        old_label = row.get(label_key, "")
        for raw_part in split_phone_value(old_value):
            new_value, value_changed = normalize_phone_number(raw_part, context)
            if not new_value:
                continue
            phone_key = canonical_phone_key(new_value)
            if phone_key and phone_key in seen_phone_keys:
                changes.append(f"{value_key}: duplicate removed {new_value}")
                continue
            if phone_key:
                seen_phone_keys.add(phone_key)
            new_label = normalize_phone_label(old_label, new_value)
            phone_entries.append((new_label, new_value))
            if value_changed or one_line(raw_part) != one_line(old_value):
                changes.append(f"{value_key}: {one_line(raw_part)} -> {new_value}")
            if new_label != old_label:
                changes.append(f"{label_key}: {one_line(old_label)} -> {new_label}")

    extra_phone_entries = phone_entries[10:]
    for idx in range(1, 11):
        label_key = f"Phone {idx} - Label"
        value_key = f"Phone {idx} - Value"
        if idx <= len(phone_entries[:10]):
            row[label_key], row[value_key] = phone_entries[idx - 1]
        else:
            row[label_key], row[value_key] = "", ""
    if extra_phone_entries:
        append_note(
            row,
            ["Strict cleanup 2026-06-03 - extra phone values beyond first 10 kept in notes: " + "; ".join(value for _, value in extra_phone_entries)],
        )
        changes.append("Extra phone values moved to Notes")

    for idx in range(1, 4):
        label_key = f"E-mail {idx} - Label"
        value_key = f"E-mail {idx} - Value"
        old_value = row.get(value_key, "")
        old_label = row.get(label_key, "")
        new_value = one_line(old_value).lower()
        new_label = normalize_email_label(old_label, new_value)
        row[value_key] = new_value
        row[label_key] = new_label
        if new_value != old_value:
            changes.append(f"{value_key}: {one_line(old_value)} -> {new_value}")
        if new_label != old_label:
            changes.append(f"{label_key}: {one_line(old_label)} -> {new_label}")
    return changes


def normalize_all_field_spacing(row: Dict[str, str]) -> None:
    for key, value in list(row.items()):
        if key == "Notes":
            row[key] = clean_spaces(value)
        else:
            row[key] = one_line(value)


def append_note(row: Dict[str, str], lines: Sequence[str]) -> None:
    lines = [one_line(line) for line in lines if one_line(line)]
    if not lines:
        return
    existing = clean_spaces(row.get("Notes", ""))
    existing_lines = [line.strip() for line in existing.splitlines() if line.strip()]
    known = {line.lower() for line in existing_lines}
    for line in lines:
        if line.lower() not in known:
            existing_lines.append(line)
            known.add(line.lower())
    row["Notes"] = "\n".join(existing_lines)


def values_for_prefix(row: Dict[str, str], prefix: str) -> List[str]:
    out = []
    pattern = re.compile(rf"^{re.escape(prefix)} (\d+) - Value$")
    for key, value in row.items():
        if pattern.match(key) and one_line(value):
            out.append(one_line(value))
    return out


def extract_context(display: str, row: Dict[str, str]) -> Tuple[str, Dict[str, List[str]]]:
    cleaned = smart_title(split_repeated_halves(display))
    cleaned = re.sub(r"(?<=[A-Za-z])\.(?=[A-Za-z])", " ", cleaned)
    cleaned = re.sub(r"[()\\[\\]{}]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    tokens = [token for token in re.split(r"\s+", cleaned) if token]

    moved: Dict[str, List[str]] = {"org": [], "role": [], "location": [], "note": []}

    # Remove longest known phrases first.
    for phrase, kind, label in ALL_PHRASE_RULES:
        tokens, changed = remove_phrase_tokens(tokens, phrase)
        if changed:
            append_unique(moved[kind], label)

    # Remove exact current organization/title fragments from the visible name,
    # but do not erase a field that was previously misclassified as the whole
    # display name (common in old org-only mistakes).
    for field, kind in [("Organization Name", "org"), ("Organization Title", "role"), ("Organization Department", "note")]:
        value = one_line(row.get(field, ""))
        if len(value.split()) >= 2 and norm(value) != norm(cleaned):
            tokens, changed = remove_phrase_tokens(tokens, norm(value))
            if changed:
                append_unique(moved[kind], value)

    # Remove single-token categories that slipped through.
    filtered = []
    for token in tokens:
        token_norm = norm(token)
        if token_norm in ROLE_PHRASES:
            append_unique(moved["role"], ROLE_PHRASES[token_norm])
        elif token_norm in ORG_SINGLE_TOKENS:
            append_unique(moved["org"], token)
        elif token_norm in LOCATION_PHRASES:
            append_unique(moved["location"], LOCATION_PHRASES[token_norm])
        elif token_norm in NOTE_PHRASES:
            append_unique(moved["note"], NOTE_PHRASES[token_norm])
        else:
            filtered.append(token)

    # Keep a leading "Dr" as an honorific, but remove embedded/trailing title
    # words that were usually referral context in the source names.
    title_filtered = []
    for idx, token in enumerate(filtered):
        token_norm = norm(token)
        if token_norm in ROLE_PREFIX_WORDS:
            append_unique(moved["role"], ROLE_PREFIX_WORDS[token_norm])
        elif token_norm == "dr" and idx != 0:
            append_unique(moved["note"], "Removed misplaced salutation/title: Dr")
        else:
            title_filtered.append(token)
    filtered = title_filtered

    # Common source/referral tails such as "Aditya S", "Ankur C", "Poonam G"
    # should not stay in the visible personal name when there is already a
    # plausible first+last before them.
    if len(filtered) >= 4 and len(filtered[-1].replace(".", "")) == 1 and filtered[-1].isalpha():
        tail = f"{filtered[-2]} {filtered[-1]}"
        if not all(len(word.replace(".", "")) == 1 for word in filtered[-4:-2]):
            append_unique(moved["note"], tail)
            filtered = filtered[:-2]

    name = smart_title(" ".join(filtered))
    name = re.sub(r"\s*&\s*", " ", name)
    name = re.sub(r"\bAnd\b$", "", name).strip(" -")
    name = re.sub(r"\s+", " ", name).strip()
    return name, moved


def split_person_name(name: str) -> Tuple[str, str, str]:
    words = [word for word in name.split() if word and word != "-"]
    if not words:
        return "", "", ""
    # Keep two leading initials together as a first-name value: A K Agarwala.
    if len(words) >= 3 and all(len(word.replace(".", "")) == 1 for word in words[:2]):
        first = " ".join(words[:2])
        rest = words[2:]
        if len(rest) == 1:
            return first, "", rest[0]
        return first, " ".join(rest[:-1]), rest[-1]
    if len(words) == 1:
        return words[0], "", ""
    if len(words) == 2:
        return words[0], "", words[1]
    return words[0], " ".join(words[1:-1]), words[-1]


def has_useful_data(row: Dict[str, str]) -> bool:
    return bool(values_for_prefix(row, "Phone") or values_for_prefix(row, "E-mail") or values_for_prefix(row, "Website"))


def clean_row(row: Dict[str, str], row_number: int) -> Tuple[Dict[str, str], Dict[str, str], Dict[str, str] | None]:
    tracked_fields = CONTACT_FIELDS + PHONE_LABEL_FIELDS + PHONE_VALUE_FIELDS + EMAIL_LABEL_FIELDS + EMAIL_VALUE_FIELDS
    before = {field: row.get(field, "") for field in tracked_fields}
    out = dict(row)
    display = display_from_row(out)
    strict_name, moved = extract_context(display, out)
    strict_name, prefix_additions = route_prefixes_and_titles(strict_name, moved)

    existing_prefix = clean_existing_prefix(out.get("Name Prefix", ""), moved)
    existing_org = one_line(out.get("Organization Name", ""))
    existing_title = clean_designation(one_line(out.get("Organization Title", "")), moved)
    if strict_name and norm(existing_org) == norm(display):
        append_unique(moved["note"], f"Previous organization field matched full display name: {existing_org}")
        existing_org = ""

    new_org = merge_phrase(existing_org, moved["org"])
    new_title = merge_phrase(existing_title, moved["role"])

    if strict_name and len(strict_name.split()) == 1 and moved["org"] and norm(strict_name) in ORG_HEAD_TOKENS:
        new_org = merge_phrase(" ".join([strict_name, *moved["org"]]), [])
        append_unique(moved["note"], "Single-token business head kept with organization phrase")
        strict_name = ""

    # If no person name remains but an organization/service phrase exists, this
    # is safest as an organization-only contact.
    org_only = False
    if not strict_name and (new_org or moved["org"]):
        org_only = True
    if norm(strict_name) in GENERIC_ONLY:
        append_unique(moved["note"], strict_name)
        strict_name = ""
        org_only = bool(new_org)

    if strict_name:
        first, middle, last = split_person_name(strict_name)
        out["First Name"] = first
        out["Middle Name"] = middle
        out["Last Name"] = last
        out["File As"] = strict_name
    elif org_only:
        out["First Name"] = ""
        out["Middle Name"] = ""
        out["Last Name"] = ""
        out["File As"] = new_org
    else:
        out["First Name"] = ""
        out["Middle Name"] = ""
        out["Last Name"] = ""
        if has_useful_data(out) and any(moved[kind] for kind in ["role", "location", "note"]):
            out["File As"] = f"Needs Manual Review {row_number}"
            append_unique(moved["note"], f"Manual review placeholder for original visible name: {display}")
        else:
            # Keep the best available visible identifier, but flag it.
            out["File As"] = smart_title(display)

    out["Name Prefix"] = merge_prefix(existing_prefix, prefix_additions)
    out["Organization Name"] = new_org
    out["Organization Title"] = clean_designation(new_title, moved)
    method_changes = normalize_contact_methods(out)
    normalize_all_field_spacing(out)

    note_lines = []
    if prefix_additions:
        note_lines.append("Strict cleanup 2026-06-03 - moved salutation/title from visible name into Name Prefix: " + "; ".join(prefix_additions))
    if moved["location"]:
        note_lines.append("Strict cleanup 2026-06-03 - moved location/context from visible name: " + "; ".join(moved["location"]))
    if moved["note"]:
        note_lines.append("Strict cleanup 2026-06-03 - moved descriptor from visible name: " + "; ".join(moved["note"]))
    if moved["org"] and existing_org:
        note_lines.append("Strict cleanup 2026-06-03 - name also referenced organization/context: " + "; ".join(moved["org"]))
    if moved["role"] and existing_title:
        note_lines.append("Strict cleanup 2026-06-03 - name also referenced role/title: " + "; ".join(moved["role"]))
    if display != out["File As"]:
        note_lines.append(f"Strict cleanup 2026-06-03 - visible name changed from: {display}")
    if method_changes:
        note_lines.append("Strict cleanup 2026-06-03 - phone/email labels or number formatting normalized.")
    append_note(out, note_lines)
    normalize_all_field_spacing(out)

    flags: List[str] = []
    name_field_text = " ".join(out.get(field, "") for field in ["First Name", "Middle Name", "Last Name", "File As"])
    bad_tokens = remaining_person_name_terms(name_field_text, out)
    if bad_tokens:
        flags.append("Visible person name still contains review terms: " + ", ".join(bad_tokens[:8]))
    if len(out["File As"].split()) > 4 and out.get("First Name"):
        flags.append("Long visible person name after strict cleanup.")
    if not out.get("First Name") and not out.get("Organization Name") and has_useful_data(out):
        flags.append("Useful data but no clear person or organization.")
    if moved["location"] or moved["note"] or moved["org"] or moved["role"]:
        flags.append("Context moved out of visible name; verify important contact.")
    if not out.get("First Name") and out.get("Organization Name"):
        flags.append("Organization-only contact.")

    changed_fields = [field for field in tracked_fields if before.get(field, "") != out.get(field, "")]
    report = {
        "row_number": str(row_number),
        "original_file_as": before.get("File As", ""),
        "new_file_as": out.get("File As", ""),
        "original_first": before.get("First Name", ""),
        "new_first": out.get("First Name", ""),
        "original_middle": before.get("Middle Name", ""),
        "new_middle": out.get("Middle Name", ""),
        "original_last": before.get("Last Name", ""),
        "new_last": out.get("Last Name", ""),
        "original_organization": before.get("Organization Name", ""),
        "new_organization": out.get("Organization Name", ""),
        "original_title": before.get("Organization Title", ""),
        "new_title": out.get("Organization Title", ""),
        "moved_org": "; ".join(moved["org"]),
        "moved_role": "; ".join(moved["role"]),
        "moved_location": "; ".join(moved["location"]),
        "moved_note": "; ".join(moved["note"]),
        "changed_fields": "; ".join(changed_fields),
        "flags": " | ".join(flags),
    }
    manual = None
    if flags and (
        "Useful data but no clear person or organization." in flags
        or "Long visible person name after strict cleanup." in flags
        or any(flag.startswith("Visible person name still contains") for flag in flags)
    ):
        manual = {
            "row_number": str(row_number),
            "original_file_as": before.get("File As", ""),
            "suggested_file_as": out.get("File As", ""),
            "suggested_first": out.get("First Name", ""),
            "suggested_middle": out.get("Middle Name", ""),
            "suggested_last": out.get("Last Name", ""),
            "suggested_organization": out.get("Organization Name", ""),
            "suggested_title": out.get("Organization Title", ""),
            "phones": "; ".join(values_for_prefix(out, "Phone")),
            "emails": "; ".join(values_for_prefix(out, "E-mail")),
            "reason": " | ".join(flags),
            "confidence": "medium" if out.get("First Name") or out.get("Organization Name") else "low",
        }
    return out, report, manual


REMAINING_REVIEW_TERMS = {
    *NAME_PREFIX_WORDS.keys(),
    *ROLE_PREFIX_WORDS.keys(),
    *ROLE_PHRASES.keys(),
    *ORG_SINGLE_TOKENS,
    *LOCATION_PHRASES.keys(),
    *NOTE_PHRASES.keys(),
    "real",
    "estate",
    "dry",
    "fruits",
    "art",
    "gallery",
    "mobile",
    "photographer",
}


def remaining_person_name_terms(text: str, row: Dict[str, str]) -> List[str]:
    # Organization-only contacts are allowed to display organization words.
    if row.get("Organization Name") and not (row.get("First Name") or row.get("Last Name")):
        return []
    tokens = set(norm(text).split())
    bad = sorted(token for token in tokens if token in REMAINING_REVIEW_TERMS)
    return bad


def payload_sets(rows: Sequence[Dict[str, str]], prefix: str) -> set[str]:
    values = set()
    for row in rows:
        context = phone_context(row)
        for value in values_for_prefix(row, prefix):
            if prefix == "Phone":
                for phone_value in split_phone_value(value):
                    normalized_phone, _ = normalize_phone_number(phone_value, context)
                    key = canonical_phone_key(normalized_phone)
                    if key:
                        values.add(key)
            else:
                key = value.lower()
                if key:
                    values.add(key)
        if prefix == "Phone":
            for line in clean_spaces(row.get("Notes", "")).splitlines():
                if "extra phone values beyond first 10 kept in notes:" in line.lower():
                    extra_values = line.split(":", 1)[1] if ":" in line else ""
                    for phone_value in extra_values.split(";"):
                        key = canonical_phone_key(phone_value)
                        if key:
                            values.add(key)
    return values


def canonical_phone_key(value: str) -> str:
    text = one_line(value)
    digits = re.sub(r"\D+", "", text)
    if not digits:
        return ""
    if text.startswith("+"):
        if digits.startswith("9191") and len(digits) == 14:
            return "91" + digits[4:]
        if digits.startswith("910") and len(digits) in {13, 14}:
            return "91" + digits[3:]
        if digits.startswith("91") and len(digits) in {12, 13}:
            return "91" + digits[2:]
        return digits
    if digits.startswith("00") and len(digits) > 4:
        return digits[2:]
    if digits.startswith("0") and len(digits) in {11, 12}:
        return "91" + digits[1:]
    if len(digits) == 10 and digits[0] in "6789":
        return "91" + digits
    return digits


def starts_with_bad_name_token(value: str) -> bool:
    tokens = norm(value).split()
    return bool(tokens and tokens[0] in (set(NAME_PREFIX_WORDS) | set(ROLE_PREFIX_WORDS)))


def contains_bad_name_token(value: str) -> bool:
    tokens = norm(value).split()
    return any(token in (set(NAME_PREFIX_WORDS) | set(ROLE_PREFIX_WORDS)) for token in tokens)


def has_space_issue(row: Dict[str, str]) -> bool:
    for key, value in row.items():
        expected = clean_spaces(value) if key == "Notes" else one_line(value)
        if value != expected:
            return True
    return False


def likely_india_phone_missing_plus91(value: str) -> bool:
    text = one_line(value)
    digits = re.sub(r"\D+", "", text)
    if not digits or text.startswith("+"):
        return False
    return (len(digits) == 10 and digits[0] in "6789") or (digits.startswith("0") and len(digits) in {11, 12})


def allowed_phone_label(label: str) -> bool:
    return one_line(label) in {"", "Home", "Work", "Mobile", "Other", "Home Fax", "Work Fax", "Pager"}


def allowed_email_label(label: str) -> bool:
    return one_line(label) in {"", "Home", "Work", "Other"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Strictly clean visible names in replacement Google Contacts CSV.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    headers, rows = read_csv(args.input)
    out_dir = args.output_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    cleaned_rows: List[Dict[str, str]] = []
    reports: List[Dict[str, str]] = []
    manual: List[Dict[str, str]] = []
    for idx, row in enumerate(rows, start=2):
        cleaned, report, manual_row = clean_row(row, idx)
        cleaned_rows.append(cleaned)
        if report["changed_fields"] or report["flags"]:
            reports.append(report)
        if manual_row:
            manual.append(manual_row)

    output_csv = out_dir / "super_clean_contacts.csv"
    write_csv(output_csv, headers, cleaned_rows)

    report_headers = [
        "row_number",
        "original_file_as",
        "new_file_as",
        "original_first",
        "new_first",
        "original_middle",
        "new_middle",
        "original_last",
        "new_last",
        "original_organization",
        "new_organization",
        "original_title",
        "new_title",
        "moved_org",
        "moved_role",
        "moved_location",
        "moved_note",
        "changed_fields",
        "flags",
    ]
    write_csv(out_dir / "super_clean_name_change_report.csv", report_headers, reports)

    manual_headers = [
        "row_number",
        "original_file_as",
        "suggested_file_as",
        "suggested_first",
        "suggested_middle",
        "suggested_last",
        "suggested_organization",
        "suggested_title",
        "phones",
        "emails",
        "reason",
        "confidence",
    ]
    write_csv(out_dir / "super_clean_manual_review.csv", manual_headers, manual)

    original_phones = payload_sets(rows, "Phone")
    cleaned_phones = payload_sets(cleaned_rows, "Phone")
    original_emails = payload_sets(rows, "E-mail")
    cleaned_emails = payload_sets(cleaned_rows, "E-mail")
    remaining_bad = []
    for idx, row in enumerate(cleaned_rows, start=2):
        terms = remaining_person_name_terms(display_from_row(row), row)
        if terms:
            remaining_bad.append((idx, row.get("File As", ""), ", ".join(terms)))

    bad_first_name = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if starts_with_bad_name_token(row.get("First Name", ""))
    ]
    bad_person_name_fields = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if any(contains_bad_name_token(row.get(field, "")) for field in ["First Name", "Middle Name", "Last Name", "File As"])
    ]
    bad_designation_salutations = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if any(token in set(NAME_PREFIX_WORDS) for token in norm(row.get("Organization Title", "")).split())
    ]
    bad_prefix_role_rows = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if any(token in set(ROLE_PREFIX_WORDS) for token in norm(row.get("Name Prefix", "")).split())
    ]
    spacing_issues = [idx for idx, row in enumerate(cleaned_rows, start=2) if has_space_issue(row)]
    weird_phone_labels = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if any(not allowed_phone_label(row.get(field, "")) for field in PHONE_LABEL_FIELDS)
    ]
    weird_email_labels = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if any(not allowed_email_label(row.get(field, "")) for field in EMAIL_LABEL_FIELDS)
    ]
    likely_india_without_plus91 = [
        idx
        for idx, row in enumerate(cleaned_rows, start=2)
        if any(likely_india_phone_missing_plus91(row.get(field, "")) for field in PHONE_VALUE_FIELDS)
    ]
    phone_value_changes = sum(
        1
        for before_row, after_row in zip(rows, cleaned_rows)
        for field in PHONE_VALUE_FIELDS
        if one_line(before_row.get(field, "")) != one_line(after_row.get(field, ""))
    )
    phone_label_changes = sum(
        1
        for before_row, after_row in zip(rows, cleaned_rows)
        for field in PHONE_LABEL_FIELDS
        if one_line(before_row.get(field, "")) != one_line(after_row.get(field, ""))
    )
    email_label_changes = sum(
        1
        for before_row, after_row in zip(rows, cleaned_rows)
        for field in EMAIL_LABEL_FIELDS
        if one_line(before_row.get(field, "")) != one_line(after_row.get(field, ""))
    )
    extra_phone_values_in_notes = sum(
        line.lower().count("extra phone values beyond first 10 kept in notes:")
        for row in cleaned_rows
        for line in clean_spaces(row.get("Notes", "")).splitlines()
    )

    validation_rows = [
        {"check": "input_rows", "result": str(len(rows))},
        {"check": "output_rows", "result": str(len(cleaned_rows))},
        {"check": "rows_with_name_changes_or_flags", "result": str(len(reports))},
        {"check": "manual_review_rows", "result": str(len(manual))},
        {"check": "phone_values_preserved", "result": "Yes" if original_phones == cleaned_phones else "No"},
        {"check": "missing_phone_values", "result": str(len(original_phones - cleaned_phones))},
        {"check": "email_values_preserved", "result": "Yes" if original_emails == cleaned_emails else "No"},
        {"check": "missing_email_values", "result": str(len(original_emails - cleaned_emails))},
        {"check": "remaining_person_name_review_terms", "result": str(len(remaining_bad))},
        {"check": "bad_first_name_salutation_or_title_rows", "result": str(len(bad_first_name))},
        {"check": "bad_person_name_salutation_or_title_rows", "result": str(len(bad_person_name_fields))},
        {"check": "bad_designation_salutation_rows", "result": str(len(bad_designation_salutations))},
        {"check": "bad_prefix_role_rows", "result": str(len(bad_prefix_role_rows))},
        {"check": "spacing_issue_rows", "result": str(len(spacing_issues))},
        {"check": "weird_phone_label_rows", "result": str(len(weird_phone_labels))},
        {"check": "weird_email_label_rows", "result": str(len(weird_email_labels))},
        {"check": "likely_india_phone_without_plus91_rows", "result": str(len(likely_india_without_plus91))},
        {"check": "phone_value_changes", "result": str(phone_value_changes)},
        {"check": "phone_label_changes", "result": str(phone_label_changes)},
        {"check": "email_label_changes", "result": str(email_label_changes)},
        {"check": "extra_phone_values_in_notes", "result": str(extra_phone_values_in_notes)},
        {"check": "organization_only_contacts", "result": str(sum(1 for row in cleaned_rows if row.get("Organization Name") and not (row.get("First Name") or row.get("Last Name"))))},
    ]
    write_csv(out_dir / "super_clean_validation_report.csv", ["check", "result"], validation_rows)

    top_terms = Counter()
    for _, _, terms in remaining_bad:
        for term in terms.split(", "):
            if term:
                top_terms[term] += 1

    preview_lines = [
        "# Super Clean Contact Preview",
        "",
        f"- Source rows: {len(rows)}",
        f"- Output rows: {len(cleaned_rows)}",
        f"- Rows with name changes or flags: {len(reports)}",
        f"- Manual review rows: {len(manual)}",
        f"- Phone values preserved: {'Yes' if original_phones == cleaned_phones else 'No'}",
        f"- Email values preserved: {'Yes' if original_emails == cleaned_emails else 'No'}",
        f"- Remaining person-name review-term rows: {len(remaining_bad)}",
        f"- Bad first-name salutation/title rows: {len(bad_first_name)}",
        f"- Bad personal-name salutation/title rows: {len(bad_person_name_fields)}",
        f"- Bad designation salutation rows: {len(bad_designation_salutations)}",
        f"- Bad prefix role rows: {len(bad_prefix_role_rows)}",
        f"- Spacing issue rows: {len(spacing_issues)}",
        f"- Weird phone-label rows: {len(weird_phone_labels)}",
        f"- Weird email-label rows: {len(weird_email_labels)}",
        f"- Likely India phone rows still missing +91: {len(likely_india_without_plus91)}",
        f"- Phone value normalizations: {phone_value_changes}",
        f"- Phone label normalizations: {phone_label_changes}",
        f"- Email label normalizations: {email_label_changes}",
        f"- Extra phone values kept in notes due to Google 10-phone-slot limit: {extra_phone_values_in_notes}",
        "",
        "## Sample Name Changes",
        "",
        "| Original | New visible name | Organization | Title | Moved | Flags |",
        "|---|---|---|---|---|---|",
    ]
    for report in reports[:120]:
        moved = "; ".join(
            item
            for item in [
                report["moved_org"],
                report["moved_role"],
                report["moved_location"],
                report["moved_note"],
            ]
            if item
        )
        preview_lines.append(
            "| "
            + " | ".join(
                cell.replace("|", "/")[:120]
                for cell in [
                    report["original_file_as"],
                    report["new_file_as"],
                    report["new_organization"],
                    report["new_title"],
                    moved,
                    report["flags"],
                ]
            )
            + " |"
        )
    preview_lines += [
        "",
        "## Top Remaining Review Terms",
        "",
        *(f"- {term}: {count}" for term, count in top_terms.most_common(30)),
    ]
    (out_dir / "super_clean_preview.md").write_text("\n".join(preview_lines) + "\n", encoding="utf-8")

    print(f"output={output_csv}")
    for row in validation_rows:
        print(f"{row['check']}={row['result']}")


if __name__ == "__main__":
    main()
