#!/usr/bin/env python3
"""Create operator-focused review buckets for the contacts cleanup outputs."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def norm(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", " ", (value or "").lower())
    return re.sub(r"\s+", " ", value).strip()


def name_tokens(value: str) -> set[str]:
    stop = {
        "app",
        "call",
        "cel",
        "cell",
        "eo",
        "latest",
        "linkedin",
        "new",
        "rotary",
        "wf",
        "whats",
        "whatsapp",
    }
    return {token for token in norm(value).split() if len(token) > 1 and token not in stop}


def bucket_manual(row: Dict[str, str]) -> Dict[str, str]:
    reason = row.get("reason", "")
    review_id = row.get("review_id", "")
    original = row.get("original_names", "")
    suggested_name = " ".join(
        row.get(key, "")
        for key in ["suggested_first_name", "suggested_middle_name", "suggested_last_name"]
        if row.get(key, "")
    ).strip()

    if review_id.startswith("shared_"):
        bucket = "duplicate_candidate"
        priority = "high"
        action = "Leave unmerged in cleaned import; inspect later if this person matters."
        rationale = "Same phone/email appears across different-looking names; cleaner preserved all rows instead of guessing."
    elif "mojibake" in reason.lower() or "no usable" in reason.lower() or not (suggested_name or row.get("suggested_organization", "")):
        bucket = "critical_manual"
        priority = "high"
        action = "Review before live replacement; encoding/name may need human correction."
        rationale = "Contact may have damaged text or no clean person/organization name."
    elif "Organization-only contact" in reason:
        bucket = "organization_only"
        priority = "medium"
        action = "Accept as organization contact unless you know the person name."
        rationale = "No phone/email is dropped; original name remains in Notes."
    elif "business/organization" in reason or "organization/context" in reason:
        bucket = "person_org_split"
        priority = "medium"
        action = "Accept for import; spot-check important contacts."
        rationale = "Business-like text was moved to Organization fields and original name is retained."
    elif "role/title" in reason or "role/location/context" in reason or "context" in reason:
        bucket = "role_context_cleanup"
        priority = "medium"
        action = "Accept for import; context was preserved in Notes."
        rationale = "Role/location/context was moved out of the person name."
    elif "Bracketed name/context" in reason:
        bucket = "bracket_cleanup"
        priority = "low"
        action = "Accept for import."
        rationale = "Bracket symbols were cleaned while preserving the original name in Notes."
    else:
        bucket = "general_review"
        priority = "medium"
        action = "Accept unless this is a high-value contact; original is preserved in Notes."
        rationale = "Cleaner made a transparent, reversible field cleanup."

    out = dict(row)
    out.update(
        {
            "review_bucket": bucket,
            "priority": priority,
            "recommended_action": action,
            "operator_rationale": rationale,
        }
    )
    return out


def bucket_merge(row: Dict[str, str]) -> Dict[str, str]:
    originals = row.get("originals_merged", "")
    final_name = row.get("final_name", "")
    groups = [part.split(": ", 1)[-1] for part in originals.split(" | ") if part.strip()]
    final_tokens = name_tokens(final_name)
    overlap_scores = []
    for original in groups:
        tokens = name_tokens(original)
        if not tokens or not final_tokens:
            overlap_scores.append(0.0)
        else:
            overlap_scores.append(len(tokens & final_tokens) / max(1, min(len(tokens), len(final_tokens))))

    has_email = bool(row.get("matching_email", "").strip())
    has_phone = bool(row.get("matching_phone", "").strip())
    reason_has_shared = "Shared phone" in row.get("reason", "") or "Shared email" in row.get("reason", "")
    one_word_final = len(final_tokens) <= 1
    weak_overlap = bool(overlap_scores) and min(overlap_scores) < 0.5

    if (one_word_final or weak_overlap) and not reason_has_shared:
        bucket = "hold_for_review"
        priority = "high"
        action = "Do not rely on this merge for live replacement until spot-checked."
        rationale = "The merged final name is too short or one source name has weak token overlap."
    elif has_email and has_phone:
        bucket = "safe_merge"
        priority = "low"
        action = "Accept."
        rationale = "Shared email and phone with compatible names."
    elif has_email:
        bucket = "safe_merge"
        priority = "low"
        action = "Accept."
        rationale = "Shared email with compatible names."
    elif has_phone:
        bucket = "safe_merge"
        priority = "low"
        action = "Accept with ordinary caution."
        rationale = "Shared phone with compatible names."
    elif reason_has_shared:
        bucket = "safe_merge"
        priority = "low"
        action = "Accept with ordinary caution."
        rationale = "Shared phone/email reasoning is documented in the merge report."
    else:
        bucket = "hold_for_review"
        priority = "high"
        action = "Review before relying on this merge."
        rationale = "No shared phone/email appeared in the report row."

    out = dict(row)
    out.update(
        {
            "review_bucket": bucket,
            "priority": priority,
            "recommended_action": action,
            "operator_rationale": rationale,
        }
    )
    return out


def write_import_strategy(output_dir: Path, manual_rows: List[Dict[str, str]], merge_rows: List[Dict[str, str]]) -> None:
    manual_counts: Dict[str, int] = {}
    for row in manual_rows:
        manual_counts[row["review_bucket"]] = manual_counts.get(row["review_bucket"], 0) + 1
    merge_counts: Dict[str, int] = {}
    for row in merge_rows:
        merge_counts[row["review_bucket"]] = merge_counts.get(row["review_bucket"], 0) + 1

    high_manual = sum(1 for row in manual_rows if row["priority"] == "high")
    high_merge = sum(1 for row in merge_rows if row["priority"] == "high")

    lines = [
        "# Contacts cleanup operator decision",
        "",
        "## My review result",
        "",
        "The cleaned CSV is technically import-ready, and the preservation checks pass. I do not recommend importing it over the existing live account as a normal Google Contacts import, because Google import adds contacts rather than updating the existing 9k records. That would likely create a second copy of most contacts.",
        "",
        "## Safe live-account route",
        "",
        "1. Keep the existing source backups in this folder.",
        "2. Use `cleaned_contacts.csv` only if we are doing a controlled replace workflow: export current state again, delete the old contact set or move it aside, then import the cleaned file.",
        "3. For a non-destructive trial, import into a separate test account or a temporary empty contacts account first.",
        "4. If using the live account, import only after confirming the controlled replace step. Do not import the full file into the already-populated account.",
        "",
        "## Review buckets",
        "",
        "Manual-review buckets:",
        *[f"- {bucket}: {count}" for bucket, count in sorted(manual_counts.items())],
        "",
        "Merge-report buckets:",
        *[f"- {bucket}: {count}" for bucket, count in sorted(merge_counts.items())],
        "",
        "## Priority",
        "",
        f"- High-priority manual rows: {high_manual}",
        f"- High-priority merge rows: {high_merge}",
        "",
        "## Files to use",
        "",
        "- `cleaned_contacts.csv`: import file for controlled replace or test import.",
        "- `manual_review_operator_buckets.csv`: full manual list with my recommended action.",
        "- `manual_review_priority.csv`: the short list that matters most before live replacement.",
        "- `merge_report_operator_review.csv`: merge report with my accept/hold decision.",
        "- `merge_report_hold_for_review.csv`: auto-merges I would inspect before relying on a live replacement.",
        "- `safe_incremental_freq_only_contacts.csv`: small safe import containing Freq-only contacts not already in the main export.",
        "- `safe_incremental_freq_only_excluded.csv`: Freq-only rows excluded from the small import because the visible name text is damaged.",
        "",
    ]
    (output_dir / "import_strategy.md").write_text("\n".join(lines), encoding="utf-8")


def write_safe_incremental(output_dir: Path) -> Tuple[int, int]:
    cleaned_path = output_dir / "cleaned_contacts.csv"
    rows = read_csv(cleaned_path)
    if not rows:
        return 0, 0
    headers = list(rows[0].keys())
    markers = ["◊", "√", "Ã", "Â", "�"]
    safe: List[Dict[str, str]] = []
    excluded: List[Dict[str, str]] = []
    for row in rows:
        notes = row.get("Notes", "")
        if not ("freq:" in notes and "contacts:" not in notes):
            continue
        visible = " ".join(row.get(key, "") for key in ["First Name", "Middle Name", "Last Name", "Organization Name", "Notes"])
        has_identity = any(row.get(key, "") for key in ["First Name", "Middle Name", "Last Name", "Organization Name", "E-mail 1 - Value", "Phone 1 - Value"])
        if any(marker in visible for marker in markers) or not has_identity:
            excluded.append(row)
            continue
        promoted = dict(row)
        promoted["Labels"] = "* myContacts"
        safe.append(promoted)

    write_csv(output_dir / "safe_incremental_freq_only_contacts.csv", headers, safe)
    write_csv(output_dir / "safe_incremental_freq_only_excluded.csv", headers, excluded)
    return len(safe), len(excluded)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create operator review buckets for contacts cleanup.")
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    output_dir = args.output_dir
    manual_rows = [bucket_manual(row) for row in read_csv(output_dir / "manual_review.csv")]
    merge_rows = [bucket_merge(row) for row in read_csv(output_dir / "merge_report.csv")]
    safe_incremental, safe_incremental_excluded = write_safe_incremental(output_dir)

    manual_headers = list(manual_rows[0].keys()) if manual_rows else []
    merge_headers = list(merge_rows[0].keys()) if merge_rows else []
    write_csv(output_dir / "manual_review_operator_buckets.csv", manual_headers, manual_rows)
    write_csv(
        output_dir / "manual_review_priority.csv",
        manual_headers,
        [row for row in manual_rows if row["priority"] == "high"],
    )
    write_csv(output_dir / "merge_report_operator_review.csv", merge_headers, merge_rows)
    write_csv(
        output_dir / "merge_report_hold_for_review.csv",
        merge_headers,
        [row for row in merge_rows if row["review_bucket"] == "hold_for_review"],
    )
    write_import_strategy(output_dir, manual_rows, merge_rows)

    print(f"manual_rows={len(manual_rows)}")
    print(f"manual_priority={sum(1 for row in manual_rows if row['priority'] == 'high')}")
    print(f"merge_rows={len(merge_rows)}")
    print(f"merge_hold={sum(1 for row in merge_rows if row['review_bucket'] == 'hold_for_review')}")
    print(f"safe_incremental={safe_incremental}")
    print(f"safe_incremental_excluded={safe_incremental_excluded}")
    print(f"output_dir={output_dir}")


if __name__ == "__main__":
    main()
