#!/usr/bin/env python3
import csv
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("/Volumes/Family/movieS")
REPORT = Path("reports/movie-protocol-audit-report.csv")
SUMMARY = Path("reports/movie-protocol-audit-summary.txt")
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"}
MEDIA_EXTS = VIDEO_EXTS | {".srt", ".sub", ".idx", ".ass", ".ssa"}


def issue(path, issue_type, notes, rows):
    rows.append({"path": str(path), "issue": issue_type, "notes": notes})


def has_video(folder):
    for dirpath, _, filenames in os.walk(folder):
        for filename in filenames:
            if Path(filename).suffix.lower() in VIDEO_EXTS:
                return True
    return False


def audit_name(path, rows):
    name = path.name
    if name in {".DS_Store"} or name.startswith("._"):
        return
    # Year in [] is allowed; other bracket use is suspect.
    if re.search(r"\]\s+\[", name):
        issue(path, "double_bracket_style", "Name still has repeated bracket groups such as [Year] [Quality].", rows)
    if re.search(r"\((19\d{2}|20\d{2}|4K|2160p|1080p|720p|480p|FHD|HD|SD|BluRay|WEBRip|WEB-DL|BRRip|HDTV)[^)]*\)", name, re.I):
        issue(path, "round_brackets", "Name still uses round brackets for year/quality/source.", rows)
    if "_" in name:
        issue(path, "underscore", "Name still contains underscore.", rows)
    if re.search(r"\b(1080p|720p|480p|2160p|4K)\b", name, re.I) and not re.search(r" - (4K|2160p|1080p|720p|480p)( |\.|$)", name, re.I):
        issue(path, "quality_not_after_dash", "Quality appears but not in the requested dash style.", rows)
    # Release cruft should not remain in clean movie file/folder names except accepted source tags.
    if re.search(r"\b(x264|x265|AAC5?|10bit|YTS|YIFY|FHD|HD|SD)\b", name, re.I):
        issue(path, "release_cruft", "Name still includes codec/release/old quality cruft.", rows)


def main():
    rows = []
    counts = Counter()
    top_level = []
    files = []
    dirs = []
    size_groups = defaultdict(list)

    if not ROOT.exists():
        raise SystemExit(f"Missing {ROOT}")

    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        dirs.append(current)
        if current.parent == ROOT:
            top_level.append(current)
        audit_name(current, rows)
        for filename in filenames:
            path = current / filename
            audit_name(path, rows)
            try:
                st = path.stat()
            except OSError as exc:
                issue(path, "stat_error", f"Could not stat file: {exc}", rows)
                continue
            files.append((path, st.st_size))
            if st.st_size == 0:
                issue(path, "zero_byte_file", "File is 0 bytes.", rows)
            if path.suffix.lower() in MEDIA_EXTS and not (path.name.startswith("._") or path.name == ".DS_Store"):
                size_groups[st.st_size].append(path)

    for folder in dirs:
        if folder == ROOT:
            continue
        try:
            if not any(folder.iterdir()):
                issue(folder, "empty_folder", "Folder is empty.", rows)
        except OSError as exc:
            issue(folder, "read_error", f"Could not read folder: {exc}", rows)

    for folder in top_level:
        if not has_video(folder):
            issue(folder, "top_level_no_movie_file", "Top-level folder has no video file in its subtree.", rows)

    duplicate_name_folders = [folder for folder in top_level if " - Duplicate " in folder.name]
    for folder in duplicate_name_folders:
        issue(folder, "duplicate_folder_remaining", "Duplicate-named folder remains; kept earlier because it still contains video files.", rows)

    duplicate_size_candidates = sum(len(group) for group in size_groups.values() if len(group) > 1)
    for row in rows:
        counts[row["issue"]] += 1

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "issue", "notes"])
        writer.writeheader()
        writer.writerows(rows)

    summary_lines = [
        f"Root: {ROOT}",
        f"Top-level folders: {len(top_level)}",
        f"Folders scanned: {len(dirs)}",
        f"Files scanned: {len(files)}",
        f"Audit issues: {len(rows)}",
        f"Duplicate-size media candidates not hash-verified in this audit: {duplicate_size_candidates}",
        "",
        "Issues by type:",
    ]
    for key, value in sorted(counts.items()):
        summary_lines.append(f"- {key}: {value}")
    SUMMARY.write_text("\n".join(summary_lines) + "\n")
    print("\n".join(summary_lines))
    print(f"Report: {REPORT}")
    print(f"Summary: {SUMMARY}")


if __name__ == "__main__":
    main()
