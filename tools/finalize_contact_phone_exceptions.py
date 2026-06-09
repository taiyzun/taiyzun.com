#!/usr/bin/env python3
"""Finalize the remaining phone-country exceptions in the safe contact CSV.

The rule here is conservative: only normalize a value when the dialable number
is clear. Otherwise remove it from the phone slot and preserve the original
value in Notes so Google Contacts no longer contains malformed telephone fields.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from strict_contacts_post_clean import clean_spaces, one_line, values_for_prefix


PHONE_LABEL_FIELDS = [f"Phone {idx} - Label" for idx in range(1, 11)]
PHONE_VALUE_FIELDS = [f"Phone {idx} - Value" for idx in range(1, 11)]
NAME_FIELDS = [
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
]


REPLACE_VALUES = {
    ("7381", "1860 180 12 90"): (
        "+91 1860 180 1290",
        "Official SBI Card helpline; normalized with India country code.",
    ),
}


MOVE_TO_NOTES = {
    ("3710", "0208888892258"): "Unclear overlong Pune/Symbiosis fax-like value.",
    ("4046", "875 - 2742"): "Internal extension or short office number, not directly dialable.",
    ("4954", "93201453522"): "Overlong Indian mobile-like value; one extra digit, not safe to trim blindly.",
    ("5077", "022 6676 724"): "Incomplete Mumbai landline; subscriber number appears short.",
    ("5077", "022 6681 234"): "Incomplete Mumbai landline; subscriber number appears short.",
    ("5550", "20090054209"): "Unknown country/format; not safe to infer.",
    ("6250", "0224040500"): "Incomplete Mumbai landline; subscriber number appears short.",
    ("7533", "022 6678 151"): "Incomplete Mumbai landline; subscriber number appears short.",
    ("9068", "022 2604 401"): "Incomplete Mumbai landline; subscriber number appears short.",
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
    notes = [existing for existing in clean_spaces(row.get("Notes", "")).splitlines() if existing.strip()]
    if line.lower() not in {existing.lower() for existing in notes}:
        notes.append(line)
    row["Notes"] = "\n".join(notes)


def compact_phone_slots(row: Dict[str, str]) -> None:
    entries = []
    for label_key, value_key in zip(PHONE_LABEL_FIELDS, PHONE_VALUE_FIELDS):
        label = one_line(row.get(label_key, ""))
        value = one_line(row.get(value_key, ""))
        if value:
            entries.append((label, value))
    for idx in range(10):
        label_key = f"Phone {idx + 1} - Label"
        value_key = f"Phone {idx + 1} - Value"
        if idx < len(entries):
            row[label_key], row[value_key] = entries[idx]
        else:
            row[label_key], row[value_key] = "", ""


def finalize_row(row: Dict[str, str], row_number: str) -> List[Dict[str, str]]:
    decisions: List[Dict[str, str]] = []
    for idx in range(1, 11):
        label_key = f"Phone {idx} - Label"
        value_key = f"Phone {idx} - Value"
        value = one_line(row.get(value_key, ""))
        if not value:
            continue
        replace_key = (row_number, value)
        if replace_key in REPLACE_VALUES:
            new_value, rationale = REPLACE_VALUES[replace_key]
            row[value_key] = new_value
            append_note(row, f"Final phone cleanup 2026-06-03 - normalized {value} to {new_value}.")
            decisions.append(
                {
                    "row_number": row_number,
                    "file_as": row.get("File As", ""),
                    "old_value": value,
                    "final_value": new_value,
                    "action": "normalized",
                    "rationale": rationale,
                }
            )
            continue
        if replace_key in MOVE_TO_NOTES:
            rationale = MOVE_TO_NOTES[replace_key]
            row[label_key] = ""
            row[value_key] = ""
            append_note(row, f"Final phone cleanup 2026-06-03 - moved unverified phone value to notes: {value} ({rationale})")
            decisions.append(
                {
                    "row_number": row_number,
                    "file_as": row.get("File As", ""),
                    "old_value": value,
                    "final_value": "",
                    "action": "moved_to_notes",
                    "rationale": rationale,
                }
            )
    compact_phone_slots(row)
    return decisions


def main() -> None:
    parser = argparse.ArgumentParser(description="Finalize remaining phone exceptions for the safe contacts import.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--baseline", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    headers, rows = read_csv(args.input)
    _, baseline_rows = read_csv(args.baseline)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    all_decisions: List[Dict[str, str]] = []
    for idx, row in enumerate(rows, start=2):
        all_decisions.extend(finalize_row(row, str(idx)))
        row["Labels"] = "Cleaned Final 2026-06-03 ::: * myContacts"

    output = args.output_dir / "safe_methods_final_corrected_contacts.csv"
    decisions_csv = args.output_dir / "final_phone_exception_decisions_2026-06-03.csv"
    validation_csv = args.output_dir / "safe_methods_final_validation_2026-06-03.csv"

    write_csv(output, headers, rows)
    write_csv(decisions_csv, ["row_number", "file_as", "old_value", "final_value", "action", "rationale"], all_decisions)

    name_diffs = 0
    for live, final in zip(baseline_rows, rows):
        for field in NAME_FIELDS:
            if live.get(field, "") != final.get(field, ""):
                name_diffs += 1

    no_plus = [
        (idx, row.get("File As", ""), value)
        for idx, row in enumerate(rows, start=2)
        for value in values_for_prefix(row, "Phone")
        if value and not value.startswith("+")
    ]
    packed = [
        (idx, row.get("File As", ""), value)
        for idx, row in enumerate(rows, start=2)
        for value in values_for_prefix(row, "Phone")
        if ":::" in value
    ]
    star_email_labels = [
        (idx, row.get("File As", ""), row.get(f"E-mail {email_idx} - Label", ""))
        for idx, row in enumerate(rows, start=2)
        for email_idx in range(1, 4)
        if row.get(f"E-mail {email_idx} - Label", "").startswith("*")
    ]
    with validation_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["check", "result"])
        writer.writerow(["rows", len(rows)])
        writer.writerow(["name_org_title_field_diffs", name_diffs])
        writer.writerow(["final_phone_decisions", len(all_decisions)])
        writer.writerow(["phone_values_without_plus", len(no_plus)])
        writer.writerow(["packed_phone_values", len(packed)])
        writer.writerow(["star_email_labels", len(star_email_labels)])

    print(f"wrote {output}")
    print(f"wrote {decisions_csv}")
    print(f"wrote {validation_csv}")
    print(f"final_phone_decisions={len(all_decisions)}")
    print(f"phone_values_without_plus={len(no_plus)}")
    print(f"name_org_title_field_diffs={name_diffs}")


if __name__ == "__main__":
    main()
