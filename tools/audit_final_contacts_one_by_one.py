#!/usr/bin/env python3
"""Row-by-row audit for the final corrected Google Contacts CSV."""

from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from strict_contacts_post_clean import (
    NAME_PREFIX_WORDS,
    ROLE_PREFIX_WORDS,
    ROLE_PHRASES,
    ORG_SINGLE_TOKENS,
    ORG_PHRASES,
    LOCATION_PHRASES,
    NOTE_PHRASES,
    allowed_email_label,
    allowed_phone_label,
    clean_spaces,
    contains_bad_name_token,
    norm,
    one_line,
    starts_with_bad_name_token,
    values_for_prefix,
)


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

CONTACT_ID_FIELDS = [
    "First Name",
    "Middle Name",
    "Last Name",
    "File As",
    "Organization Name",
    "Organization Title",
]

REVIEW_TERMS = (
    set(NAME_PREFIX_WORDS)
    | set(ROLE_PREFIX_WORDS)
    | set(ROLE_PHRASES)
    | set(ORG_SINGLE_TOKENS)
    | set(ORG_PHRASES)
    | set(LOCATION_PHRASES)
    | set(NOTE_PHRASES)
    | {"photographer", "driver", "doctor", "real", "estate", "mobile"}
)

ALLOWED_PREFIX_VALUES = {
    "Capt",
    "Captain",
    "Dr",
    "Haji",
    "Her Excellency",
    "Her Excellency Smt",
    "H H",
    "H H Shri",
    "Hon",
    "Major",
    "Maulana",
    "Miss",
    "Mr",
    "Mrs",
    "Ms",
    "Prof",
    "Prof Dr",
    "Professor",
    "Sheikh",
    "Shri",
    "Sir",
    "Smt",
}

ALLOWED_LABEL = "Cleaned Final 2026-06-03 ::: * myContacts"
EMAIL_RE = re.compile(r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")


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


def has_space_issue(row: Dict[str, str]) -> List[str]:
    bad = []
    for key, value in row.items():
        expected = clean_spaces(value) if key == "Notes" else one_line(value)
        if value != expected:
            bad.append(key)
    return bad


def split_label_values(row: Dict[str, str], prefix: str, limit: int) -> List[tuple[str, str]]:
    out = []
    for idx in range(1, limit + 1):
        out.append((row.get(f"{prefix} {idx} - Label", ""), row.get(f"{prefix} {idx} - Value", "")))
    return out


def phone_digits(value: str) -> str:
    return re.sub(r"\D+", "", one_line(value))


def issue_rows(rows: Sequence[Dict[str, str]]) -> List[Dict[str, str]]:
    issues: List[Dict[str, str]] = []
    for idx, row in enumerate(rows, start=2):
        file_as = row.get("File As", "")
        has_person = bool(one_line(row.get("First Name", "")) or one_line(row.get("Last Name", "")))

        if not any(one_line(row.get(field, "")) for field in CONTACT_ID_FIELDS):
            issues.append({"row_number": str(idx), "file_as": file_as, "issue": "missing_identity_fields", "detail": ""})

        if row.get("Labels", "") != ALLOWED_LABEL:
            issues.append({"row_number": str(idx), "file_as": file_as, "issue": "wrong_label", "detail": row.get("Labels", "")})

        if starts_with_bad_name_token(row.get("First Name", "")):
            issues.append({"row_number": str(idx), "file_as": file_as, "issue": "bad_first_name_token", "detail": row.get("First Name", "")})

        if contains_bad_name_token(row.get("Organization Title", "")):
            # In a title field, Advocate/CA/Minister are valid designations. Flag
            # only salutations that are wrong inside designations.
            title_tokens = set(norm(row.get("Organization Title", "")).split())
            bad_title_tokens = sorted(title_tokens & set(NAME_PREFIX_WORDS))
            if bad_title_tokens:
                issues.append(
                    {
                        "row_number": str(idx),
                        "file_as": file_as,
                        "issue": "salutation_in_designation",
                        "detail": ", ".join(bad_title_tokens),
                    }
                )

        if has_person:
            name_text = " ".join(row.get(field, "") for field in ["First Name", "Middle Name", "Last Name", "File As"])
            bad_terms = sorted(set(norm(name_text).split()) & REVIEW_TERMS)
            # A few short words can be genuine surnames/names. Only flag clear
            # role/org/service leftovers in visible person names.
            clear_bad = [
                term
                for term in bad_terms
                if term
                in {
                    "photographer",
                    "driver",
                    "doctor",
                    "hospital",
                    "hotel",
                    "spa",
                    "bank",
                    "foundation",
                    "real",
                    "estate",
                    "mobile",
                    "minister",
                    "chairman",
                    "president",
                    "secretary",
                    "advocate",
                    "ca",
                    "dr",
                    "mr",
                    "mrs",
                    "ms",
                }
            ]
            if clear_bad:
                issues.append({"row_number": str(idx), "file_as": file_as, "issue": "visible_name_review_terms", "detail": ", ".join(clear_bad)})

        prefix = one_line(row.get("Name Prefix", ""))
        if prefix:
            for part in re.split(r"[;,]+", prefix):
                part = one_line(part)
                if part and part not in ALLOWED_PREFIX_VALUES:
                    issues.append({"row_number": str(idx), "file_as": file_as, "issue": "unexpected_name_prefix", "detail": part})

        for field in has_space_issue(row):
            issues.append({"row_number": str(idx), "file_as": file_as, "issue": "spacing_issue", "detail": field})

        seen_phone_slots: set[str] = set()
        for phone_idx, (label, value) in enumerate(split_label_values(row, "Phone", 10), start=1):
            label = one_line(label)
            value = one_line(value)
            if label and not allowed_phone_label(label):
                issues.append({"row_number": str(idx), "file_as": file_as, "issue": "bad_phone_label", "detail": f"Phone {phone_idx}: {label}"})
            if value:
                if ":::" in value:
                    issues.append({"row_number": str(idx), "file_as": file_as, "issue": "packed_phone_value", "detail": f"Phone {phone_idx}: {value}"})
                if not value.startswith("+"):
                    issues.append({"row_number": str(idx), "file_as": file_as, "issue": "phone_without_plus", "detail": f"Phone {phone_idx}: {value}"})
                if len(phone_digits(value)) < 7:
                    issues.append({"row_number": str(idx), "file_as": file_as, "issue": "too_short_phone", "detail": f"Phone {phone_idx}: {value}"})
                key = phone_digits(value)
                if key in seen_phone_slots:
                    issues.append({"row_number": str(idx), "file_as": file_as, "issue": "duplicate_phone_in_row", "detail": value})
                seen_phone_slots.add(key)

        for email_idx, (label, value) in enumerate(split_label_values(row, "E-mail", 3), start=1):
            label = one_line(label)
            value = one_line(value)
            if label and not allowed_email_label(label):
                issues.append({"row_number": str(idx), "file_as": file_as, "issue": "bad_email_label", "detail": f"E-mail {email_idx}: {label}"})
            if label.startswith("*"):
                issues.append({"row_number": str(idx), "file_as": file_as, "issue": "star_email_label", "detail": f"E-mail {email_idx}: {label}"})
            if value and (value != value.lower() or " " in value):
                issues.append({"row_number": str(idx), "file_as": file_as, "issue": "bad_email_value_format", "detail": f"E-mail {email_idx}: {value}"})
            if value and not EMAIL_RE.match(value):
                issues.append({"row_number": str(idx), "file_as": file_as, "issue": "invalid_email_syntax", "detail": f"E-mail {email_idx}: {value}"})
    return issues


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit the final corrected contacts CSV one row at a time.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    headers, rows = read_csv(args.input)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    issues = issue_rows(rows)

    issue_csv = args.output_dir / "final_contacts_one_by_one_issues.csv"
    summary_csv = args.output_dir / "final_contacts_one_by_one_summary.csv"
    report_md = args.output_dir / "final_contacts_one_by_one_audit_2026-06-03.md"
    write_csv(issue_csv, ["row_number", "file_as", "issue", "detail"], issues)

    counts = Counter(issue["issue"] for issue in issues)
    with summary_csv.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["check", "result"])
        writer.writerow(["rows_checked", len(rows)])
        writer.writerow(["columns_checked", len(headers)])
        writer.writerow(["issue_rows", len({issue["row_number"] for issue in issues})])
        writer.writerow(["issue_count", len(issues)])
        for issue, count in sorted(counts.items()):
            writer.writerow([issue, count])

    with report_md.open("w", encoding="utf-8") as handle:
        handle.write("# Final Contacts One-by-One Audit - 2026-06-03\n\n")
        handle.write(f"- Rows checked: {len(rows)}\n")
        handle.write(f"- Columns checked: {len(headers)}\n")
        handle.write(f"- Issue rows: {len({issue['row_number'] for issue in issues})}\n")
        handle.write(f"- Issue count: {len(issues)}\n\n")
        if issues:
            handle.write("## Issues\n\n")
            handle.write("| Row | Contact | Issue | Detail |\n")
            handle.write("|---:|---|---|---|\n")
            for issue in issues[:200]:
                values = [issue["row_number"], issue["file_as"], issue["issue"], issue["detail"]]
                safe = [value.replace("|", "/").replace("\n", " ") for value in values]
                handle.write("| " + " | ".join(safe) + " |\n")
        else:
            handle.write("No issues found under the final audit rules.\n")

    print(f"rows_checked={len(rows)}")
    print(f"columns_checked={len(headers)}")
    print(f"issue_rows={len({issue['row_number'] for issue in issues})}")
    print(f"issue_count={len(issues)}")
    for issue, count in sorted(counts.items()):
        print(f"{issue}={count}")
    print(f"wrote {summary_csv}")
    print(f"wrote {issue_csv}")
    print(f"wrote {report_md}")


if __name__ == "__main__":
    main()
