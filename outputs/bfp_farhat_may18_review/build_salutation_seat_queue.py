import csv
import json
import re
from pathlib import Path

BASE = Path("/Users/tai/Documents/GitHub/taiyzun.com/outputs/bfp_farhat_may18_review")
SRC = BASE / "farhat_may18_decision_queue.csv"
OUT = BASE / "farhat_may18_salutation_seat_queue.json"

HON_PATTERNS = [
    "Hon'ble Shri",
    "Hon'ble Smt",
    "Hon'ble Mr",
    "Hon'ble Ms",
    "Hon'ble",
    "H.E. Hon.",
    "H.E. Mr",
    "H.E.",
    "HE",
    "H.H.",
    "HH",
    "Professor",
    "Prof.",
    "Prof",
    "Most Venerable Dr",
    "Most Venerable",
    "Rt Rev Dr",
    "Rt Rev",
    "Respected Sardar",
    "Padma Shri",
    "Sr (Dr)",
    "Sr. Dr.",
    "Dr.",
    "Dr",
    "CA",
    "Adv.",
    "Adv",
    "Mr.",
    "Mr",
    "Mrs.",
    "Mrs",
    "Ms.",
    "Ms",
    "Miss",
    "Shri",
    "Smt",
    "Molvi",
]
HON_PATTERNS = sorted(HON_PATTERNS, key=len, reverse=True)

SAFE_ACTIONS = {"READY_SAFE_UPDATE", "ASK_STATUS", "ASK_AWARD_CATEGORY"}
SKIP_CATEGORY_FINAL = {"XXX", "Media"}


def clean(value: str) -> str:
    return (value or "").replace("\u00a0", " ").strip()


def split_name(value: str) -> tuple[str, str]:
    text = clean(value).lstrip("•⁠-–— ").strip()
    for honorific in HON_PATTERNS:
        if text.lower().startswith(honorific.lower() + " "):
            return honorific, text[len(honorific) :].strip()
    return "", text


def norm_seat(value: str) -> str:
    seat = clean(value)
    if not seat or seat in {"-", "—"}:
        return ""
    if re.fullmatch(r"sofa\s*-?", seat, re.I):
        return "Sofa"
    if re.fullmatch(r"(\d+)\s*-", seat):
        return re.sub(r"\s*-", "", seat)
    return seat


queue: list[dict[str, object]] = []
held: list[dict[str, object]] = []

with SRC.open(encoding="utf-8-sig", newline="") as handle:
    for row in csv.DictReader(handle):
        system_id = clean(row["System ID"])
        honorific, target_name = split_name(row["FANS Name"])
        item = {
            "id": system_id,
            "fans_row": row["FANS Row"],
            "fans_name": row["FANS Name"],
            "action": row["Action"],
            "match_type": row["Match Type"],
            "target": {
                "honorific": honorific,
                "name": target_name,
                "seat_no": norm_seat(row["FANS Seat 18th 3am"]),
                "status_label": row["Target Status"],
                "champion_category": row["Target Champion Category"],
            },
            "source": {
                "FANS Category Final": row["FANS Category Final"],
                "FANS Category": row["FANS Category"],
                "FANS Award Category": row["FANS Award Category"],
                "FANS Seat 18th 3am": row["FANS Seat 18th 3am"],
                "System Name": row["System Name"],
                "System Status": row["System Status"],
                "Reasons": row["Reasons"],
            },
        }

        if row["FANS Category Final"] in SKIP_CATEGORY_FINAL:
            held.append({**item, "hold_reason": "XXX/media row; do not add or update automatically"})
            continue
        if row["Action"] not in SAFE_ACTIONS:
            held.append({**item, "hold_reason": "not in safe salutation/seat action set"})
            continue
        if not system_id or "|" in system_id:
            held.append({**item, "hold_reason": "missing or multiple live System IDs"})
            continue
        if row["Match Type"].startswith("fuzzy"):
            held.append({**item, "hold_reason": "fuzzy match; confirmation required"})
            continue
        if not honorific and not item["target"]["seat_no"]:
            continue
        queue.append(item)

OUT.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
(BASE / "farhat_may18_salutation_seat_held.json").write_text(
    json.dumps(held, ensure_ascii=False, indent=2), encoding="utf-8"
)

print(
    json.dumps(
        {
            "queue": len(queue),
            "held": len(held),
            "out": str(OUT),
            "sample": queue[:8],
        },
        ensure_ascii=False,
        indent=2,
    )
)
