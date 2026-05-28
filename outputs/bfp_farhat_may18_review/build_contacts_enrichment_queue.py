#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

BASE = Path("/Users/tai/Documents/GitHub/taiyzun.com/outputs/bfp_farhat_may18_review")
SYSTEM_CSV = Path("/Users/tai/Downloads/guests-2026-05-17-658.csv")
CONTACTS_VCF = Path(
    "/Users/tai/Library/Mobile Documents/com~apple~CloudDocs/Contacts/"
    "Mr Taiyzun Shabbir Shahpurwala and 14,671 others.vcf"
)

OUT_CONTACTS = BASE / "contacts_index_summary.json"
OUT_SAFE_JSON = BASE / "contacts_safe_enrichment_queue.json"
OUT_SAFE_CSV = BASE / "contacts_safe_enrichment_queue.csv"
OUT_REVIEW_CSV = BASE / "contacts_manual_review.csv"
OUT_SUMMARY = BASE / "contacts_enrichment_summary.json"

HONORIFICS = {
    "mr",
    "mrs",
    "ms",
    "miss",
    "dr",
    "prof",
    "professor",
    "hon",
    "honble",
    "hon'ble",
    "shri",
    "smt",
    "he",
    "h.e",
    "adv",
    "advocate",
    "padma",
    "padmashri",
    "capt",
    "captain",
    "molvi",
    "maulana",
    "respected",
    "sardar",
}


def clean_text(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("\\n", " ").replace("\\,", ",").replace("\\;", ";")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def norm_name(value: str | None) -> str:
    value = clean_text(value)
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower()
    value = value.replace("’", "'")
    value = re.sub(r"[^a-z0-9']+", " ", value)
    parts = [p for p in value.split() if p not in HONORIFICS]
    return " ".join(parts)


def is_placeholder_phone(value: str | None) -> bool:
    digits = re.sub(r"\D+", "", value or "")
    if not digits:
        return True
    local = digits[2:] if digits.startswith("91") and len(digits) > 10 else digits
    return (
        len(local) < 8
        or re.fullmatch(r"0{6,}\d{0,4}", local) is not None
        or re.fullmatch(r"9{6,}\d{0,4}", local) is not None
        or local in {"1234567890", "1111111111", "2222222222"}
    )


def normalise_phone(value: str | None) -> str:
    if not value:
        return ""
    raw = clean_text(value)
    if raw.startswith("00"):
        raw = "+" + raw[2:]
    digits = re.sub(r"\D+", "", raw)
    if not digits:
        return ""
    if raw.strip().startswith("+"):
        candidate = "+" + digits
    elif len(digits) == 10 and digits[0] in "6789":
        candidate = "+91" + digits
    elif len(digits) >= 11:
        candidate = "+" + digits
    else:
        return ""
    if not re.fullmatch(r"\+\d{8,15}", candidate):
        return ""
    if is_placeholder_phone(candidate):
        return ""
    return candidate


def normalise_email(value: str | None) -> str:
    email = clean_text(value).lower()
    if re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return email
    return ""


def is_generic_email(email: str) -> bool:
    local = email.split("@", 1)[0].lower()
    return local in {
        "info",
        "contact",
        "customercare",
        "customer",
        "support",
        "careers",
        "career",
        "office",
        "admin",
        "enquiry",
        "enquiries",
        "investor_relations",
        "pqa",
    }


def field_name(line: str) -> str:
    return line.split(":", 1)[0].split(";", 1)[0].split(".", 1)[-1].upper()


def field_value(line: str) -> str:
    return line.split(":", 1)[1] if ":" in line else ""


def parse_vcf(path: Path) -> list[dict]:
    contacts: list[dict] = []
    card: dict | None = None
    current_line = ""
    skipping_blob = False

    def flush_line(line: str) -> None:
        nonlocal card
        if card is None or ":" not in line:
            return
        name = field_name(line)
        value = field_value(line)
        if name == "FN":
            card["fn"] = clean_text(value)
        elif name == "N":
            pieces = [clean_text(p) for p in value.split(";")]
            display = " ".join(p for p in [pieces[3] if len(pieces) > 3 else "", pieces[1] if len(pieces) > 1 else "", pieces[2] if len(pieces) > 2 else "", pieces[0] if pieces else ""] if p)
            card["n_display"] = display.strip()
        elif name == "ORG":
            org = " | ".join(p for p in (clean_text(p) for p in value.split(";")) if p)
            if org:
                card["orgs"].append(org)
        elif name == "TITLE":
            title = clean_text(value)
            if title:
                card["titles"].append(title)
        elif name == "EMAIL":
            email = normalise_email(value)
            if email:
                card["emails"].append(email)
        elif name == "TEL":
            phone = normalise_phone(value)
            if phone:
                card["phones"].append(phone)

    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        for raw in handle:
            line = raw.rstrip("\r\n")
            if line.startswith((" ", "\t")):
                if skipping_blob:
                    continue
                current_line += line[1:]
                continue
            if current_line:
                flush_line(current_line)
            current_line = ""
            skipping_blob = False

            upper = line.upper()
            if upper == "BEGIN:VCARD":
                card = {"fn": "", "n_display": "", "phones": [], "emails": [], "titles": [], "orgs": []}
            elif upper == "END:VCARD":
                if card:
                    if not card["fn"]:
                        card["fn"] = card["n_display"]
                    card["phones"] = sorted(set(card["phones"]))
                    card["emails"] = sorted(set(card["emails"]))
                    card["titles"] = sorted(set(card["titles"]))
                    card["orgs"] = sorted(set(card["orgs"]))
                    if card["fn"] and (card["phones"] or card["emails"] or card["titles"] or card["orgs"]):
                        contacts.append(card)
                card = None
            elif upper.startswith(("PHOTO", "LOGO", "SOUND")):
                skipping_blob = True
            else:
                current_line = line
    return contacts


def split_designation_company(value: str | None) -> tuple[str, str]:
    value = clean_text(value)
    if not value:
        return "", ""
    # Contacts titles are generally the cleanest source for designation.
    return value, ""


def load_system_guests() -> list[dict]:
    with SYSTEM_CSV.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def needs_value(value: str | None, field: str) -> bool:
    if not clean_text(value):
        return True
    if field == "phone":
        return is_placeholder_phone(value)
    if field == "email":
        return normalise_email(value) == ""
    lowered = clean_text(value).lower()
    return lowered in {"na", "n/a", "tbc", "tbd", "unknown", "xxx", "placeholder", "media", "walk-in guest"}


def guest_display_name(row: dict) -> str:
    return clean_text(" ".join(p for p in [row.get("honorific", ""), row.get("name", "")] if p))


def main() -> None:
    BASE.mkdir(parents=True, exist_ok=True)
    contacts = parse_vcf(CONTACTS_VCF)
    by_name: dict[str, list[dict]] = defaultdict(list)
    by_phone: dict[str, list[dict]] = defaultdict(list)
    by_email: dict[str, list[dict]] = defaultdict(list)
    for contact in contacts:
        keys = {norm_name(contact.get("fn")), norm_name(contact.get("n_display"))}
        for key in keys:
            if key:
                by_name[key].append(contact)
        for phone in contact["phones"]:
            by_phone[phone].append(contact)
        for email in contact["emails"]:
            by_email[email].append(contact)

    guests = load_system_guests()
    safe: list[dict] = []
    review: list[dict] = []
    for guest in guests:
        name_keys = {norm_name(guest.get("name")), norm_name(guest_display_name(guest))}
        candidates: list[dict] = []
        reasons: list[str] = []
        for key in name_keys:
            if key:
                candidates.extend(by_name.get(key, []))
        phone = normalise_phone(guest.get("phone"))
        email = normalise_email(guest.get("email"))
        if phone and by_phone.get(phone):
            candidates.extend(by_phone[phone])
            reasons.append("existing phone matched contact")
        if email and by_email.get(email):
            candidates.extend(by_email[email])
            reasons.append("existing email matched contact")

        dedup = {}
        for contact in candidates:
            key = (contact["fn"], tuple(contact["phones"]), tuple(contact["emails"]))
            dedup[key] = contact
        candidates = list(dedup.values())
        if not candidates:
            continue

        exact_name_contacts = []
        for contact in candidates:
            if norm_name(contact.get("fn")) in name_keys or norm_name(contact.get("n_display")) in name_keys:
                exact_name_contacts.append(contact)
        if len(candidates) > 1 and not reasons:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "multiple contact records with same normalised name",
                    "contacts": candidates[:6],
                }
            )
            continue
        if len(exact_name_contacts) != 1:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "contact matched by phone/email only; name does not match exactly",
                    "system_phone": guest.get("phone", ""),
                    "system_email": guest.get("email", ""),
                    "contacts": candidates[:6],
                }
            )
            continue
        contact = exact_name_contacts[0]

        caution = []
        if len(contact["phones"]) > 3:
            caution.append("contact has many phone numbers")
        if len(contact["emails"]) > 4:
            caution.append("contact has many email addresses")

        changes: dict[str, str] = {}
        notes: list[str] = []
        if needs_value(guest.get("phone"), "phone") and contact["phones"] and len(contact["phones"]) <= 3:
            changes["phone"] = contact["phones"][0]
            notes.append("filled missing or placeholder phone from Contacts")
        elif needs_value(guest.get("phone"), "phone") and contact["phones"]:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "contact has too many phone numbers to choose safely",
                    "contact_phones": contact["phones"],
                    "contact": contact,
                }
            )
        elif contact["phones"] and normalise_phone(guest.get("phone")) and normalise_phone(guest.get("phone")) not in contact["phones"]:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "phone differs between system and contact; not overwritten",
                    "system_phone": guest.get("phone", ""),
                    "contact_phones": contact["phones"],
                    "contact": contact,
                }
            )

        usable_emails = [e for e in contact["emails"] if not is_generic_email(e)]
        if needs_value(guest.get("email"), "email") and usable_emails:
            changes["email"] = usable_emails[0]
            notes.append("filled missing email from Contacts")
        elif needs_value(guest.get("email"), "email") and contact["emails"]:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "only generic contact emails available",
                    "contact_emails": contact["emails"],
                    "contact": contact,
                }
            )
        elif contact["emails"] and normalise_email(guest.get("email")) and normalise_email(guest.get("email")) not in contact["emails"]:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "email differs between system and contact; not overwritten",
                    "system_email": guest.get("email", ""),
                    "contact_emails": contact["emails"],
                    "contact": contact,
                }
            )

        if needs_value(guest.get("designation"), "designation") and contact["titles"]:
            changes["designation"] = contact["titles"][0]
            notes.append("filled missing designation from Contacts")
        if needs_value(guest.get("organization"), "organization") and contact["orgs"]:
            changes["organization"] = contact["orgs"][0]
            notes.append("filled missing organisation from Contacts")

        if changes and not caution:
            safe.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "status_label": guest.get("status_label", ""),
                    "current": {
                        "phone": guest.get("phone", ""),
                        "email": guest.get("email", ""),
                        "designation": guest.get("designation", ""),
                        "organization": guest.get("organization", ""),
                    },
                    "changes": changes,
                    "contact": contact,
                    "notes": "; ".join(notes),
                }
            )
        elif changes:
            review.append(
                {
                    "system_id": guest["id"],
                    "guest_name": guest_display_name(guest),
                    "reason": "; ".join(caution),
                    "proposed_changes": changes,
                    "contact": contact,
                }
            )

    OUT_CONTACTS.write_text(
        json.dumps(
            {
                "contacts_parsed": len(contacts),
                "unique_name_keys": len(by_name),
                "unique_phones": len(by_phone),
                "unique_emails": len(by_email),
            },
            indent=2,
        )
    )
    OUT_SAFE_JSON.write_text(json.dumps(safe, indent=2, ensure_ascii=False))

    with OUT_SAFE_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "system_id",
                "guest_name",
                "status_label",
                "changes",
                "contact_name",
                "contact_phones",
                "contact_emails",
                "contact_titles",
                "contact_orgs",
                "notes",
            ]
        )
        for item in safe:
            contact = item["contact"]
            writer.writerow(
                [
                    item["system_id"],
                    item["guest_name"],
                    item["status_label"],
                    json.dumps(item["changes"], ensure_ascii=False),
                    contact["fn"],
                    "; ".join(contact["phones"]),
                    "; ".join(contact["emails"]),
                    "; ".join(contact["titles"]),
                    "; ".join(contact["orgs"]),
                    item["notes"],
                ]
            )

    with OUT_REVIEW_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["system_id", "guest_name", "reason", "details"])
        for item in review:
            writer.writerow(
                [
                    item.get("system_id", ""),
                    item.get("guest_name", ""),
                    item.get("reason", ""),
                    json.dumps(item, ensure_ascii=False),
                ]
            )

    OUT_SUMMARY.write_text(
        json.dumps(
            {
                "contacts_parsed": len(contacts),
                "system_guests_checked": len(guests),
                "safe_enrichment_rows": len(safe),
                "manual_review_rows": len(review),
                "outputs": {
                    "safe_json": str(OUT_SAFE_JSON),
                    "safe_csv": str(OUT_SAFE_CSV),
                    "manual_review_csv": str(OUT_REVIEW_CSV),
                },
            },
            indent=2,
        )
    )
    print(OUT_SUMMARY.read_text())


if __name__ == "__main__":
    main()
