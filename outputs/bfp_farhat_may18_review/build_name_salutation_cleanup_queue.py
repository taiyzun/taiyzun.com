#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

BASE = Path("/Users/tai/Documents/GitHub/taiyzun.com/outputs/bfp_farhat_may18_review")
DECISION = BASE / "farhat_may18_decision_queue.csv"
SYSTEM = Path("/Users/tai/Downloads/guests-2026-05-17-658.csv")
OUT_SAFE = BASE / "name_salutation_cleanup_queue.json"
OUT_REVIEW = BASE / "name_salutation_rnd_review.csv"
OUT_SUMMARY = BASE / "name_salutation_cleanup_summary.json"

HON_PATTERNS = [
    "H.E. Hon.",
    "Hon'ble Shri",
    "Hon'ble Smt",
    "Hon'ble Mr",
    "Hon'ble Ms",
    "Most Venerable Dr",
    "Most Venerable",
    "Vada Dasturji",
    "Respected Sardar",
    "Prof. Dr.",
    "Prof Dr",
    "Professor",
    "Prof.",
    "Padma Shri",
    "Rt Rev Dr",
    "Sr (Dr)",
    "Sr. Dr.",
    "H.E. Mr",
    "H.E.",
    "H.E",
    "H H",
    "H.H.",
    "HRH",
    "Hon'ble",
    "Advocate",
    "Adv.",
    "Dr.",
    "Prof",
    "Capt.",
    "Mr.",
    "Mrs.",
    "Ms.",
    "Miss",
    "Molvi",
    "Maulana",
    "Shri",
    "Smt",
    "Adv",
    "Dr",
    "HE",
    "HH",
    "CA",
    "Mr",
    "Mrs",
    "Ms",
]
HON_PATTERNS = sorted(HON_PATTERNS, key=len, reverse=True)

SAFE_ACTIONS = {"READY_SAFE_UPDATE", "ASK_STATUS", "ASK_AWARD_CATEGORY"}
SKIP_CATEGORY_FINAL = {"XXX", "Media"}


def clean(value: str | None) -> str:
    return (value or "").replace("\u00a0", " ").strip()


def split_title_name(value: str | None) -> tuple[str, str]:
    text = clean(value).lstrip("•⁠-–— ").strip()
    text = re.sub(r"\s+", " ", text)

    # Collapse obvious duplicated title at the start, e.g. "Vada Dasturji Vada Dasturji X".
    for title in HON_PATTERNS:
        pat = re.compile(rf"^({re.escape(title)})\s+\1\s+", re.I)
        text = pat.sub(r"\1 ", text)

    for title in HON_PATTERNS:
        if re.match(rf"^{re.escape(title)}(?:\s+|$)", text, re.I):
            return title, text[len(title) :].strip()
    return "", text


def norm(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", " ", clean(value).lower()).strip()


def canon_honorific(value: str | None) -> str:
    value = clean(value).lower().replace("’", "'")
    value = re.sub(r"[^a-z0-9']+", " ", value).strip()
    aliases = {
        "mr": "mr",
        "mrs": "mrs",
        "ms": "ms",
        "miss": "miss",
        "dr": "dr",
        "prof": "prof",
        "professor": "prof",
        "adv": "adv",
        "advocate": "adv",
        "he": "he",
        "h e": "he",
        "hh": "hh",
        "h h": "hh",
        "hon ble": "honble",
        "hon'ble": "honble",
        "honble": "honble",
        "shri": "shri",
        "smt": "smt",
        "prof dr": "prof dr",
        "professor dr": "prof dr",
        "padma shri": "padma shri",
        "vada dasturji": "vada dasturji",
        "most venerable dr": "most venerable dr",
        "most venerable": "most venerable",
        "respected sardar": "respected sardar",
        "rt rev dr": "rt rev dr",
        "sr dr": "sr dr",
        "molvi": "molvi",
        "maulana": "maulana",
        "hrh": "hrh",
        "me": "mr",  # observed typo in system export
    }
    return aliases.get(value, value)


def read_system() -> dict[str, dict]:
    with SYSTEM.open(encoding="utf-8-sig", newline="") as handle:
        return {row["id"]: row for row in csv.DictReader(handle)}


def main() -> None:
    system = read_system()
    safe: list[dict] = []
    review: list[dict] = []
    seen_ids: set[str] = set()

    with DECISION.open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            sid = clean(row["System ID"])
            fans_honorific, fans_name_only = split_title_name(row["FANS Name"])
            sys = system.get(sid, {})
            sys_honorific = clean(sys.get("honorific"))
            sys_name = clean(sys.get("name"))
            sys_name_honorific, sys_name_only = split_title_name(sys_name)

            base = {
                "id": sid,
                "fans_row": row["FANS Row"],
                "fans_name": row["FANS Name"],
                "action": row["Action"],
                "match_type": row["Match Type"],
                "current": {"honorific": sys_honorific, "name": sys_name},
                "target": {"honorific": fans_honorific, "name": fans_name_only},
                "source": {
                    "FANS Category Final": row["FANS Category Final"],
                    "FANS Category": row["FANS Category"],
                    "System Name": row["System Name"],
                    "System Status": row["System Status"],
                    "Reasons": row["Reasons"],
                },
            }

            if row["FANS Category Final"] in SKIP_CATEGORY_FINAL:
                continue
            if not sid or "|" in sid:
                review.append({**base, "reason": "missing or multiple System IDs"})
                continue
            if sid in seen_ids:
                review.append({**base, "reason": "duplicate System ID in Farhat decision queue"})
                continue
            seen_ids.add(sid)
            if row["Action"] not in SAFE_ACTIONS or row["Match Type"].startswith("fuzzy"):
                review.append({**base, "reason": "fuzzy or non-safe match; do not change automatically"})
                continue

            changes: dict[str, str] = {}
            reasons: list[str] = []
            current_h = canon_honorific(sys_honorific)
            target_h = canon_honorific(fans_honorific)
            sys_name_h = canon_honorific(sys_name_honorific)

            # Farhat explicitly gives a salutation. Use it to keep title out of name.
            if fans_honorific and fans_name_only:
                if not sys_honorific or current_h == "mr" and clean(sys_honorific).lower() == "me.":
                    changes["honorific"] = fans_honorific
                    reasons.append("Salutation missing or obvious typo; using Farhat explicit salutation")
                elif current_h != target_h:
                    review.append({**base, "reason": "system salutation differs substantively from Farhat; R&D required"})
                    continue
                if norm(sys_name) != norm(fans_name_only) and norm(sys_name) == norm(row["FANS Name"]):
                    changes["name"] = fans_name_only
                    reasons.append("system name includes salutation; move it to Salutation")
                elif sys_name_honorific and sys_name_h == target_h and norm(sys_name_only) == norm(fans_name_only):
                    changes["name"] = sys_name_only
                    reasons.append("system name starts with a recognised salutation")

            # System name has a title but Farhat does not. Safe only when the title extraction leaves
            # a plausible full name and salutation is blank.
            elif sys_name_honorific and sys_name_only and not sys_honorific:
                changes["honorific"] = sys_name_honorific
                changes["name"] = sys_name_only
                reasons.append("system name includes a recognised salutation but Salutation is blank")

            # If no salutation anywhere, hold for R&D instead of guessing.
            elif not fans_honorific and not sys_honorific:
                review.append({**base, "reason": "salutation missing; R&D required before update"})
                continue

            if changes:
                safe.append({**base, "changes": changes, "reason": "; ".join(reasons)})

    OUT_SAFE.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding="utf-8")
    with OUT_REVIEW.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["id", "fans_row", "fans_name", "current_honorific", "current_name", "target_honorific", "target_name", "reason"])
        for item in review:
            writer.writerow(
                [
                    item["id"],
                    item["fans_row"],
                    item["fans_name"],
                    item["current"]["honorific"],
                    item["current"]["name"],
                    item["target"]["honorific"],
                    item["target"]["name"],
                    item["reason"],
                ]
            )

    summary = {
        "safe_cleanup_rows": len(safe),
        "rnd_or_manual_review_rows": len(review),
        "safe_queue": str(OUT_SAFE),
        "review_csv": str(OUT_REVIEW),
    }
    OUT_SUMMARY.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
