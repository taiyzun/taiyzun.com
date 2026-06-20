#!/usr/bin/env python3
import csv
import os
import shutil
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-broad-corrections-report.csv")
AUDIT = Path("reports/family-hd-broad-audit.csv")
JUNK_ROOT = ROOT / "_Junk Metadata - Review"

RENAMES = {
    "cleanup_report.md": "Cleanup Report.md",
    "rename_folders_for_mac.sh": "Rename Folders for Mac.sh",
    "cleanup_media.py": "Cleanup Media.py",
    "Videos/Tv": "Videos/TV Library Backup",
    "Videos/TV Library Backup/mEdia.localiZed": "Videos/TV Library Backup/Media.localized",
    "Videos/TV Library Backup/previouS librarieS.localiZed": "Videos/TV Library Backup/Previous Libraries.localized",
    "Videos/TV Library Backup/Media.localized/auTomaTically add To Tv.localiZed": "Videos/TV Library Backup/Media.localized/Automatically Add to TV.localized",
    "Videos/TV Library Backup/Media.localized/downloadS Tv": "Videos/TV Library Backup/Media.localized/Downloads TV",
    "Videos/TV Library Backup/Media.localized/downloadS Tvdb": "Videos/TV Library Backup/Media.localized/Downloads TVDB",
    "Videos/TV Library Backup/TV library.Tvlibrary": "Videos/TV Library Backup/TV Library.tvlibrary",
    "Mac Video Library/ScienTific ~ maThemaTical ~ hiSTorical miracleS of The quran": "Mac Video Library/Scientific Mathematical Historical Miracles of the Quran",
}


def unique_path(target):
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 1000):
        candidate = target.with_name(f"{stem} - {n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(target)


def case_safe_rename(src, dst):
    if src.parent == dst.parent and src.name.lower() == dst.name.lower():
        tmp = unique_path(src.with_name(src.name + ".__tmp__"))
        os.rename(src, tmp)
        src = tmp
    os.rename(src, dst)


def move_metadata(rows):
    targets = [
        ROOT / ".DS_Store",
        ROOT / "._.DS_Store",
        ROOT / "Videos/.DS_Store",
        ROOT / "Videos/._.DS_Store",
        ROOT / "Videos/TV Library Backup/.DS_Store",
        ROOT / "Videos/TV Library Backup/._.DS_Store",
    ]
    for src in targets:
        if not src.exists():
            continue
        dst = unique_path(JUNK_ROOT / src.relative_to(ROOT))
        dst.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.move(str(src), str(dst))
        except FileNotFoundError:
            continue
        rows.append({"Original Path": str(src), "Proposed Path": str(dst), "Action": "moved_metadata_junk", "Notes": "Broad-pass Finder metadata staged for review."})


def audit_rows():
    import os
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
            # Apple locale resource IDs are correct with underscores.
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
    for old, new in RENAMES.items():
        src = ROOT / old
        dst = ROOT / new
        if not src.exists():
            continue
        dst = unique_path(dst)
        dst.parent.mkdir(parents=True, exist_ok=True)
        case_safe_rename(src, dst)
        rows.append({"Original Path": str(src), "Proposed Path": str(dst), "Action": "renamed_broad_protocol_issue", "Notes": "Broad Family HD protocol correction."})
    move_metadata(rows)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    ar = audit_rows()
    with AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(ar)
    print(f"Corrections: {len(rows)}")
    print(f"Remaining broad audit issues: {len(ar)}")
    print(f"Report: {REPORT}")
    print(f"Audit: {AUDIT}")


if __name__ == "__main__":
    main()
