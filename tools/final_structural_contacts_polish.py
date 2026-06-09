#!/usr/bin/env python3
"""Final conservative structural polish before live Google Contacts import."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

from strict_contacts_post_clean import clean_spaces, one_line, smart_title


FINAL_LABEL = "Cleaned Final 2026-06-03 ::: * myContacts"

PHONE_FIELDS = [(f"Phone {idx} - Label", f"Phone {idx} - Value") for idx in range(1, 11)]
EMAIL_FIELDS = [(f"E-mail {idx} - Label", f"E-mail {idx} - Value") for idx in range(1, 4)]
PERSON_FIELDS = ["First Name", "Middle Name", "Last Name"]

VALID_EMAIL_RE = re.compile(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+")

EMAIL_CORRECTIONS = {
    "aavi.domestic@gmail": "aavi.domestic@gmail.com",
    "rajbhavankohima@nic.n": "rajbhavankohima@nic.in",
}

PHONE_REPLACEMENTS = {
    ("586", "44 2829 6749"): "+91 44 2829 6749",
    ("1439", "0 44 2359 600"): "+91 44 2359 600",
    ("1439", "0 44 2327 373"): "+91 44 2327 373",
    ("1459", "02776-79611"): "+39 02 7767 9611",
    ("2114", "0206184069"): "+31 20 618 4069",
    ("2479", "02690-96901"): "+39 02 6909 6901",
    ("2481", "33-19606335"): "+39 331 960 6335",
    ("2482", "022-9407271"): "+39 02 2940 7271",
    ("2515", "02834-13263"): "+39 02 8341 3263",
    ("2584", "2123900733"): "+1 212 390 0733",
    ("4112", "087-472-3212"): "+66 87 472 3212",
    ("7381", "1860 180 12 90"): "+91 1860 180 1290",
    ("8301", "02890-93816"): "+39 02 8909 3816",
    ("8683", "413 291 2182"): "+1 413 291 2182",
    ("8703", "0144213181"): "+33 1 44 21 31 81",
    ("8804", "44 2480 7181"): "+91 44 2480 7181",
}

PHONE_MOVE_TO_NOTES = {
    ("3710", "0208888892258"): "overlong Pune/Symbiosis fax-like value",
    ("4046", "875 - 2742"): "short internal extension-like value",
    ("4954", "93201453522"): "overlong Indian mobile-like value",
    ("5077", "022 6676 724"): "incomplete Mumbai landline",
    ("5077", "022 6681 234"): "incomplete Mumbai landline",
    ("5550", "20090054209"): "unknown country and format",
    ("6250", "0224040500"): "incomplete Mumbai landline",
    ("7533", "022 6678 151"): "incomplete Mumbai landline",
    ("9068", "022 2604 401"): "incomplete Mumbai landline",
}

ORG_TOKENS = {
    "bjp",
    "gail",
    "reliance",
    "ril",
    "wockhardt",
    "unichem",
    "laboratories",
    "limited",
    "consulate",
    "embassy",
    "foundation",
}

ROLE_SUFFIXES = {
    ("architect",): "Architect",
    ("artist",): "Artist",
    ("actor",): "Actor",
    ("actress",): "Actress",
    ("advocate",): "Advocate",
    ("cardiologist",): "Cardiologist",
    ("doctor",): "Doctor",
    ("dentist",): "Dentist",
    ("designer",): "Designer",
    ("fashion",): "Fashion",
    ("flight",): "Flight",
    ("gastroenterologist",): "Gastroenterologist",
    ("gynaecologist",): "Gynaecologist",
    ("gynecologist",): "Gynaecologist",
    ("photographer",): "Photographer",
    ("photography",): "Photography",
    ("surgeon",): "Surgeon",
    ("graphic", "designer"): "Graphic Designer",
    ("interior", "designer"): "Interior Designer",
    ("fashion", "designer"): "Fashion Designer",
    ("minister",): "Minister",
    ("director",): "Director",
    ("president",): "President",
    ("chairman",): "Chairman",
    ("ceo",): "CEO",
    ("travel", "agent"): "Travel Agent",
}

ORG_ONLY_ROWS = {
    "314": "Ajmera Group Real Estate",
    "6532": "Indiabulls Real Estate",
    "1631": "Citibank Credit Card",
    "2963": "Governor's Secretariat",
    "4118": "Lifenity Airport",
    "7381": "SBI Credit Card Customer Care",
}

ROW_STRUCTURAL_FIXES = {
    "523": {"name": ["Amit", "Saini"], "title": "Dentist", "org": "Punjab"},
    "870": {"name": ["Aradhana", "Nitin", "Bhai"], "org": "Arma's Designer Wear"},
    "1502": {"name": ["Ajay", "Pandey"], "title": "Cardiologist", "replace_org": ""},
    "3293": {"name": ["Imran"], "title": "Travel Agent", "org": "Mauritius"},
    "4446": {"name": ["Manju", "Reddy"], "org": "BRICS Fashion Show"},
    "4688": {"name": ["Minisha", "Mendonza"], "title": "Fashion Designer", "org": "Hiren"},
    "5222": {"name": ["Neha", "Bhatnagar"], "title": "Flight", "org": "Impact Investors"},
    "5688": {"name": ["Pillai"], "title": "Flight", "org": "Go Air"},
    "6162": {"name": ["Rahul", "Singh"], "title": "Flight", "org": "PWC"},
    "6531": {"name": ["Razzak", "Shaikh", "Naveed"], "title": "Designer"},
    "6646": {"name": ["Rina"], "title": "Designer", "org": "Trisys"},
    "6692": {"name": ["Ritu", "Bhattacharya"], "title": "Flight", "org": "Financial Investment"},
    "7070": {"name": ["Samira", "Ali"], "title": "Dentist", "replace_org": "Saifee Hospital"},
    "7101": {"name": ["Sandeep", "Gandhi"], "title": "Flight", "org": "Bharat Furnishings"},
    "7709": {"name": ["Shreyash", "Parekh"], "title": "Student; Flight", "org": "Varanasi"},
    "8513": {"name": ["Tejinder"], "org": "Embassy"},
    "8702": {"name": ["Valencia", "D", "Souza"], "title": "Flight"},
    "9129": {"name": ["Yogita"], "org": "Consulate"},
}

ACRONYM_REPLACEMENTS = {
    "Bjp": "BJP",
    "Tn": "TN",
    "Sbi": "SBI",
    "Ril": "RIL",
    "Csr": "CSR",
    "Bkc": "BKC",
    "Rsvp": "RSVP",
    "Mla": "MLA",
    "Vp": "VP",
    "Ps": "PS",
    "Gm": "GM",
    "Ifc": "IFC",
    "Pmo": "PMO",
}


def read_csv(path: Path) -> tuple[List[str], List[Dict[str, str]]]:
    with path.open("r", newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        return list(reader.fieldnames or []), list(reader)


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def append_note(row: Dict[str, str], line: str) -> None:
    line = one_line(line)
    if not line:
        return
    existing = [part for part in clean_spaces(row.get("Notes", "")).splitlines() if part.strip()]
    if line.lower() not in {part.lower() for part in existing}:
        existing.append(line)
    row["Notes"] = "\n".join(existing)


def split_semicolon(value: str) -> List[str]:
    parts = [smart_title(one_line(part).strip(" ;,()")) for part in value.split(";")]
    return [part for part in parts if part and part.lower() != "null"]


def clean_phrase_list(value: str) -> str:
    parts = split_semicolon(value)
    deduped: List[str] = []
    for part in parts:
        key = part.lower()
        if key not in {item.lower() for item in deduped}:
            deduped.append(part)
    filtered: List[str] = []
    for part in deduped:
        low = part.lower()
        if any(low != other.lower() and low in other.lower().split(";")[0] and len(low) < len(other.lower()) for other in deduped):
            continue
        filtered.append(part)
    return "; ".join(filtered)


def merge_list_value(current: str, addition: str) -> str:
    values = split_semicolon(current)
    add = smart_title(addition)
    if add and add.lower() not in {value.lower() for value in values}:
        values.append(add)
    return clean_phrase_list("; ".join(values))


def fix_acronyms(value: str) -> str:
    value = one_line(value)
    if not value:
        return ""
    for old, new in ACRONYM_REPLACEMENTS.items():
        value = re.sub(rf"\b{re.escape(old)}\b", new, value)
    value = re.sub(r"\b([A-Za-z]+)'S\b", lambda m: m.group(1) + "'s", value)
    return value


def normalize_all_spacing(row: Dict[str, str]) -> None:
    for key, value in list(row.items()):
        if key == "Notes":
            lines = [line.strip() for line in clean_spaces(value).splitlines()]
            row[key] = "\n".join(line for line in lines if line)
        else:
            row[key] = one_line(value)


def compact_phone_slots(row: Dict[str, str]) -> None:
    values: List[Tuple[str, str]] = []
    seen: set[str] = set()
    for label_key, value_key in PHONE_FIELDS:
        label = one_line(row.get(label_key, "")) or "Mobile"
        value = one_line(row.get(value_key, ""))
        if not value:
            continue
        key = re.sub(r"\D", "", value)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        values.append((label, value))
    for idx, (label_key, value_key) in enumerate(PHONE_FIELDS):
        if idx < len(values):
            row[label_key], row[value_key] = values[idx]
        else:
            row[label_key], row[value_key] = "", ""


def add_phone(row: Dict[str, str], value: str, label: str = "Mobile") -> bool:
    value = one_line(value)
    if not value:
        return False
    existing = {re.sub(r"\D", "", row.get(value_key, "")) for _, value_key in PHONE_FIELDS if row.get(value_key, "")}
    key = re.sub(r"\D", "", value)
    if key in existing:
        return True
    for label_key, value_key in PHONE_FIELDS:
        if not row.get(value_key, ""):
            row[label_key] = label
            row[value_key] = value
            compact_phone_slots(row)
            return True
    return False


def normalize_phone_from_email(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if value.startswith("+91") and len(digits) == 12:
        return f"+91 {digits[2:7]} {digits[7:]}"
    if digits == "02222842463":
        return "+91 22 2284 2463"
    return ""


def email_parts(value: str) -> List[str]:
    raw = one_line(value).lower()
    return [one_line(part).lower() for part in re.split(r"\s*:::\s*", raw) if one_line(part)]


def clean_email_and_phone_slots(row: Dict[str, str], row_number: str) -> List[str]:
    actions: List[str] = []
    email_values: List[str] = []
    note_values: List[str] = []
    for _, value_key in EMAIL_FIELDS:
        for part in email_parts(row.get(value_key, "")):
            corrected = EMAIL_CORRECTIONS.get(part, part)
            if VALID_EMAIL_RE.fullmatch(corrected):
                if corrected not in email_values:
                    email_values.append(corrected)
                    if corrected != part:
                        actions.append(f"corrected email {part} -> {corrected}")
                continue
            phone_value = normalize_phone_from_email(part)
            if phone_value and add_phone(row, phone_value):
                actions.append(f"moved phone-like email value to phone: {part} -> {phone_value}")
            elif part:
                note_values.append(part)

    for idx, (label_key, value_key) in enumerate(EMAIL_FIELDS):
        if idx < len(email_values[:3]):
            row[label_key] = "Other"
            row[value_key] = email_values[idx]
        else:
            row[label_key], row[value_key] = "", ""
    if len(email_values) > 3:
        append_note(row, "Final structural polish 2026-06-03 - extra email values beyond first 3 kept in notes: " + "; ".join(email_values[3:]))
        actions.append("extra email values moved to notes")
    if note_values:
        append_note(row, "Final structural polish 2026-06-03 - moved non-email text out of email field: " + "; ".join(note_values))
        actions.append("non-email text moved to notes")

    for label_key, value_key in PHONE_FIELDS:
        value = one_line(row.get(value_key, ""))
        if not value:
            continue
        key = (row_number, value)
        if key in PHONE_REPLACEMENTS:
            row[value_key] = PHONE_REPLACEMENTS[key]
            append_note(row, f"Final structural polish 2026-06-03 - normalized phone {value} to {row[value_key]}.")
            actions.append(f"phone {value} -> {row[value_key]}")
        elif key in PHONE_MOVE_TO_NOTES:
            append_note(row, f"Final structural polish 2026-06-03 - moved unverified phone value to notes: {value} ({PHONE_MOVE_TO_NOTES[key]}).")
            row[label_key], row[value_key] = "", ""
            actions.append(f"unverified phone moved to notes: {value}")
    compact_phone_slots(row)
    return actions


def set_person_name(row: Dict[str, str], tokens: Sequence[str]) -> None:
    tokens = [smart_title(token) for token in tokens if token]
    row["First Name"] = tokens[0] if tokens else ""
    row["Middle Name"] = " ".join(tokens[1:-1]) if len(tokens) > 2 else ""
    row["Last Name"] = tokens[-1] if len(tokens) > 1 else ""
    row["File As"] = " ".join(tokens) if tokens else smart_title(row.get("Organization Name", ""))


def visible_tokens(row: Dict[str, str]) -> List[str]:
    visible = " ".join(one_line(row.get(field, "")) for field in PERSON_FIELDS)
    return [token for token in re.split(r"\s+", visible.strip()) if token]


def polish_names(row: Dict[str, str], row_number: str) -> List[str]:
    actions: List[str] = []
    for field in ["Organization Name", "Organization Title", "Organization Department"]:
        cleaned = clean_phrase_list(row.get(field, ""))
        if cleaned != row.get(field, ""):
            row[field] = cleaned
            actions.append(f"cleaned {field}")

    if row.get("Organization Name", "").lower() == "null":
        row["Organization Name"] = ""
        actions.append("removed Null organization")

    if row_number in ORG_ONLY_ROWS:
        org = ORG_ONLY_ROWS[row_number]
        old_name = row.get("File As", "")
        row["Organization Name"] = merge_list_value(row.get("Organization Name", ""), org)
        for field in PERSON_FIELDS:
            row[field] = ""
        row["File As"] = org
        append_note(row, f"Final structural polish 2026-06-03 - reclassified visible generic name as organization: {old_name}.")
        actions.append("reclassified organization-only contact")
        return actions

    if row_number in ROW_STRUCTURAL_FIXES:
        fix = ROW_STRUCTURAL_FIXES[row_number]
        set_person_name(row, fix.get("name", []))
        if "replace_org" in fix:
            row["Organization Name"] = fix["replace_org"]
        if fix.get("org"):
            row["Organization Name"] = merge_list_value(row.get("Organization Name", ""), fix["org"])
        if fix.get("title"):
            row["Organization Title"] = merge_list_value(row.get("Organization Title", ""), fix["title"])
        append_note(row, "Final structural polish 2026-06-03 - moved clear role/organization words from visible name into structured fields.")
        actions.append("applied row-specific structural fix")
        return actions

    tokens = visible_tokens(row)
    if not tokens:
        row["File As"] = smart_title(row.get("Organization Name", ""))
        return actions

    lowered = [token.lower().strip(".,;:()") for token in tokens]

    if lowered and lowered[0] in {"dr", "mr", "mrs", "ms", "miss", "prof"}:
        prefix = smart_title(tokens[0])
        row["Name Prefix"] = merge_list_value(row.get("Name Prefix", ""), prefix)
        tokens = tokens[1:]
        lowered = lowered[1:]
        append_note(row, f"Final structural polish 2026-06-03 - moved leading salutation/title to Name Prefix: {prefix}.")
        actions.append("moved leading title to Name Prefix")

    if lowered and lowered[0] == "governor" and len(tokens) >= 3:
        row["Organization Title"] = merge_list_value(row.get("Organization Title", ""), "Governor")
        tokens = tokens[1:]
        lowered = lowered[1:]
        actions.append("moved Governor from name to title")

    if lowered[:4] == ["bjp", "tn", "state", "pres"] and len(tokens) >= 6:
        row["Organization Name"] = merge_list_value(row.get("Organization Name", ""), "BJP TN")
        row["Organization Title"] = merge_list_value(row.get("Organization Title", ""), "State President")
        tokens = tokens[4:]
        lowered = lowered[4:]
        actions.append("moved BJP TN State President context out of name")

    split_at = None
    for idx, token in enumerate(lowered):
        if token in ORG_TOKENS and idx >= 2:
            split_at = idx
            break
    if split_at is not None:
        org_text = " ".join(tokens[split_at:]).replace(" From ", " ")
        row["Organization Name"] = merge_list_value(row.get("Organization Name", ""), org_text)
        tokens = tokens[:split_at]
        lowered = lowered[:split_at]
        actions.append("moved organization/context suffix out of name")

    for suffix_tokens, title in sorted(ROLE_SUFFIXES.items(), key=lambda item: len(item[0]), reverse=True):
        if len(lowered) > len(suffix_tokens) and tuple(lowered[-len(suffix_tokens):]) == suffix_tokens:
            row["Organization Title"] = merge_list_value(row.get("Organization Title", ""), title)
            tokens = tokens[: -len(suffix_tokens)]
            lowered = lowered[: -len(suffix_tokens)]
            actions.append(f"moved role suffix to title: {title}")
            break

    if lowered and lowered[0] in {item[0] for item in ROLE_SUFFIXES if len(item) == 1} and len(tokens) >= 2:
        title = ROLE_SUFFIXES[(lowered[0],)]
        row["Organization Title"] = merge_list_value(row.get("Organization Title", ""), title)
        tokens = tokens[1:]
        actions.append(f"moved leading role to title: {title}")

    if actions:
        set_person_name(row, tokens)
        append_note(row, "Final structural polish 2026-06-03 - cleaned visible name fields and moved clear organization/title words to structured fields.")
    return actions


def main() -> None:
    parser = argparse.ArgumentParser(description="Final structural polish for cleaned Google Contacts CSV.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    headers, rows = read_csv(args.input)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    change_rows: List[Dict[str, str]] = []
    for idx, row in enumerate(rows, start=2):
        row_number = str(idx)
        before = {key: row.get(key, "") for key in ["File As", *PERSON_FIELDS, "Name Prefix", "Organization Name", "Organization Title", "Organization Department"]}
        actions = []
        actions.extend(clean_email_and_phone_slots(row, row_number))
        actions.extend(polish_names(row, row_number))
        row["Labels"] = FINAL_LABEL
        normalize_all_spacing(row)
        for field in ["File As", *PERSON_FIELDS, "Organization Name", "Organization Title", "Organization Department"]:
            row[field] = fix_acronyms(row.get(field, ""))
        after = {key: row.get(key, "") for key in before}
        if actions or before != after:
            change_rows.append(
                {
                    "row_number": row_number,
                    "before_file_as": before["File As"],
                    "after_file_as": after["File As"],
                    "before_person": " | ".join(before[field] for field in PERSON_FIELDS),
                    "after_person": " | ".join(after[field] for field in PERSON_FIELDS),
                    "before_org": before["Organization Name"],
                    "after_org": after["Organization Name"],
                    "before_title": before["Organization Title"],
                    "after_title": after["Organization Title"],
                    "actions": "; ".join(actions),
                }
            )

    output = args.output_dir / "final_structural_clean_contacts.csv"
    changes = args.output_dir / "final_structural_polish_changes.csv"
    write_csv(output, headers, rows)
    write_csv(
        changes,
        [
            "row_number",
            "before_file_as",
            "after_file_as",
            "before_person",
            "after_person",
            "before_org",
            "after_org",
            "before_title",
            "after_title",
            "actions",
        ],
        change_rows,
    )
    print(f"wrote {output}")
    print(f"wrote {changes}")
    print(f"rows={len(rows)}")
    print(f"changed_rows={len(change_rows)}")


if __name__ == "__main__":
    main()
