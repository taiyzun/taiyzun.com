#!/usr/bin/env python3
import csv
import os
import re
import shutil
import signal
import time
from collections import Counter
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-mission-complete-report.csv")
AUDIT = Path("reports/family-hd-mission-complete-audit.csv")
SUMMARY = Path("reports/family-hd-mission-complete-summary.txt")
JUNK = ROOT / "_Junk Metadata - Review"

ACTIVE_ROOTS = ["Movies", "TV", "Videos", "Mac Video Library", "SG BU"]
REVIEW_ROOTS = {"_Duplicate Videos - Review", "_Duplicate Subtitles - Review", "_Junk Metadata - Review"}
SYSTEM_ROOTS = {".AppleDB", ".AppleDesktop", ".ArchiveServiceTemp.sb-f42ca32c-3Zy8Zj"}
PACKAGE_SUFFIXES = (".app", ".fcpbundle", ".movpkg", ".tvlibrary", ".imovielibrary", ".theater", ".localized")
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".wmv", ".webm", ".3gp", ".mpg", ".mpeg", ".ts", ".m2ts", ".vob"}
SUB_EXTS = {".srt", ".ass", ".ssa", ".sub", ".idx"}
BAD_TOKENS = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]


class TimeBudgetExceeded(Exception):
    pass


def timeout_handler(_signum, _frame):
    raise TimeBudgetExceeded()


def unique_path(target):
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 10000):
        candidate = target.with_name(f"{stem} - {n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(target)


def move_metadata(path, rows):
    dst = unique_path(JUNK / path.relative_to(ROOT))
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.move(str(path), str(dst))
    except FileNotFoundError:
        return False
    rows.append({
        "Original Path": str(path),
        "Proposed Path": str(dst),
        "Action": "moved_metadata_junk",
        "Notes": "Mission-complete visible metadata staging.",
    })
    return True


def audit_name(path, name, issues):
    if name == ".DS_Store" or name.startswith("._") or name.startswith(".__"):
        issues.append({"Path": str(path), "Issues": "metadata"})
        return
    found = []
    low = name.lower()
    if "_" in name:
        found.append("underscore")
    if "(" in name or ")" in name:
        found.append("round brackets")
    if "|" in name or "\\" in name:
        found.append("slash or pipe")
    if re.search(r" - 2(?:\.|$)", name):
        found.append("collision suffix")
    for token in BAD_TOKENS:
        if token in low:
            found.append("generic token: " + token)
    if found:
        issues.append({"Path": str(path), "Issues": "; ".join(dict.fromkeys(found))})


def scan_folder(base, rows, issues, counts, max_depth=2):
    stack = [(base, 0)]
    while stack:
        current, depth = stack.pop()
        counts["directories_scanned"] += 1
        entries = list(os.scandir(current))
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

            audit_name(path, name, issues)

            if is_file:
                counts["files_scanned"] += 1
                suffix = path.suffix.lower()
                if suffix in VIDEO_EXTS:
                    counts["video_files"] += 1
                if suffix in SUB_EXTS:
                    counts["subtitle_files"] += 1
            elif is_dir and depth < max_depth:
                if name in REVIEW_ROOTS or name in SYSTEM_ROOTS or name.endswith(PACKAGE_SUFFIXES):
                    counts["pruned_dirs"] += 1
                else:
                    stack.append((path, depth + 1))


def write_outputs(rows, issues, counts, status):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)
    with AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(issues)
    lines = [
        "Family HD mission complete summary",
        f"Status: {status}",
        f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Top-level active folders expected: {', '.join(ACTIVE_ROOTS)}",
        f"Top-level active folders present: {', '.join([name for name in ACTIVE_ROOTS if (ROOT / name).exists()])}",
        f"Directories scanned: {counts['directories_scanned']}",
        f"Files scanned: {counts['files_scanned']}",
        f"Video files counted in bounded scan: {counts['video_files']}",
        f"Subtitle files counted in bounded scan: {counts['subtitle_files']}",
        f"Package/system/review dirs pruned: {counts['pruned_dirs']}",
        f"Visible metadata files staged this pass: {counts['metadata_moved']}",
        f"Visible audit issues in bounded scan: {len(issues)}",
        "Completed cleanup reports remain authoritative for full actions: family-hd-broad-final-summary.txt",
        f"Report: {REPORT}",
        f"Audit: {AUDIT}",
    ]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


def main():
    rows = []
    issues = []
    counts = Counter()
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(120)
    status = "completed"
    try:
        # Root-level volatile metadata first.
        for name in [".DS_Store", "._.DS_Store"]:
            path = ROOT / name
            if path.exists() and move_metadata(path, rows):
                counts["metadata_moved"] += 1
        for folder_name in ACTIVE_ROOTS:
            folder = ROOT / folder_name
            if folder.exists():
                scan_folder(folder, rows, issues, counts, max_depth=2)
    except TimeBudgetExceeded:
        status = "time-budget-reached-partial-rescan"
    finally:
        signal.alarm(0)
        write_outputs(rows, issues, counts, status)


if __name__ == "__main__":
    main()
