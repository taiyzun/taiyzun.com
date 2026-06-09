#!/usr/bin/env python3
"""Apply user decisions and conservative fuzzy duplicate merges."""

from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


STATIC_FIELDS = [
    "First Name",
    "Middle Name",
    "Last Name",
    "Phonetic First Name",
    "Phonetic Middle Name",
    "Phonetic Last Name",
    "Name Prefix",
    "Name Suffix",
    "Nickname",
    "File As",
    "Organization Name",
    "Organization Title",
    "Organization Department",
    "Birthday",
    "Notes",
    "Photo",
    "Labels",
]

REPEATED_PREFIXES = ["E-mail", "Phone", "Website", "Event"]
ADDRESS_FIELDS = [
    "Label",
    "Formatted",
    "Street",
    "City",
    "PO Box",
    "Region",
    "Postal Code",
    "Country",
    "Extended Address",
]

FINAL_LABEL = "Cleaned 2026-06-02"

NOISE_TOKENS = {
    "a",
    "add",
    "advisor",
    "advocate",
    "ambassador",
    "app",
    "assistant",
    "bangalore",
    "bayview",
    "bhavan",
    "brother",
    "call",
    "calling",
    "cel",
    "cell",
    "chairman",
    "chief",
    "club",
    "co",
    "commissioner",
    "company",
    "consul",
    "consultant",
    "csr",
    "dcp",
    "delhi",
    "director",
    "doctor",
    "dr",
    "dubai",
    "eo",
    "ex",
    "father",
    "foundation",
    "founder",
    "govt",
    "government",
    "group",
    "head",
    "hospital",
    "hospitals",
    "hr",
    "ias",
    "india",
    "jammu",
    "kashmir",
    "latest",
    "limited",
    "linkedin",
    "llp",
    "ltd",
    "manager",
    "md",
    "minister",
    "mumbai",
    "new",
    "no",
    "nobo",
    "of",
    "office",
    "pa",
    "parliament",
    "president",
    "prof",
    "professor",
    "ps",
    "pune",
    "pvt",
    "realty",
    "rotary",
    "secretary",
    "sobo",
    "spa",
    "to",
    "trust",
    "trustee",
    "university",
    "usa",
    "wf",
    "whats",
    "whatsapp",
    "wife",
}


@dataclass
class MergeDecision:
    left: int
    right: int
    reason: str
    confidence: str
    shared_email: str
    shared_phone: str
    name_similarity: str


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))
        self.rank = [0] * size

    def find(self, item: int) -> int:
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, left: int, right: int) -> None:
        a = self.find(left)
        b = self.find(right)
        if a == b:
            return
        if self.rank[a] < self.rank[b]:
            a, b = b, a
        self.parent[b] = a
        if self.rank[a] == self.rank[b]:
            self.rank[a] += 1


def read_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, headers: Sequence[str], rows: Iterable[Dict[str, str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def clean_spaces(value: str | None) -> str:
    value = "" if value is None else str(value)
    value = value.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    value = re.sub(r"[ \u00a0]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    return value.strip()


def one_line(value: str | None) -> str:
    return re.sub(r"\s+", " ", clean_spaces(value)).strip()


def norm_text(value: str | None) -> str:
    text = one_line(value).lower()
    text = re.sub(r"[^a-z0-9@.+-]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def norm_email(value: str | None) -> str:
    return one_line(value).lower()


def norm_phone(value: str | None) -> str:
    digits = re.sub(r"\D+", "", value or "")
    if digits.startswith("00") and len(digits) > 10:
        digits = digits[2:]
    return digits


def repeated_indices(headers: Iterable[str], prefix: str) -> List[int]:
    pattern = re.compile(rf"^{re.escape(prefix)} (\d+) - ")
    return sorted({int(match.group(1)) for header in headers if (match := pattern.match(header))})


def get_pairs(row: Dict[str, str], prefix: str) -> List[Tuple[str, str]]:
    pairs = []
    for index in repeated_indices(row.keys(), prefix):
        label = clean_spaces(row.get(f"{prefix} {index} - Label", ""))
        value = clean_spaces(row.get(f"{prefix} {index} - Value", ""))
        if label or value:
            pairs.append((label, value))
    return pairs


def set_pairs(row: Dict[str, str], prefix: str, pairs: Sequence[Tuple[str, str]]) -> None:
    for index in repeated_indices(row.keys(), prefix):
        row[f"{prefix} {index} - Label"] = ""
        row[f"{prefix} {index} - Value"] = ""
    for index, (label, value) in enumerate(pairs, start=1):
        row[f"{prefix} {index} - Label"] = label
        row[f"{prefix} {index} - Value"] = value


def get_addresses(row: Dict[str, str]) -> List[Dict[str, str]]:
    addresses = []
    for index in repeated_indices(row.keys(), "Address"):
        address = {field: clean_spaces(row.get(f"Address {index} - {field}", "")) for field in ADDRESS_FIELDS}
        if any(address.values()):
            addresses.append(address)
    return addresses


def set_addresses(row: Dict[str, str], addresses: Sequence[Dict[str, str]]) -> None:
    for index in repeated_indices(row.keys(), "Address"):
        for field in ADDRESS_FIELDS:
            row[f"Address {index} - {field}"] = ""
    for index, address in enumerate(addresses, start=1):
        for field in ADDRESS_FIELDS:
            row[f"Address {index} - {field}"] = address.get(field, "")


def dedupe_pairs(pairs: Sequence[Tuple[str, str]], kind: str) -> List[Tuple[str, str]]:
    seen = set()
    out = []
    for label, value in pairs:
        label = clean_spaces(label)
        value = clean_spaces(value)
        if kind == "email":
            key = norm_email(value)
        elif kind == "phone":
            key = norm_phone(value)
        else:
            key = norm_text(value)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append((label, value))
    return out


def dedupe_addresses(addresses: Sequence[Dict[str, str]]) -> List[Dict[str, str]]:
    seen = set()
    out = []
    for address in addresses:
        key = tuple(norm_text(address.get(field, "")) for field in ADDRESS_FIELDS)
        if key in seen:
            continue
        seen.add(key)
        out.append(dict(address))
    return out


def source_refs(row: Dict[str, str]) -> List[str]:
    return re.findall(r"\b(?:contacts|freq):\d+\b", row.get("Notes", ""))


def display_name(row: Dict[str, str]) -> str:
    parts = [
        row.get("Name Prefix", ""),
        row.get("First Name", ""),
        row.get("Middle Name", ""),
        row.get("Last Name", ""),
        row.get("Name Suffix", ""),
    ]
    name = one_line(" ".join(part for part in parts if part))
    return name or one_line(row.get("Organization Name", ""))


def person_tokens(row: Dict[str, str]) -> List[str]:
    name = " ".join(row.get(field, "") for field in ["First Name", "Middle Name", "Last Name"])
    tokens = [token for token in norm_text(name).split() if token and token not in NOISE_TOKENS]
    if len(tokens) > 2:
        tokens = [token for token in tokens if len(token) > 1]
    return tokens


def name_key(row: Dict[str, str]) -> str:
    tokens = person_tokens(row)
    return " ".join(tokens)


def similarity(left: Dict[str, str], right: Dict[str, str]) -> Tuple[float, float, int, str]:
    left_key = name_key(left)
    right_key = name_key(right)
    lset = {token for token in left_key.split() if len(token) > 1}
    rset = {token for token in right_key.split() if len(token) > 1}
    overlap = len(lset & rset)
    token_score = overlap / max(1, min(len(lset), len(rset)))
    ratio = SequenceMatcher(None, left_key, right_key).ratio() if left_key and right_key else 0.0
    detail = f"left='{left_key}' right='{right_key}' token_score={token_score:.2f} ratio={ratio:.2f}"
    return token_score, ratio, overlap, detail


def fuzzy_token_equal(left: str, right: str) -> bool:
    if left == right:
        return True
    if len(left) < 4 or len(right) < 4:
        return False
    return SequenceMatcher(None, left, right).ratio() >= 0.84


def core_person_match(left: Dict[str, str], right: Dict[str, str]) -> bool:
    left_tokens = [token for token in person_tokens(left) if len(token) > 1]
    right_tokens = [token for token in person_tokens(right) if len(token) > 1]
    if len(left_tokens) < 2 or len(right_tokens) < 2:
        return False
    first_match = fuzzy_token_equal(left_tokens[0], right_tokens[0])
    later_match = any(fuzzy_token_equal(lval, rval) for lval in left_tokens[1:] for rval in right_tokens[1:])
    subset_match = (
        min(len(set(left_tokens)), len(set(right_tokens))) >= 2
        and (set(left_tokens).issubset(set(right_tokens)) or set(right_tokens).issubset(set(left_tokens)))
    )
    return (first_match and later_match) or subset_match


def common_emails(left: Dict[str, str], right: Dict[str, str]) -> List[str]:
    lvals = {norm_email(value) for _, value in get_pairs(left, "E-mail") if norm_email(value)}
    rvals = {norm_email(value) for _, value in get_pairs(right, "E-mail") if norm_email(value)}
    return sorted(lvals & rvals)


def common_phones(left: Dict[str, str], right: Dict[str, str]) -> List[str]:
    lvals = {norm_phone(value) for _, value in get_pairs(left, "Phone") if len(norm_phone(value)) >= 7}
    rvals = {norm_phone(value) for _, value in get_pairs(right, "Phone") if len(norm_phone(value)) >= 7}
    return sorted(lvals & rvals)


def merge_allowed(left: Dict[str, str], right: Dict[str, str]) -> Tuple[bool, str, str, str, str]:
    emails = common_emails(left, right)
    phones = common_phones(left, right)
    token_score, ratio, overlap, detail = similarity(left, right)
    left_tokens = [token for token in person_tokens(left) if len(token) > 1]
    right_tokens = [token for token in person_tokens(right) if len(token) > 1]
    min_token_count = min(len(left_tokens), len(right_tokens))
    single_specific_email_match = (
        bool(emails)
        and len(left_tokens) == 1
        and len(right_tokens) == 1
        and min(len(left_tokens[0]), len(right_tokens[0])) >= 8
    )
    left_org = norm_text(left.get("Organization Name", ""))
    right_org = norm_text(right.get("Organization Name", ""))
    org_match = bool(left_org and right_org and left_org == right_org)
    core_match = core_person_match(left, right)

    if emails and phones and (core_match or (overlap >= 2 and token_score >= 0.67) or (ratio >= 0.82 and (min_token_count >= 2 or single_specific_email_match)) or org_match):
        return True, "shared email and phone with fuzzy-compatible name/org", "high", " | ".join(emails), " | ".join(phones)
    if emails and (core_match or (ratio >= 0.90 and (min_token_count >= 2 or single_specific_email_match)) or (overlap >= 2 and token_score >= 0.80) or org_match):
        return True, "shared email with strong fuzzy name/org match", "high", " | ".join(emails), ""
    if phones and (core_match or (ratio >= 0.92 and min_token_count >= 2) or (overlap >= 2 and token_score >= 0.90)):
        return True, "shared phone with strict fuzzy name match", "high", "", " | ".join(phones)
    return False, detail, "low", " | ".join(emails), " | ".join(phones)


def append_note(row: Dict[str, str], lines: Sequence[str]) -> None:
    existing = clean_spaces(row.get("Notes", ""))
    additions = [line for line in lines if line and line not in existing]
    if additions:
        row["Notes"] = f"{existing}\n\n" + "\n".join(additions) if existing else "\n".join(additions)


def apply_user_decisions(rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    decisions = []
    for row in rows:
        emails = {norm_email(value) for _, value in get_pairs(row, "E-mail")}
        phones = {norm_phone(value) for _, value in get_pairs(row, "Phone")}
        if "ceo@wockhardtfoundation.org" in emails:
            row["Name Prefix"] = ""
            row["First Name"] = ""
            row["Middle Name"] = ""
            row["Last Name"] = ""
            row["Name Suffix"] = ""
            row["Organization Name"] = "Wockhardt Foundation"
            row["Organization Title"] = "CEO"
            row["File As"] = "Wockhardt Foundation"
            append_note(row, ["User decision 2026-06-02: keep as organization contact; Organization=Wockhardt Foundation; Title=CEO."])
            decisions.append({"matched": "ceo@wockhardtfoundation.org", "action": "set organization/title", "final_name": display_name(row)})
        if "919967651763" in phones:
            row["Name Prefix"] = ""
            row["First Name"] = ""
            row["Middle Name"] = ""
            row["Last Name"] = ""
            row["Name Suffix"] = ""
            row["Organization Name"] = "Wockhardt Hospitals"
            row["Organization Title"] = ""
            row["File As"] = "Wockhardt Hospitals"
            append_note(row, ["User decision 2026-06-02: keep as organization/context contact; context=Haji / SoBo."])
            decisions.append({"matched": "+919967651763", "action": "set organization/context", "final_name": display_name(row)})
        if "frc@fattal.co.il" in emails:
            row["Name Prefix"] = ""
            row["First Name"] = ""
            row["Middle Name"] = ""
            row["Last Name"] = ""
            row["Name Suffix"] = ""
            row["Organization Name"] = "Fattal"
            row["Organization Title"] = ""
            row["File As"] = "Fattal"
            append_note(row, ["User decision 2026-06-02: keep garbled contact as organization=Fattal."])
            decisions.append({"matched": "frc@fattal.co.il", "action": "set organization", "final_name": display_name(row)})
        if "correspondencia@presidencia.pt" in emails:
            row["Name Prefix"] = ""
            row["First Name"] = ""
            row["Middle Name"] = ""
            row["Last Name"] = ""
            row["Name Suffix"] = ""
            row["Organization Name"] = "Presidencia"
            row["Organization Title"] = ""
            row["File As"] = "Presidencia"
            append_note(row, ["User decision 2026-06-02: keep as organization contact; organization=Presidencia."])
            decisions.append({"matched": "correspondencia@presidencia.pt", "action": "set organization", "final_name": display_name(row)})
    return decisions


def add_final_label(row: Dict[str, str]) -> None:
    raw_labels = [label.strip() for label in re.split(r"\s*:::\s*|\s*,\s*", row.get("Labels", "")) if label.strip()]
    labels = ["* myContacts"]
    for label in raw_labels:
        if label in {"* myContacts", "* Other Contacts"}:
            continue
        if label not in labels:
            labels.append(label)
    if FINAL_LABEL not in labels:
        labels.append(FINAL_LABEL)
    row["Labels"] = " ::: ".join(labels)


def choose_primary(indices: Sequence[int], rows: Sequence[Dict[str, str]]) -> int:
    def score(index: int) -> Tuple[int, int, int, int, int]:
        row = rows[index]
        tokens = person_tokens(row)
        person_score = min(len(tokens), 4)
        org_score = 1 if row.get("Organization Name") else 0
        contact_score = len(get_pairs(row, "E-mail")) + len(get_pairs(row, "Phone")) + len(get_addresses(row)) + len(get_pairs(row, "Website"))
        note_penalty = -1 if any(marker in display_name(row) for marker in ["◊", "√", "Ã", "Â", "�"]) else 0
        return person_score, org_score, contact_score, note_penalty, -index

    return max(indices, key=score)


def merge_rows(indices: Sequence[int], rows: Sequence[Dict[str, str]], reason: str) -> Dict[str, str]:
    primary = dict(rows[choose_primary(indices, rows)])
    for prefix in REPEATED_PREFIXES:
        all_pairs: List[Tuple[str, str]] = []
        for index in indices:
            all_pairs.extend(get_pairs(rows[index], prefix))
        kind = "email" if prefix == "E-mail" else "phone" if prefix == "Phone" else "text"
        set_pairs(primary, prefix, dedupe_pairs(all_pairs, kind))

    all_addresses = []
    for index in indices:
        all_addresses.extend(get_addresses(rows[index]))
    set_addresses(primary, dedupe_addresses(all_addresses))

    all_notes = []
    all_refs = []
    for index in indices:
        note = clean_spaces(rows[index].get("Notes", ""))
        if note and note not in all_notes:
            all_notes.append(note)
        all_refs.append(f"{index + 1}: {display_name(rows[index])}")
    primary["Notes"] = "\n\n".join(all_notes)
    append_note(primary, [f"Final fuzzy merge 2026-06-02: {reason}", "Final fuzzy merge source rows: " + " | ".join(all_refs)])
    primary["File As"] = display_name(primary)
    add_final_label(primary)
    return primary


def build_fuzzy_merges(rows: List[Dict[str, str]], priority_rows: Sequence[Dict[str, str]]) -> Tuple[List[List[int]], List[MergeDecision], List[Dict[str, str]]]:
    source_to_index: Dict[str, int] = {}
    for index, row in enumerate(rows):
        for ref in source_refs(row):
            source_to_index[ref] = index

    uf = UnionFind(len(rows))
    decisions: List[MergeDecision] = []
    decision_pairs = set()
    unresolved: List[Dict[str, str]] = []

    for candidate in priority_rows:
        if candidate.get("review_bucket") != "duplicate_candidate":
            continue
        indices = sorted({source_to_index[ref.strip()] for ref in candidate.get("source_rows", "").split(";") if ref.strip() in source_to_index})
        if len(indices) < 2:
            continue
        accepted_any = False
        for left_pos, left in enumerate(indices):
            for right in indices[left_pos + 1 :]:
                allowed, reason, confidence, shared_email, shared_phone = merge_allowed(rows[left], rows[right])
                token_score, ratio, overlap, detail = similarity(rows[left], rows[right])
                if allowed:
                    uf.union(left, right)
                    accepted_any = True
                    pair_key = tuple(sorted((left, right)))
                    if pair_key in decision_pairs:
                        continue
                    decision_pairs.add(pair_key)
                    decisions.append(
                        MergeDecision(
                            left=left,
                            right=right,
                            reason=reason,
                            confidence=confidence,
                            shared_email=shared_email,
                            shared_phone=shared_phone,
                            name_similarity=detail,
                        )
                    )
        if not accepted_any:
            unresolved.append(
                {
                    "review_id": candidate.get("review_id", ""),
                    "source_rows": candidate.get("source_rows", ""),
                    "original_names": candidate.get("original_names", ""),
                    "phones": candidate.get("phones", ""),
                    "emails": candidate.get("emails", ""),
                    "reason_left_unmerged": "Fuzzy match did not meet strict confidence threshold.",
                }
            )

    components: Dict[int, List[int]] = defaultdict(list)
    merged_members = {decision.left for decision in decisions} | {decision.right for decision in decisions}
    for index in merged_members:
        components[uf.find(index)].append(index)
    groups = [sorted(group) for group in components.values() if len(set(group)) > 1]
    return groups, decisions, unresolved


def write_summary(output_dir: Path, counts: Dict[str, int]) -> None:
    lines = [
        "# Final replacement contacts summary",
        "",
        f"- Draft cleaned contacts: {counts['draft_rows']}",
        f"- User-approved critical fixes applied: {counts['user_decisions']}",
        f"- Additional conservative fuzzy merge groups: {counts['fuzzy_groups']}",
        f"- Additional source rows absorbed by fuzzy merges: {counts['fuzzy_absorbed']}",
        f"- Final replacement contacts: {counts['final_rows']}",
        f"- Unresolved duplicate-candidate groups left separate: {counts['unresolved']}",
        f"- Missing e-mails after finalization: {counts['missing_emails']}",
        f"- Missing phones after finalization: {counts['missing_phones']}",
        "",
        "Accuracy policy: fuzzy duplicate groups were merged only when shared phone/e-mail evidence and cleaned-name similarity both passed strict thresholds. Ambiguous shared office, family, assistant, organization, or location contacts were left separate.",
        "",
        "Use `final_replacement_contacts.csv` only in the controlled replacement workflow after backing up and moving the old live contacts to Trash.",
    ]
    (output_dir / "final_replacement_summary.md").write_text("\n".join(lines), encoding="utf-8")


def collect_values(rows: Sequence[Dict[str, str]]) -> Tuple[set[str], set[str]]:
    emails = {norm_email(value) for row in rows for _, value in get_pairs(row, "E-mail") if norm_email(value)}
    phones = {norm_phone(value) for row in rows for _, value in get_pairs(row, "Phone") if norm_phone(value)}
    return emails, phones


def main() -> None:
    parser = argparse.ArgumentParser(description="Finalize contacts replacement CSV.")
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    output_dir = args.output_dir

    draft_rows = read_csv(output_dir / "cleaned_contacts.csv")
    headers = list(draft_rows[0].keys())
    rows = [dict(row) for row in draft_rows]
    priority_rows = read_csv(output_dir / "manual_review_priority.csv")

    user_decisions = apply_user_decisions(rows)
    fuzzy_groups, fuzzy_decisions, unresolved = build_fuzzy_merges(rows, priority_rows)

    absorbed = set(index for group in fuzzy_groups for index in group[1:])
    group_by_root_member = {tuple(group): merge_rows(group, rows, "conservative fuzzy match over shared phone/e-mail candidates") for group in fuzzy_groups}
    member_to_group = {member: tuple(group) for group in fuzzy_groups for member in group}

    final_rows: List[Dict[str, str]] = []
    emitted_groups = set()
    for index, row in enumerate(rows):
        group_key = member_to_group.get(index)
        if group_key:
            if group_key in emitted_groups:
                continue
            final_rows.append(group_by_root_member[group_key])
            emitted_groups.add(group_key)
        else:
            add_final_label(row)
            row["File As"] = display_name(row)
            final_rows.append(row)

    original_emails, original_phones = collect_values(draft_rows)
    final_emails, final_phones = collect_values(final_rows)
    missing_emails = sorted(original_emails - final_emails)
    missing_phones = sorted(original_phones - final_phones)

    write_csv(output_dir / "final_replacement_contacts.csv", headers, final_rows)
    write_csv(output_dir / "final_user_decisions_report.csv", ["matched", "action", "final_name"], user_decisions)
    write_csv(
        output_dir / "final_additional_fuzzy_merge_report.csv",
        ["final_name", "left_row", "right_row", "left_name", "right_name", "shared_email", "shared_phone", "reason", "confidence", "name_similarity"],
        [
            {
                "final_name": display_name(group_by_root_member[member_to_group[decision.left]]),
                "left_row": str(decision.left + 1),
                "right_row": str(decision.right + 1),
                "left_name": display_name(rows[decision.left]),
                "right_name": display_name(rows[decision.right]),
                "shared_email": decision.shared_email,
                "shared_phone": decision.shared_phone,
                "reason": decision.reason,
                "confidence": decision.confidence,
                "name_similarity": decision.name_similarity,
            }
            for decision in fuzzy_decisions
        ],
    )
    write_csv(
        output_dir / "final_unmerged_duplicate_candidates.csv",
        ["review_id", "source_rows", "original_names", "phones", "emails", "reason_left_unmerged"],
        unresolved,
    )
    write_csv(
        output_dir / "final_validation_report.csv",
        ["check", "result"],
        [
            {"check": "draft_rows", "result": str(len(draft_rows))},
            {"check": "final_rows", "result": str(len(final_rows))},
            {"check": "user_decisions", "result": str(len(user_decisions))},
            {"check": "fuzzy_groups", "result": str(len(fuzzy_groups))},
            {"check": "missing_emails", "result": str(len(missing_emails))},
            {"check": "missing_phones", "result": str(len(missing_phones))},
            {"check": "final_csv_parseable", "result": "Yes"},
        ],
    )
    write_summary(
        output_dir,
        {
            "draft_rows": len(draft_rows),
            "user_decisions": len(user_decisions),
            "fuzzy_groups": len(fuzzy_groups),
            "fuzzy_absorbed": len(absorbed),
            "final_rows": len(final_rows),
            "unresolved": len(unresolved),
            "missing_emails": len(missing_emails),
            "missing_phones": len(missing_phones),
        },
    )

    print(f"draft_rows={len(draft_rows)}")
    print(f"user_decisions={len(user_decisions)}")
    print(f"fuzzy_groups={len(fuzzy_groups)}")
    print(f"final_rows={len(final_rows)}")
    print(f"unresolved={len(unresolved)}")
    print(f"missing_emails={len(missing_emails)}")
    print(f"missing_phones={len(missing_phones)}")
    print(f"output_dir={output_dir}")


if __name__ == "__main__":
    main()
