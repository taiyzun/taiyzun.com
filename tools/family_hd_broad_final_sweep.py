#!/usr/bin/env python3
import csv
import os
import shutil
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-broad-final-sweep-report.csv")
AUDIT = Path("reports/family-hd-broad-final-audit.csv")
JUNK = ROOT / "_Junk Metadata - Review"

RENAMES = {
    "Videos/TV Library Backup/TV Library - 2.tvlibrary": "Videos/TV Library Backup/TV Library.tvlibrary",
    "Videos/TV Library Backup/Media - 2.localized": "Videos/TV Library Backup/Media.localized",
    "Videos/TV Library Backup/Previous Libraries - 2.localized": "Videos/TV Library Backup/Previous Libraries.localized",
    "Videos/TV Library Backup/Media.localized/auTomaTically add To Tv.localiZed": "Videos/TV Library Backup/Media.localized/Automatically Add to TV.localized",
    "Videos/TV Library Backup/Media.localized/downloadS Tv": "Videos/TV Library Backup/Media.localized/Downloads TV",
    "Videos/TV Library Backup/Media.localized/downloadS Tvdb": "Videos/TV Library Backup/Media.localized/Downloads TVDB",
}


def unique_path(target):
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 1000):
        c = target.with_name(f"{stem} - {n}{suffix}")
        if not c.exists():
            return c
    raise RuntimeError(target)


def move_metadata(rows):
    for base in [ROOT, ROOT / "Videos", ROOT / "Videos/TV Library Backup", ROOT / "Mac Video Library"]:
        if not base.exists():
            continue
        for p in base.iterdir():
            if p.name == ".DS_Store" or p.name.startswith("._") or p.name.startswith(".__"):
                dst = unique_path(JUNK / p.relative_to(ROOT))
                dst.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.move(str(p), str(dst))
                except FileNotFoundError:
                    continue
                rows.append({"Original Path": str(p), "Proposed Path": str(dst), "Action": "moved_metadata_junk", "Notes": "Final broad sweep metadata staging."})


def audit_rows():
    rows = []
    review = {"_Duplicate Videos - Review", "_Duplicate Subtitles - Review", "_Junk Metadata - Review"}
    system = {".AppleDB", ".AppleDesktop", ".ArchiveServiceTemp.sb-f42ca32c-3Zy8Zj"}
    prune_suffix = (".app", ".fcpbundle", ".movpkg", ".tvlibrary", ".imovielibrary", ".theater")
    tokens = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]
    for dirpath, dirnames, filenames in os.walk(ROOT):
        cur = Path(dirpath)
        rel = cur.relative_to(ROOT).parts if cur != ROOT else ()
        if rel and rel[0] in review | system:
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames if d not in review and d not in system and not d.endswith(prune_suffix)]
        for name in list(dirnames) + filenames:
            if cur.name == ".localized" and name.endswith(".strings"):
                continue
            issues = []
            low = name.lower()
            if name == ".DS_Store" or name.startswith("._") or name.startswith(".__"):
                issues.append("metadata")
            if "_" in name:
                issues.append("underscore")
            if "(" in name or ")" in name:
                issues.append("round brackets")
            if "|" in name or "\\" in name:
                issues.append("slash or pipe")
            if " - 2" in name:
                issues.append("collision suffix")
            if name in {"Tv", "mEdia.localiZed", "previouS librarieS.localiZed", "ScienTific ~ maThemaTical ~ hiSTorical miracleS of The quran"}:
                issues.append("folder casing")
            for token in tokens:
                if token in low:
                    issues.append("generic token: " + token)
            if issues:
                rows.append({"Path": str(cur / name), "Issues": "; ".join(dict.fromkeys(issues))})
    return rows


def main():
    rows = []
    move_metadata(rows)
    for old, new in RENAMES.items():
        src = ROOT / old
        dst = ROOT / new
        if src.exists() and not dst.exists():
            os.rename(src, dst)
            rows.append({"Original Path": str(src), "Proposed Path": str(dst), "Action": "renamed_broad_final_issue", "Notes": "Removed collision suffix or corrected backup-library casing."})
    move_metadata(rows)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as h:
        w = csv.DictWriter(h, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        w.writeheader()
        w.writerows(rows)

    ar = audit_rows()
    with AUDIT.open("w", newline="", encoding="utf-8") as h:
        w = csv.DictWriter(h, fieldnames=["Path", "Issues"])
        w.writeheader()
        w.writerows(ar)
    print(f"Actions: {len(rows)}")
    print(f"Remaining broad final audit issues: {len(ar)}")
    print(f"Report: {REPORT}")
    print(f"Audit: {AUDIT}")


if __name__ == "__main__":
    main()
