#!/usr/bin/env python3
"""Normalize Google Contacts phone/email fields without changing contact names.

This is a safer post-merge pass for an already-cleaned contact book. It keeps
person, organization, and title fields intact, then only normalizes spacing,
phone slots, phone labels, email casing, and email labels.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

from strict_contacts_post_clean import (
    EMAIL_LABEL_FIELDS,
    EMAIL_VALUE_FIELDS,
    PHONE_LABEL_FIELDS,
    PHONE_VALUE_FIELDS,
    allowed_email_label,
    allowed_phone_label,
    canonical_phone_key,
    clean_spaces,
    normalize_all_field_spacing,
    normalize_contact_methods,
    one_line,
    payload_sets,
    values_for_prefix,
)


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


def clean_row(row: Dict[str, str]) -> Tuple[Dict[str, str], List[str]]:
    out = dict(row)
    before = {field: out.get(field, "") for field in PHONE_LABEL_FIELDS + PHONE_VALUE_FIELDS + EMAIL_LABEL_FIELDS + EMAIL_VALUE_FIELDS}
    normalize_contact_methods(out)
    normalize_all_field_spacing(out)
    changed = [field for field, value in before.items() if out.get(field, "") != value]
    return out, changed


def has_space_issue(row: Dict[str, str]) -> bool:
    for key, value in row.items():
        expected = clean_spaces(value) if key == "Notes" else one_line(value)
        if value != expected:
            return True
    return False


def phone_without_plus(row: Dict[str, str]) -> List[str]:
    values = []
    for value in values_for_prefix(row, "Phone"):
        if value and not value.startswith("+"):
            values.append(value)
    return values


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean contact methods while preserving live names and organizations.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    headers, rows = read_csv(args.input)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    cleaned_rows: List[Dict[str, str]] = []
    change_rows: List[Dict[str, str]] = []
    phone_review_rows: List[Dict[str, str]] = []
    for idx, row in enumerate(rows, start=2):
        cleaned, changed = clean_row(row)
        cleaned_rows.append(cleaned)
        if changed:
            change_rows.append(
                {
                    "row_number": str(idx),
                    "file_as": cleaned.get("File As", ""),
                    "changed_fields": "; ".join(changed),
                    "phones": "; ".join(values_for_prefix(cleaned, "Phone")),
                    "emails": "; ".join(values_for_prefix(cleaned, "E-mail")),
                }
            )
        no_plus = phone_without_plus(cleaned)
        if no_plus:
            phone_review_rows.append(
                {
                    "row_number": str(idx),
                    "file_as": cleaned.get("File As", ""),
                    "organization": cleaned.get("Organization Name", ""),
                    "title": cleaned.get("Organization Title", ""),
                    "phone_values_without_plus": "; ".join(no_plus),
                    "notes_first_line": clean_spaces(cleaned.get("Notes", "")).splitlines()[0]
                    if clean_spaces(cleaned.get("Notes", "")).splitlines()
                    else "",
                }
            )

    output_csv = args.output_dir / "safe_methods_clean_contacts.csv"
    changes_csv = args.output_dir / "safe_methods_change_report.csv"
    phone_review_csv = args.output_dir / "phone_country_code_review.csv"
    validation_csv = args.output_dir / "safe_methods_validation_report.csv"

    write_csv(output_csv, headers, cleaned_rows)
    write_csv(changes_csv, ["row_number", "file_as", "changed_fields", "phones", "emails"], change_rows)
    write_csv(
        phone_review_csv,
        ["row_number", "file_as", "organization", "title", "phone_values_without_plus", "notes_first_line"],
        phone_review_rows,
    )

    before_phones = payload_sets(rows, "Phone")
    after_phones = payload_sets(cleaned_rows, "Phone")
    before_emails = payload_sets(rows, "E-mail")
    after_emails = payload_sets(cleaned_rows, "E-mail")

    spacing_rows = sum(1 for row in cleaned_rows if has_space_issue(row))
    weird_phone_labels = sum(
        1
        for row in cleaned_rows
        for idx in range(1, 11)
        if row.get(f"Phone {idx} - Label", "") and not allowed_phone_label(row.get(f"Phone {idx} - Label", ""))
    )
    weird_email_labels = sum(
        1
        for row in cleaned_rows
        for idx in range(1, 4)
        if row.get(f"E-mail {idx} - Label", "") and not allowed_email_label(row.get(f"E-mail {idx} - Label", ""))
    )
    packed_phone_values = sum(
        1
        for row in cleaned_rows
        for value in values_for_prefix(row, "Phone")
        if ":::" in value
    )
    no_plus_values = sum(len(phone_without_plus(row)) for row in cleaned_rows)

    validation_rows = [
        ("input_rows", str(len(rows))),
        ("output_rows", str(len(cleaned_rows))),
        ("rows_with_method_changes", str(len(change_rows))),
        ("phone_values_preserved", "Yes" if before_phones <= after_phones else "No"),
        ("missing_phone_values", str(len(before_phones - after_phones))),
        ("email_values_preserved", "Yes" if before_emails <= after_emails else "No"),
        ("missing_email_values", str(len(before_emails - after_emails))),
        ("spacing_issue_rows", str(spacing_rows)),
        ("weird_phone_label_rows", str(weird_phone_labels)),
        ("weird_email_label_rows", str(weird_email_labels)),
        ("packed_phone_value_rows", str(packed_phone_values)),
        ("phone_values_without_plus_review", str(no_plus_values)),
    ]
    with validation_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["check", "result"])
        writer.writerows(validation_rows)

    print(f"wrote {output_csv}")
    print(f"wrote {changes_csv}")
    print(f"wrote {phone_review_csv}")
    print(f"wrote {validation_csv}")


if __name__ == "__main__":
    main()
