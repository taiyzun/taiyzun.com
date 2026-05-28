#!/usr/bin/env python3
"""Reusable BFP SYSTEM/FANS guest reconciliation workflow.

The latest SYSTEM CSV is treated as the source of truth for live System IDs.
Old workbook IDs are used only as weak decision hints and are never trusted
unless the ID is present in the current SYSTEM export.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import sys
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

import pandas as pd


SYSTEM_COLS = {
    "id": "id",
    "name": "name",
    "phone": "phone",
    "email": "email",
    "designation": "designation",
    "organisation": "organization",
    "status": "status_label",
    "award": "award_category",
    "champion": "champion_category",
    "photo": "photo_path",
}

FANS_COLS = {
    "name": "Name",
    "name_sort": "Name For Sort",
    "designation_company": "Designation, Company",
    "category_final": "Category Final",
    "category": "Category",
    "award": "Award Category (where applicable)",
    "phone": "Cell",
    "email": "email",
    "seat": "Seat 2pm",
}

TITLE_WORDS = {
    "mr",
    "mrs",
    "ms",
    "miss",
    "dr",
    "prof",
    "professor",
    "shri",
    "smt",
    "hon",
    "honble",
    "h",
    "e",
    "he",
    "her",
    "his",
    "excellency",
    "sir",
    "madam",
    "lord",
    "lady",
    "justice",
}

PLACEHOLDER_PATTERNS = [
    r"\bwalk[\s-]*in\b",
    r"^\s*guest\s*\d*\s*$",
    r"\bplaceholder\b",
    r"\bto\s*be\s*confirmed\b",
    r"\btbc\b",
    r"\btbd\b",
    r"\bxxx\b",
    r"\bmedia\b",
    r"\bunclear\b",
    r"\bunknown\b",
    r"\binterpreter\b",
    r"\baccompan(y|ying)\b",
    r"\boffice\s*delegate\b",
]

DUMMY_PHONE_DIGITS = {
    "",
    "0",
    "00",
    "0000000000",
    "1111111111",
    "1234567890",
    "9999999999",
    "9876543210",
}


@dataclass
class Candidate:
    system_index: int
    system_id: str
    score: float
    quality: str
    reasons: list[str]


def clean_text(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "null", "na", "n/a", "-", "--"}:
        return ""
    return re.sub(r"\s+", " ", text)


def strip_accents(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def normalise_text(value: Any) -> str:
    text = strip_accents(clean_text(value)).lower()
    text = text.replace("&", " and ")
    text = re.sub(r"['’`]", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalise_name(value: Any) -> str:
    text = normalise_text(value)
    words = [w for w in text.split() if w not in TITLE_WORDS]
    return " ".join(words)


def normalise_email(value: Any) -> str:
    return clean_text(value).lower()


def normalise_phone(value: Any) -> str:
    raw = clean_text(value)
    digits = re.sub(r"\D+", "", raw)
    if digits.startswith("00"):
        digits = digits[2:]
    return digits


def phone_variants(phone_digits: str) -> set[str]:
    variants = {phone_digits} if phone_digits else set()
    if len(phone_digits) == 10:
        variants.add(f"91{phone_digits}")
    if len(phone_digits) == 12 and phone_digits.startswith("91"):
        variants.add(phone_digits[2:])
    return variants


def phones_equivalent(left: str, right: str) -> bool:
    if not left or not right:
        return False
    return bool(phone_variants(left) & phone_variants(right))


def is_dummy_phone(phone_digits: str) -> bool:
    if phone_digits in DUMMY_PHONE_DIGITS:
        return True
    if len(phone_digits) < 7:
        return True
    if len(set(phone_digits)) == 1:
        return True
    if re.search(r"(00000|11111|22222|33333|44444|55555|66666|77777|88888|99999)", phone_digits):
        return True
    return False


def is_missing(value: Any) -> bool:
    return clean_text(value) == ""


def is_placeholder_row(name: str, category_final: str = "", category: str = "") -> tuple[bool, str]:
    combined = normalise_text(" ".join([name, category_final, category]))
    raw = clean_text(" ".join([name, category_final, category])).lower()
    for pattern in PLACEHOLDER_PATTERNS:
        if re.search(pattern, raw) or re.search(pattern, combined):
            return True, pattern.replace("\\b", "").replace("\\s*", " ").replace("\\s-", " ")
    return False, ""


def similarity(left: str, right: str) -> float:
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left, right).ratio() * 100


def headered_previous_sheet(path: Path, sheet: str) -> pd.DataFrame:
    raw = pd.read_excel(path, sheet_name=sheet, header=None, dtype=str)
    header_row = None
    for idx, row in raw.iterrows():
        values = {clean_text(v) for v in row.tolist()}
        if {"FANS Row", "FANS Name"} <= values:
            header_row = idx
            break
    if header_row is None:
        return pd.DataFrame()
    columns = [clean_text(v) or f"Unnamed {i}" for i, v in enumerate(raw.iloc[header_row].tolist())]
    data = raw.iloc[header_row + 1 :].copy()
    data.columns = columns
    return data.dropna(how="all")


def load_previous_decisions(path: Path | None) -> dict[str, dict[str, str]]:
    if not path or not path.exists():
        return {}

    decisions: dict[str, dict[str, str]] = {}
    for sheet in ["Action Queue", "FANS Not In System", "Review Link Conflicts", "Update Existing", "Mismatches"]:
        try:
            data = headered_previous_sheet(path, sheet)
        except Exception:
            continue
        if data.empty or "FANS Row" not in data.columns:
            continue
        for _, row in data.iterrows():
            fans_row = clean_text(row.get("FANS Row"))
            if not fans_row:
                continue
            existing = decisions.setdefault(fans_row, {})
            for key in [
                "Current Action",
                "Old Workbook Action",
                "Old System ID",
                "System ID",
                "Current Match Quality",
                "Corrections / Notes",
            ]:
                if key in data.columns and clean_text(row.get(key)) and key not in existing:
                    existing[key] = clean_text(row.get(key))
    return decisions


def expected_status(category_final: str, category: str) -> str:
    cf = normalise_text(category_final)
    cat = normalise_text(category)
    if "chief guest" in cat:
        return "Chief Guest"
    if "nobel laureate" in cat:
        return "Nobel Peace Laureates"
    if "chiefg accompany" in cat or "nobel accompany" in cat:
        return "Main accompanying guest - status to confirm"
    if "vip peace partner" in cf or "guest of honour" in cf:
        return "VIP I Am Peacekeeper Partner"
    if "late peace guest" in cf:
        return "I Am Peacekeeper SCOPE"
    if "i am peacekeeper" in cf or "awardee" in cat or "i am peacekeeper" in cat:
        return "I Am Peacekeeper Champion"
    if "event" in cf or "pr social media" in cat:
        return "I Am Peacekeeper ROPE"
    if "xxx" in cf or "xxx" in cat:
        return "XXX / not for automatic upload"
    return ""


def annotate_system(system: pd.DataFrame) -> pd.DataFrame:
    system = system.copy()
    system["_row"] = system.index + 2
    system["_name_norm"] = system[SYSTEM_COLS["name"]].map(normalise_name)
    system["_email_norm"] = system[SYSTEM_COLS["email"]].map(normalise_email)
    system["_phone_norm"] = system[SYSTEM_COLS["phone"]].map(normalise_phone)
    system["_designation_norm"] = system[SYSTEM_COLS["designation"]].map(normalise_text)
    system["_organisation_norm"] = system[SYSTEM_COLS["organisation"]].map(normalise_text)
    system["_status_norm"] = system[SYSTEM_COLS["status"]].map(normalise_text)
    return system


def annotate_fans(fans: pd.DataFrame) -> pd.DataFrame:
    fans = fans.copy()
    fans["_row"] = fans.index + 2
    fans["_name"] = fans[FANS_COLS["name"]].map(clean_text)
    fans["_name_norm"] = fans[FANS_COLS["name"]].map(normalise_name)
    fans["_email_norm"] = fans[FANS_COLS["email"]].map(normalise_email)
    fans["_phone_norm"] = fans[FANS_COLS["phone"]].map(normalise_phone)
    fans["_designation_company_norm"] = fans[FANS_COLS["designation_company"]].map(normalise_text)
    fans["_expected_status"] = [
        expected_status(row.get(FANS_COLS["category_final"], ""), row.get(FANS_COLS["category"], ""))
        for _, row in fans.iterrows()
    ]
    placeholders = [
        is_placeholder_row(
            row.get(FANS_COLS["name"], ""),
            row.get(FANS_COLS["category_final"], ""),
            row.get(FANS_COLS["category"], ""),
        )
        for _, row in fans.iterrows()
    ]
    fans["_is_placeholder"] = [item[0] for item in placeholders]
    fans["_placeholder_reason"] = [item[1] for item in placeholders]
    return fans


def candidate_for(fans_row: pd.Series, system_row: pd.Series, old_id: str, live_ids: set[str]) -> Candidate | None:
    reasons: list[str] = []
    score = 0.0
    name_score = similarity(fans_row["_name_norm"], system_row["_name_norm"])

    if fans_row["_email_norm"] and fans_row["_email_norm"] == system_row["_email_norm"]:
        score += 45
        reasons.append("EMAIL_EXACT")
    if (
        fans_row["_phone_norm"]
        and not is_dummy_phone(fans_row["_phone_norm"])
        and phones_equivalent(fans_row["_phone_norm"], system_row["_phone_norm"])
    ):
        score += 35
        reasons.append("MOBILE_EXACT")
    if fans_row["_name_norm"] and fans_row["_name_norm"] == system_row["_name_norm"]:
        score += 70
        reasons.append("NAME_EXACT")
    elif name_score >= 72:
        score += name_score * 0.7
        reasons.append("NAME_FUZZY")

    old_id_live = bool(old_id and old_id in live_ids)
    if old_id_live and old_id == clean_text(system_row[SYSTEM_COLS["id"]]):
        score += 10
        reasons.append("OLD_ID_LIVE_HINT")

    if fans_row["_designation_company_norm"]:
        des_score = max(
            similarity(fans_row["_designation_company_norm"], system_row["_designation_norm"]),
            similarity(fans_row["_designation_company_norm"], system_row["_organisation_norm"]),
        )
        if des_score >= 70:
            score += 5
            reasons.append("ROLE_OR_ORGANISATION_SIMILAR")

    expected = normalise_text(fans_row["_expected_status"])
    if expected and expected == system_row["_status_norm"]:
        score += 5
        reasons.append("STATUS_MATCH")

    if score <= 0:
        return None

    if "NAME_EXACT" in reasons and ("EMAIL_EXACT" in reasons or "MOBILE_EXACT" in reasons):
        quality = "CONTACT_AND_NAME_EXACT"
    elif "EMAIL_EXACT" in reasons or "MOBILE_EXACT" in reasons:
        quality = "CONTACT_EXACT_REVIEW_NAME"
    elif "NAME_EXACT" in reasons:
        quality = "NAME_EXACT"
    elif "NAME_FUZZY" in reasons:
        quality = "NAME_FUZZY"
    elif "OLD_ID_LIVE_HINT" in reasons:
        quality = "OLD_ID_LIVE_HINT_ONLY"
    else:
        quality = "WEAK_MATCH"
    return Candidate(int(system_row.name), clean_text(system_row[SYSTEM_COLS["id"]]), round(score, 1), quality, reasons)


def find_candidates(fans_row: pd.Series, system: pd.DataFrame, old_id: str, live_ids: set[str]) -> list[Candidate]:
    candidates: list[Candidate] = []
    for _, system_row in system.iterrows():
        candidate = candidate_for(fans_row, system_row, old_id, live_ids)
        if candidate:
            candidates.append(candidate)
    return sorted(candidates, key=lambda item: item.score, reverse=True)[:5]


def classify_match(fans_row: pd.Series, candidates: list[Candidate]) -> tuple[str, str]:
    if bool(fans_row["_is_placeholder"]):
        return "MANUAL_REVIEW", "PLACEHOLDER_OR_UNCLEAR"
    if not candidates:
        return "ADD_NEW", "NO_SYSTEM_MATCH"
    top = candidates[0]
    second = candidates[1].score if len(candidates) > 1 else 0
    gap = top.score - second
    if top.score >= 92 and gap >= 10:
        return "SAFE_MATCH", top.quality
    if "CONTACT_AND_NAME_EXACT" == top.quality and gap >= 5:
        return "SAFE_MATCH", top.quality
    if top.quality == "NAME_EXACT" and top.score >= 70 and len([c for c in candidates if c.quality == "NAME_EXACT"]) == 1 and gap >= 8:
        return "SAFE_MATCH", "NAME_EXACT_UNIQUE"
    return "MANUAL_REVIEW", f"UNCERTAIN_{top.quality}"


def compare_fields(fans_row: pd.Series, system_row: pd.Series) -> tuple[list[str], list[str]]:
    differences: list[str] = []
    notes: list[str] = []

    fans_phone = fans_row["_phone_norm"]
    system_phone = system_row["_phone_norm"]
    if fans_phone and not is_dummy_phone(fans_phone) and not phones_equivalent(fans_phone, system_phone):
        differences.append("Mobile differs")
        notes.append(f"Mobile: {clean_text(system_row[SYSTEM_COLS['phone']]) or '(blank)'} -> {clean_text(fans_row[FANS_COLS['phone']])}")

    fans_email = fans_row["_email_norm"]
    system_email = system_row["_email_norm"]
    if fans_email and fans_email != system_email:
        differences.append("Email differs")
        notes.append(f"Email: {clean_text(system_row[SYSTEM_COLS['email']]) or '(blank)'} -> {clean_text(fans_row[FANS_COLS['email']])}")

    fans_role = fans_row["_designation_company_norm"]
    system_role = normalise_text(" ".join([clean_text(system_row[SYSTEM_COLS["designation"]]), clean_text(system_row[SYSTEM_COLS["organisation"]])]))
    if fans_role and system_role and similarity(fans_role, system_role) < 72:
        differences.append("Designation/organisation differs")
        notes.append(
            "Designation/organisation: check system "
            f"'{clean_text(system_row[SYSTEM_COLS['designation']])} | {clean_text(system_row[SYSTEM_COLS['organisation']])}' "
            f"against FANS '{clean_text(fans_row[FANS_COLS['designation_company']])}'"
        )
    elif fans_role and not system_role:
        differences.append("Designation/organisation missing")
        notes.append(f"Designation/organisation: add or split from FANS '{clean_text(fans_row[FANS_COLS['designation_company']])}'")

    expected = clean_text(fans_row["_expected_status"])
    if expected and "not for automatic upload" not in expected.lower() and expected != clean_text(system_row[SYSTEM_COLS["status"]]):
        differences.append("Status differs")
        notes.append(f"Status: {clean_text(system_row[SYSTEM_COLS['status']]) or '(blank)'} -> {expected}")

    return differences, notes


def system_anomalies(system: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for _, row in system.iterrows():
        issues: list[tuple[str, str]] = []
        phone = row["_phone_norm"]
        if not phone:
            issues.append(("Medium", "Missing mobile"))
        elif is_dummy_phone(phone):
            issues.append(("High", "Dummy mobile number"))
        if not row["_email_norm"]:
            issues.append(("Medium", "Missing email"))
        if is_missing(row[SYSTEM_COLS["designation"]]):
            issues.append(("Medium", "Missing designation"))
        if is_missing(row[SYSTEM_COLS["organisation"]]):
            issues.append(("Medium", "Missing organisation"))
        if is_missing(row[SYSTEM_COLS["photo"]]):
            issues.append(("Medium", "Missing profile photo"))
        placeholder, reason = is_placeholder_row(row[SYSTEM_COLS["name"]], row[SYSTEM_COLS["status"]])
        if placeholder:
            issues.append(("High", f"Placeholder or unclear row ({reason})"))

        for severity, issue in issues:
            rows.append(
                {
                    "Severity": severity,
                    "Issue": issue,
                    "System ID": row[SYSTEM_COLS["id"]],
                    "CSV Row": row["_row"],
                    "System Name": row[SYSTEM_COLS["name"]],
                    "Status": row[SYSTEM_COLS["status"]],
                    "Mobile": row[SYSTEM_COLS["phone"]],
                    "Email": row[SYSTEM_COLS["email"]],
                    "Suggested Correction": "Fill or verify missing data. Do not delete automatically.",
                }
            )
    return rows


def duplicate_candidates(system: pd.DataFrame, fans: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []

    def add_groups(source: str, data: pd.DataFrame, key: str, label: str, valid=lambda x: bool(x)) -> None:
        groups = data[data[key].map(valid)].groupby(key)
        for normalised_key, group in groups:
            if len(group) < 2:
                continue
            rows.append(
                {
                    "Source": source,
                    "Severity": "High" if label in {"System ID", "Email", "Mobile"} else "Medium",
                    "Issue": f"Duplicate {label.lower()}",
                    "Normalised Key": normalised_key,
                    "Count": len(group),
                    "System IDs": ", ".join(clean_text(v) for v in group.get(SYSTEM_COLS["id"], pd.Series()).tolist()),
                    "Rows": ", ".join(str(int(v)) for v in group["_row"].tolist()),
                    "Names / Statuses": " | ".join(
                        f"{clean_text(r.get(SYSTEM_COLS['name'], r.get(FANS_COLS['name'], '')))} [{clean_text(r.get(SYSTEM_COLS['status'], r.get(FANS_COLS['category'], '')))}]"
                        for _, r in group.iterrows()
                    ),
                    "Phones": " | ".join(clean_text(v) for v in group.get(SYSTEM_COLS["phone"], group.get(FANS_COLS["phone"], pd.Series())).tolist()),
                    "Emails": " | ".join(clean_text(v) for v in group.get(SYSTEM_COLS["email"], group.get(FANS_COLS["email"], pd.Series())).tolist()),
                    "Suggested Correction": "Review and merge only after preserving audit, check-in and pass information.",
                }
            )

    add_groups("SYSTEM", system, SYSTEM_COLS["id"], "System ID")
    add_groups("SYSTEM", system, "_name_norm", "Name")
    add_groups("SYSTEM", system, "_email_norm", "Email")
    add_groups("SYSTEM", system, "_phone_norm", "Mobile", lambda x: bool(x) and not is_dummy_phone(x))
    add_groups("FANS", fans, "_name_norm", "Name")
    add_groups("FANS", fans, "_email_norm", "Email")
    add_groups("FANS", fans, "_phone_norm", "Mobile", lambda x: bool(x) and not is_dummy_phone(x))
    return pd.DataFrame(rows)


def expected_pass_subcategory(fans_row: pd.Series) -> str:
    award = clean_text(fans_row.get(FANS_COLS["award"]))
    if award:
        return award
    category_final = clean_text(fans_row.get(FANS_COLS["category_final"]))
    category = clean_text(fans_row.get(FANS_COLS["category"]))
    if normalise_text(category_final) in {"", "main", "event"}:
        return ""
    if normalise_text(category_final) in {"vip peace partner", "guest of honour"}:
        return "I Am Peacekeeper Partner"
    if normalise_text(category_final) == "i am peacekeeper":
        return category if category else category_final
    return category_final


def pass_category_checks(action_df: pd.DataFrame, system: pd.DataFrame, fans: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    system_by_id = {clean_text(row[SYSTEM_COLS["id"]]): row for _, row in system.iterrows()}
    fans_by_row = {int(row["_row"]): row for _, row in fans.iterrows()}

    for _, action in action_df.iterrows():
        system_id = clean_text(action.get("System ID"))
        fans_row_number = action.get("FANS Row")
        if not system_id or system_id not in system_by_id or pd.isna(fans_row_number):
            continue
        system_row = system_by_id[system_id]
        fans_row = fans_by_row.get(int(fans_row_number))
        if fans_row is None:
            continue

        expected_tier = clean_text(fans_row.get("_expected_status"))
        expected_subcategory = expected_pass_subcategory(fans_row)
        system_tier = clean_text(system_row.get(SYSTEM_COLS["status"]))
        system_award = clean_text(system_row.get(SYSTEM_COLS["award"]))
        system_champion = clean_text(system_row.get(SYSTEM_COLS["champion"]))

        issues: list[str] = []
        if expected_tier and "not for automatic upload" not in expected_tier.lower() and expected_tier != system_tier:
            issues.append("Pass tier/category differs")
        if expected_subcategory and expected_subcategory not in {system_award, system_champion}:
            issues.append("Pass subcategory differs")
        if system_tier in {"VIP I Am Peacekeeper Partner", "I Am Peacekeeper Champion"} and not (system_award or system_champion):
            issues.append("Pass subcategory missing")
        if clean_text(system_row.get("unique_pass_id")) == "":
            issues.append("Missing unique pass ID")
        if clean_text(system_row.get("pass_slug")) == "":
            issues.append("Missing pass slug")
        if clean_text(system_row.get("pass_pdf_path")) == "":
            issues.append("Missing pass PDF")
        if issues:
            rows.append(
                {
                    "Severity": "High" if "Pass tier/category differs" in issues else "Medium",
                    "Issue": "; ".join(issues),
                    "FANS Row": int(fans_row["_row"]),
                    "FANS Name": clean_text(fans_row.get(FANS_COLS["name"])),
                    "System ID": system_id,
                    "System Name": clean_text(system_row.get(SYSTEM_COLS["name"])),
                    "Expected Pass Tier": expected_tier,
                    "System Pass Tier": system_tier,
                    "Expected Pass Subcategory": expected_subcategory,
                    "System Award Category": system_award,
                    "System Champion Category": system_champion,
                    "Pass Slug": clean_text(system_row.get("pass_slug")),
                    "Unique Pass ID": clean_text(system_row.get("unique_pass_id")),
                    "View Count": clean_text(system_row.get("view_count")),
                    "First Checked In At": clean_text(system_row.get("first_checked_in_at")),
                    "Suggested Correction": "Review in Passes/Guest detail. Do not force category changes where the match is uncertain.",
                }
            )
    return pd.DataFrame(rows)


def pass_duplicate_removal_review(system: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    checks = [
        ("Name", "_name_norm", lambda value: bool(value)),
        ("Email", "_email_norm", lambda value: bool(value)),
        ("Mobile", "_phone_norm", lambda value: bool(value) and not is_dummy_phone(value)),
        ("Pass Slug", "pass_slug", lambda value: bool(clean_text(value))),
        ("Unique Pass ID", "unique_pass_id", lambda value: bool(clean_text(value))),
    ]

    for label, key, valid in checks:
        data = system[system[key].map(valid)]
        for normalised_key, group in data.groupby(key):
            if len(group) < 2:
                continue
            keep_hint = sorted(
                group.to_dict("records"),
                key=lambda row: (
                    bool(clean_text(row.get("first_checked_in_at"))),
                    int(clean_text(row.get("view_count")) or 0),
                    bool(clean_text(row.get("pass_pdf_path"))),
                ),
                reverse=True,
            )[0]
            group_id = f"{label}:{normalised_key}"
            for _, row in group.iterrows():
                rows.append(
                    {
                        "Duplicate Group": group_id,
                        "Duplicate Type": label,
                        "Normalised Key": normalised_key,
                        "System ID": clean_text(row.get(SYSTEM_COLS["id"])),
                        "System Name": clean_text(row.get(SYSTEM_COLS["name"])),
                        "Pass Tier": clean_text(row.get(SYSTEM_COLS["status"])),
                        "Award Category": clean_text(row.get(SYSTEM_COLS["award"])),
                        "Champion Category": clean_text(row.get(SYSTEM_COLS["champion"])),
                        "Mobile": clean_text(row.get(SYSTEM_COLS["phone"])),
                        "Email": clean_text(row.get(SYSTEM_COLS["email"])),
                        "Pass Slug": clean_text(row.get("pass_slug")),
                        "Unique Pass ID": clean_text(row.get("unique_pass_id")),
                        "Pass PDF": clean_text(row.get("pass_pdf_path")),
                        "View Count": clean_text(row.get("view_count")),
                        "First Checked In At": clean_text(row.get("first_checked_in_at")),
                        "Recommended Keep Candidate": clean_text(keep_hint.get(SYSTEM_COLS["id"])),
                        "Removal Action": "MANUAL_REVIEW_ONLY",
                        "Deletion Safe": "No",
                        "Notes": "Possible duplicate. Merge/remove only after preserving QR pass, PDF, audit, views and check-in data.",
                    }
                )
    return pd.DataFrame(rows)


def copy_for_clean_import(system_row: pd.Series, fans_row: pd.Series | None, system_columns: list[str], action: str) -> dict[str, Any]:
    out = {col: system_row.get(col, "") for col in system_columns}
    if fans_row is not None:
        if (
            clean_text(fans_row.get(FANS_COLS["phone"]))
            and not is_dummy_phone(fans_row["_phone_norm"])
            and not phones_equivalent(fans_row["_phone_norm"], system_row.get("_phone_norm", ""))
        ):
            out[SYSTEM_COLS["phone"]] = clean_text(fans_row.get(FANS_COLS["phone"]))
        if clean_text(fans_row.get(FANS_COLS["email"])):
            out[SYSTEM_COLS["email"]] = clean_text(fans_row.get(FANS_COLS["email"]))
        if is_missing(out.get(SYSTEM_COLS["designation"])) and clean_text(fans_row.get(FANS_COLS["designation_company"])):
            out[SYSTEM_COLS["designation"]] = clean_text(fans_row.get(FANS_COLS["designation_company"]))
        expected = clean_text(fans_row.get("_expected_status"))
        if expected and "not for automatic upload" not in expected.lower():
            out[SYSTEM_COLS["status"]] = expected
    return out


def new_row_from_fans(fans_row: pd.Series, system_columns: list[str]) -> dict[str, Any]:
    out = {col: "" for col in system_columns}
    out[SYSTEM_COLS["name"]] = clean_text(fans_row.get(FANS_COLS["name"]))
    out[SYSTEM_COLS["phone"]] = clean_text(fans_row.get(FANS_COLS["phone"]))
    out[SYSTEM_COLS["email"]] = clean_text(fans_row.get(FANS_COLS["email"]))
    out[SYSTEM_COLS["designation"]] = clean_text(fans_row.get(FANS_COLS["designation_company"]))
    out[SYSTEM_COLS["status"]] = clean_text(fans_row.get("_expected_status"))
    out[SYSTEM_COLS["award"]] = clean_text(fans_row.get(FANS_COLS["award"]))
    return out


def autosize_excel(writer: pd.ExcelWriter, sheet_names: list[str]) -> None:
    for sheet_name in sheet_names:
        ws = writer.book[sheet_name]
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
        for col in ws.columns:
            max_len = 0
            letter = col[0].column_letter
            for cell in col[:200]:
                max_len = max(max_len, len(clean_text(cell.value)))
            ws.column_dimensions[letter].width = min(max(max_len + 2, 10), 55)


def write_csv(path: Path, df: pd.DataFrame) -> None:
    df.to_csv(path, index=False, encoding="utf-8-sig", quoting=csv.QUOTE_MINIMAL)


def reconcile(system_path: Path, fans_path: Path, previous_path: Path | None, output_dir: Path) -> dict[str, Path]:
    system = annotate_system(pd.read_csv(system_path, dtype=str).fillna(""))
    fans = annotate_fans(pd.read_excel(fans_path, dtype=str).fillna(""))
    previous = load_previous_decisions(previous_path)
    live_ids = {clean_text(v) for v in system[SYSTEM_COLS["id"]].tolist()}

    action_rows: list[dict[str, Any]] = []
    update_existing: list[dict[str, Any]] = []
    add_new: list[dict[str, Any]] = []
    manual_review: list[dict[str, Any]] = []
    link_conflicts: list[dict[str, Any]] = []
    fans_not_in_system: list[dict[str, Any]] = []
    clean_import_rows: list[dict[str, Any]] = []
    matched_system_indices: set[int] = set()

    for _, fans_row in fans.iterrows():
        fans_row_number = str(int(fans_row["_row"]))
        old = previous.get(fans_row_number, {})
        old_id = clean_text(old.get("Old System ID") or old.get("System ID"))
        candidates = find_candidates(fans_row, system, old_id, live_ids)
        classification, quality = classify_match(fans_row, candidates)
        top = candidates[0] if candidates else None
        second = candidates[1] if len(candidates) > 1 else None
        system_row = system.loc[top.system_index] if top else None

        differences: list[str] = []
        notes: list[str] = []
        if system_row is not None:
            differences, notes = compare_fields(fans_row, system_row)

        link_conflict = ""
        if old_id and old_id in live_ids and top and old_id != top.system_id:
            old_name = clean_text(system.loc[system[SYSTEM_COLS["id"]] == old_id, SYSTEM_COLS["name"]].head(1).squeeze())
            link_conflict = (
                f"Old workbook linked {old_id} / {old_name or '(name unavailable)'}; "
                f"current best is {top.system_id} / {clean_text(system_row[SYSTEM_COLS['name']])}"
            )
            classification = "MANUAL_REVIEW"
            quality = "LINK_CONFLICT"

        placeholder_note = ""
        if bool(fans_row["_is_placeholder"]):
            placeholder_note = f"Placeholder/unclear FANS row: {fans_row['_placeholder_reason']}. Never auto-add."

        action = {
            "Current Action": classification,
            "FANS Row": int(fans_row["_row"]),
            "FANS Name": clean_text(fans_row.get(FANS_COLS["name"])),
            "FANS Category Final": clean_text(fans_row.get(FANS_COLS["category_final"])),
            "FANS Category": clean_text(fans_row.get(FANS_COLS["category"])),
            "Expected Status": clean_text(fans_row.get("_expected_status")),
            "System ID": top.system_id if top else "",
            "CSV Row": int(system_row["_row"]) if system_row is not None else "",
            "System Name": clean_text(system_row[SYSTEM_COLS["name"]]) if system_row is not None else "",
            "System Status": clean_text(system_row[SYSTEM_COLS["status"]]) if system_row is not None else "",
            "Current Match Quality": quality,
            "Score": top.score if top else "",
            "Differences": "; ".join(differences),
            "Corrections / Notes": "; ".join([*notes, placeholder_note, clean_text(old.get("Corrections / Notes"))]).strip("; "),
            "Link Conflict": link_conflict,
            "Old Workbook Action": clean_text(old.get("Current Action") or old.get("Old Workbook Action")),
            "Old System ID": old_id,
            "Second Candidate": f"{second.system_id} / {clean_text(system.loc[second.system_index, SYSTEM_COLS['name']])}" if second else "",
            "Second Score": second.score if second else "",
            "FANS Phone": clean_text(fans_row.get(FANS_COLS["phone"])),
            "FANS Email": clean_text(fans_row.get(FANS_COLS["email"])),
            "System Phone": clean_text(system_row[SYSTEM_COLS["phone"]]) if system_row is not None else "",
            "System Email": clean_text(system_row[SYSTEM_COLS["email"]]) if system_row is not None else "",
            "FANS Designation/Company": clean_text(fans_row.get(FANS_COLS["designation_company"])),
            "System Designation/Organisation": (
                f"{clean_text(system_row[SYSTEM_COLS['designation']])} | {clean_text(system_row[SYSTEM_COLS['organisation']])}"
                if system_row is not None
                else ""
            ),
            "FANS Award Category": clean_text(fans_row.get(FANS_COLS["award"])),
            "System Award Category": clean_text(system_row[SYSTEM_COLS["award"]]) if system_row is not None else "",
            "System Champion Category": clean_text(system_row[SYSTEM_COLS["champion"]]) if system_row is not None else "",
        }
        action_rows.append(action)

        if link_conflict:
            link_conflicts.append(action)
        if classification == "SAFE_MATCH":
            matched_system_indices.add(top.system_index)
            if differences:
                update_existing.append(action)
                clean_import_rows.append(copy_for_clean_import(system_row, fans_row, list(pd.read_csv(system_path, nrows=0).columns), "UPDATE_EXISTING"))
            else:
                action["Current Action"] = "NO_ACTION"
        elif classification == "ADD_NEW":
            add_new.append(action)
            fans_not_in_system.append(action)
            clean_import_rows.append(new_row_from_fans(fans_row, list(pd.read_csv(system_path, nrows=0).columns)))
        else:
            manual_review.append(action)
            fans_not_in_system.append(action)

    system_not_in_fans: list[dict[str, Any]] = []
    for _, row in system[~system.index.isin(matched_system_indices)].iterrows():
        nearest = max(
            ((similarity(row["_name_norm"], fans_row["_name_norm"]), fans_row) for _, fans_row in fans.iterrows()),
            key=lambda item: item[0],
            default=(0, None),
        )
        flags = []
        if not row["_phone_norm"]:
            flags.append("Missing mobile")
        elif is_dummy_phone(row["_phone_norm"]):
            flags.append("Dummy mobile")
        if not row["_email_norm"]:
            flags.append("Missing email")
        placeholder, _ = is_placeholder_row(row[SYSTEM_COLS["name"]], row[SYSTEM_COLS["status"]])
        if placeholder:
            flags.append("Placeholder or unclear")
        system_not_in_fans.append(
            {
                "Action": "REVIEW_KEEP_REMOVE_OR_MAP",
                "System ID": row[SYSTEM_COLS["id"]],
                "CSV Row": int(row["_row"]),
                "System Name": row[SYSTEM_COLS["name"]],
                "Status": row[SYSTEM_COLS["status"]],
                "Mobile": row[SYSTEM_COLS["phone"]],
                "Email": row[SYSTEM_COLS["email"]],
                "Designation": row[SYSTEM_COLS["designation"]],
                "Organisation": row[SYSTEM_COLS["organisation"]],
                "Award Category": row[SYSTEM_COLS["award"]],
                "Champion Category": row[SYSTEM_COLS["champion"]],
                "Flags": "; ".join(flags),
                "Nearest FANS Row": int(nearest[1]["_row"]) if nearest[1] is not None else "",
                "Nearest FANS Name": clean_text(nearest[1][FANS_COLS["name"]]) if nearest[1] is not None else "",
                "Nearest Score": round(nearest[0], 1),
                "Notes": "System-only record. Do not delete automatically.",
            }
        )

    duplicates = duplicate_candidates(system, fans)
    anomalies = pd.DataFrame(system_anomalies(system))
    action_df = pd.DataFrame(action_rows)
    pass_category_df = pass_category_checks(action_df, system, fans)
    pass_duplicate_removal_df = pass_duplicate_removal_review(system)
    action_columns = list(action_df.columns)
    update_df = pd.DataFrame(update_existing).reindex(columns=action_columns)
    add_df = pd.DataFrame(add_new).reindex(columns=action_columns)
    manual_df = pd.DataFrame(manual_review).reindex(columns=action_columns)
    link_df = pd.DataFrame(link_conflicts).reindex(columns=action_columns)
    fans_not_df = pd.DataFrame(fans_not_in_system).reindex(columns=action_columns)
    system_not_df = pd.DataFrame(system_not_in_fans)
    clean_import_df = pd.DataFrame(clean_import_rows, columns=list(pd.read_csv(system_path, nrows=0).columns))

    summary_rows = [
        ("Generated", dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        ("System CSV source", system_path.name),
        ("FANS source", fans_path.name),
        ("Previous decision base", previous_path.name if previous_path else "Not supplied"),
        ("System rows", len(system)),
        ("FANS rows", len(fans)),
        ("Safe updates", len(update_df)),
        ("Add new candidates", len(add_df)),
        ("Manual review rows", len(manual_df)),
        ("Review link conflicts", len(link_df)),
        ("System not in FANS", len(system_not_df)),
        ("FANS not in System", len(fans_not_df)),
        ("Duplicate candidate groups", len(duplicates)),
        ("Pass category check rows", len(pass_category_df)),
        ("Pass duplicate removal review rows", len(pass_duplicate_removal_df)),
        ("System anomaly rows", len(anomalies)),
        ("Rule", "Latest SYSTEM CSV is source of truth for live System IDs."),
        ("Rule", "Never delete system-only records automatically."),
        ("Rule", "Never auto-add placeholder, Walk-In, XXX, media or unclear rows."),
        ("Rule", "Every uncertain match is routed to Manual Review."),
    ]
    summary_df = pd.DataFrame(summary_rows, columns=["Metric", "Value"])

    instructions_df = pd.DataFrame(
        [
            ["1", "Start with Review Link Conflicts.", "Confirm the correct live System ID before editing either record."],
            ["2", "Resolve Duplicate Candidates.", "Merge or inactivate only after preserving audit, check-in and pass data."],
            ["3", "Review Pass Category Checks.", "Correct pass tier/subcategory only when the FANS match and live System ID are certain."],
            ["4", "Review Pass Duplicate Removal.", "Do not delete from Passes automatically; preserve QR pass, PDF, audit, views and check-in data first."],
            ["5", "Work through Manual Review.", "Do not upload uncertain matches until a human confirms the mapping."],
            ["6", "Apply Update Existing.", "Use current System IDs only. Do not rely on old FANS workbook IDs."],
            ["7", "Review Add New.", "Only add genuine people. Exclude placeholders, Walk-In rows, XXX, media and unclear rows."],
            ["8", "Use Clean Import CSV carefully.", "It contains safe update rows plus non-placeholder add-new candidates; validate in Dure before committing."],
            ["9", "Review System Not In FANS.", "Keep, map or manually remove as appropriate. Never delete automatically."],
        ],
        columns=["Step", "Dure Upload Instruction", "Notes"],
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "clean_import_csv": output_dir / "Clean Import CSV.csv",
        "update_existing_csv": output_dir / "Update Existing.csv",
        "add_new_csv": output_dir / "Add New.csv",
        "manual_review_csv": output_dir / "Manual Review.csv",
        "review_link_conflicts_csv": output_dir / "Review Link Conflicts.csv",
        "system_not_in_fans_csv": output_dir / "System Not In FANS.csv",
        "fans_not_in_system_csv": output_dir / "FANS Not In System.csv",
        "duplicate_candidates_csv": output_dir / "Duplicate Candidates.csv",
        "pass_category_checks_csv": output_dir / "Pass Category Checks.csv",
        "pass_duplicate_removal_csv": output_dir / "Pass Duplicate Removal Review.csv",
        "summary_report_csv": output_dir / "Summary Report.csv",
        "dure_upload_instructions_csv": output_dir / "Dure Upload Instructions.csv",
        "workbook": output_dir / "BFP Guest Data Reconciliation.xlsx",
    }

    write_csv(outputs["clean_import_csv"], clean_import_df)
    write_csv(outputs["update_existing_csv"], update_df)
    write_csv(outputs["add_new_csv"], add_df)
    write_csv(outputs["manual_review_csv"], manual_df)
    write_csv(outputs["review_link_conflicts_csv"], link_df)
    write_csv(outputs["system_not_in_fans_csv"], system_not_df)
    write_csv(outputs["fans_not_in_system_csv"], fans_not_df)
    write_csv(outputs["duplicate_candidates_csv"], duplicates)
    write_csv(outputs["pass_category_checks_csv"], pass_category_df)
    write_csv(outputs["pass_duplicate_removal_csv"], pass_duplicate_removal_df)
    write_csv(outputs["summary_report_csv"], summary_df)
    write_csv(outputs["dure_upload_instructions_csv"], instructions_df)

    with pd.ExcelWriter(outputs["workbook"], engine="openpyxl") as writer:
        sheets = {
            "Summary Report": summary_df,
            "Dure Upload Instructions": instructions_df,
            "Clean Import CSV": clean_import_df,
            "Update Existing": update_df,
            "Add New": add_df,
            "Manual Review": manual_df,
            "Review Link Conflicts": link_df,
            "System Not In FANS": system_not_df,
            "FANS Not In System": fans_not_df,
            "Duplicate Candidates": duplicates,
            "Pass Category Checks": pass_category_df,
            "Pass Duplicate Removal": pass_duplicate_removal_df,
            "CSV Anomalies": anomalies,
            "Action Queue": action_df,
        }
        for sheet_name, df in sheets.items():
            df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
        autosize_excel(writer, [name[:31] for name in sheets])

    return outputs


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Reconcile BFP SYSTEM CSV against FANS Excel workbook.")
    parser.add_argument("--system-csv", required=True, type=Path, help="Latest SYSTEM CSV export.")
    parser.add_argument("--fans-xlsx", required=True, type=Path, help="Latest FANS/FANA Excel file.")
    parser.add_argument("--previous-workbook", type=Path, help="Previous clean reconciliation workbook.")
    parser.add_argument("--output-dir", type=Path, help="Output directory. Defaults to outputs/bfp_guest_reconciliation_<timestamp>.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir = args.output_dir or Path.cwd() / "outputs" / f"bfp_guest_reconciliation_{timestamp}"
    outputs = reconcile(args.system_csv, args.fans_xlsx, args.previous_workbook, output_dir)
    print(f"Wrote reconciliation outputs to: {output_dir}")
    for name, path in outputs.items():
        print(f"{name}: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
