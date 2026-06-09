#!/usr/bin/env python3
"""Fix issues discovered by the final one-by-one contact audit."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from strict_contacts_post_clean import clean_spaces, one_line


EMAIL_LABEL_FIELDS = [f"E-mail {idx} - Label" for idx in range(1, 4)]
EMAIL_VALUE_FIELDS = [f"E-mail {idx} - Value" for idx in range(1, 4)]


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
    lines = [existing for existing in clean_spaces(row.get("Notes", "")).splitlines() if existing.strip()]
    if line.lower() not in {existing.lower() for existing in lines}:
        lines.append(line)
    row["Notes"] = "\n".join(lines)


def looks_like_email(value: str) -> bool:
    value = one_line(value).lower()
    return bool(re.fullmatch(r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+", value))


def email_parts(value: str) -> List[str]:
    raw = one_line(value).lower()
    parts = [one_line(part).lower() for part in re.split(r"\s*:::\s*", raw) if one_line(part)]
    if not parts and raw:
        parts = [raw]
    return parts


def normalize_email_slots(row: Dict[str, str]) -> List[str]:
    actions: List[str] = []
    collected: List[str] = []
    moved_non_email: List[str] = []
    for idx in range(1, 4):
        value = row.get(f"E-mail {idx} - Value", "")
        for part in email_parts(value):
            if looks_like_email(part):
                if part not in collected:
                    collected.append(part)
            elif part:
                moved_non_email.append(part)

    for idx in range(1, 4):
        label_key = f"E-mail {idx} - Label"
        value_key = f"E-mail {idx} - Value"
        if idx <= len(collected[:3]):
            old = row.get(value_key, "")
            row[label_key] = "Other"
            row[value_key] = collected[idx - 1]
            if old != row[value_key]:
                actions.append(f"{value_key}: {old} -> {row[value_key]}")
        else:
            if row.get(value_key, "") or row.get(label_key, ""):
                actions.append(f"{value_key}: cleared")
            row[label_key] = ""
            row[value_key] = ""

    overflow = collected[3:]
    if overflow:
        append_note(row, "Final one-by-one audit 2026-06-03 - extra email values beyond first 3 kept in notes: " + "; ".join(overflow))
        actions.append("extra emails moved to notes")
    if moved_non_email:
        append_note(row, "Final one-by-one audit 2026-06-03 - moved non-email text out of email field: " + "; ".join(moved_non_email))
        actions.append("non-email text moved to notes")
    return actions


def normalize_prefix(row: Dict[str, str]) -> List[str]:
    old = one_line(row.get("Name Prefix", ""))
    if old != "Prof Dr Prof":
        return []
    row["Name Prefix"] = "Prof Dr"
    append_note(row, "Final one-by-one audit 2026-06-03 - deduped repeated Name Prefix from Prof Dr Prof to Prof Dr.")
    return [f"Name Prefix: {old} -> Prof Dr"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Fix final one-by-one audit issues in contacts CSV.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    headers, rows = read_csv(args.input)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    change_rows: List[Dict[str, str]] = []
    for idx, row in enumerate(rows, start=2):
        actions = []
        actions.extend(normalize_prefix(row))
        actions.extend(normalize_email_slots(row))
        if actions:
            row["Labels"] = "Cleaned Final 2026-06-03 ::: * myContacts"
            change_rows.append(
                {
                    "row_number": str(idx),
                    "file_as": row.get("File As", ""),
                    "actions": "; ".join(actions),
                }
            )

    output = args.output_dir / "safe_methods_final_one_by_one_fixed_contacts.csv"
    changes = args.output_dir / "one_by_one_fixes_applied_2026-06-03.csv"
    write_csv(output, headers, rows)
    write_csv(changes, ["row_number", "file_as", "actions"], change_rows)
    print(f"wrote {output}")
    print(f"wrote {changes}")
    print(f"fix_rows={len(change_rows)}")


if __name__ == "__main__":
    main()
