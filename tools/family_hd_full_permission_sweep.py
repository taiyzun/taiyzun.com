#!/usr/bin/env python3
import csv
import os
import re
import shutil
import time
from collections import Counter
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-full-permission-sweep-report.csv")
AUDIT = Path("reports/family-hd-full-permission-audit.csv")
SUMMARY = Path("reports/family-hd-full-permission-summary.txt")
JUNK = ROOT / "_Junk Metadata - Review"

REVIEW_ROOTS = {"_Duplicate Videos - Review", "_Duplicate Subtitles - Review", "_Junk Metadata - Review"}
SYSTEM_ROOTS = {".AppleDB", ".AppleDesktop", ".ArchiveServiceTemp.sb-f42ca32c-3Zy8Zj"}
PACKAGE_SUFFIXES = (".app", ".fcpbundle", ".movpkg", ".tvlibrary", ".imovielibrary", ".theater")
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".wmv", ".webm", ".3gp", ".mpg", ".mpeg", ".ts", ".m2ts", ".vob"}
SUB_EXTS = {".srt", ".ass", ".ssa", ".sub", ".idx"}


def log(message):
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def rel(path):
    return path.relative_to(ROOT)


def unique_path(target):
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 10000):
        candidate = target.with_name(f"{stem} - {n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"No unique target for {target}")


def move_metadata(path, rows):
    dst = unique_path(JUNK / rel(path))
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.move(str(path), str(dst))
    except FileNotFoundError:
        return False
    rows.append(
        {
            "Original Path": str(path),
            "Proposed Path": str(dst),
            "Action": "moved_metadata_junk",
            "Notes": "Full-permission sweep staged Finder/AppleDouble metadata.",
        }
    )
    return True


def should_prune_dir(name):
    return name in REVIEW_ROOTS or name in SYSTEM_ROOTS or name.endswith(PACKAGE_SUFFIXES)


def scan_visible_tree(rows):
    audit = []
    counts = Counter()
    stack = [ROOT]
    bad_tokens = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]
    scanned_dirs = 0

    while stack:
        current = stack.pop()
        scanned_dirs += 1
        if scanned_dirs % 1000 == 0:
            log(f"Scanned directories: {scanned_dirs}")
        try:
            entries = list(os.scandir(current))
        except (FileNotFoundError, PermissionError, OSError) as exc:
            audit.append({"Path": str(current), "Issues": f"scan error: {exc}"})
            continue

        for entry in entries:
            path = Path(entry.path)
            name = entry.name
            try:
                is_dir = entry.is_dir(follow_symlinks=False)
                is_file = entry.is_file(follow_symlinks=False)
            except OSError:
                continue

            if name == ".DS_Store" or name.startswith("._") or name.startswith(".__"):
                if move_metadata(path, rows):
                    counts["metadata_moved"] += 1
                continue

            if is_dir:
                if should_prune_dir(name):
                    counts["pruned_package_or_system"] += 1
                    continue
                stack.append(path)
            elif is_file:
                suffix = path.suffix.lower()
                if suffix in VIDEO_EXTS:
                    counts["active_video_files"] += 1
                elif suffix in SUB_EXTS:
                    counts["active_subtitle_files"] += 1

            # Apple localization resource IDs such as en_GB.strings are official names.
            if current.name == ".localized" and name.endswith(".strings"):
                continue

            issues = []
            low = name.lower()
            if "_" in name:
                issues.append("underscore")
            if "(" in name or ")" in name:
                issues.append("round brackets")
            if "|" in name or "\\" in name:
                issues.append("slash or pipe")
            if re.search(r" - 2(?:\.|$)", name):
                issues.append("collision suffix")
            for token in bad_tokens:
                if token in low:
                    issues.append("generic token: " + token)
            if issues:
                audit.append({"Path": str(path), "Issues": "; ".join(dict.fromkeys(issues))})

    return audit, counts


def main():
    rows = []
    log("Starting full-permission visible-tree sweep")
    audit, counts = scan_visible_tree(rows)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    with AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(audit)

    lines = [
        "Family HD full-permission sweep summary",
        f"Metadata files staged this pass: {counts['metadata_moved']}",
        f"Active video files counted: {counts['active_video_files']}",
        f"Active subtitle files counted: {counts['active_subtitle_files']}",
        f"Packages/system/review folders pruned: {counts['pruned_package_or_system']}",
        f"Remaining visible audit issues: {len(audit)}",
        f"Report: {REPORT}",
        f"Audit: {AUDIT}",
    ]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
