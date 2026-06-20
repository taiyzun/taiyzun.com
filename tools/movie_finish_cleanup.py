#!/usr/bin/env python3
import csv
import os
import re
import shutil
import time
from pathlib import Path

ROOT = Path("/Volumes/Family/movieS")
REPORT = Path("reports/movie-finish-cleanup-report.csv")
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"}
SKIP_NAMES = set()


def log(message):
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def safe_name(value):
    return re.sub(r"\s+", " ", value.replace("\\", " ~ ").replace("/", " ~ ").replace(":", " ~ ").replace("|", " ").replace("_", " ")).strip()


def standard_tag(value):
    key = re.sub(r"\s+", "", value.lower())
    return {
        "2160p": "4K",
        "4k": "4K",
        "uhdbluray": "UHD BluRay",
        "bluray": "BluRay",
        "webrip": "WEBRip",
        "web-dl": "WEB-DL",
        "webdl": "WEB-DL",
        "brrip": "BRRip",
        "hdtv": "HDTV",
    }.get(key, value)


def normalize_name(name):
    ext = Path(name).suffix
    stem = name[:-len(ext)] if ext else name
    next_name = safe_name(stem)
    next_name = re.sub(r"\((19\d{2}|20\d{2})\)", r"[\1]", next_name)
    next_name = re.sub(r"~\s*(19\d{2}|20\d{2})\s*~", r"[\1] -", next_name)
    next_name = re.sub(r"\b(19\d{2}|20\d{2})\b", r"[\1]", next_name)
    next_name = re.sub(
        r"\[\s*(4K|2160p|1080p|720p|480p|UHD BluRay|BluRay|WEBRip|WEB-DL|BRRip|HDTV)\s*\]",
        lambda m: " - " + standard_tag(m.group(1)),
        next_name,
        flags=re.I,
    )
    next_name = re.sub(r"\]\s+\[", "] - ", next_name)
    next_name = re.sub(r"\s+-\s+\[", " - ", next_name)
    next_name = re.sub(r"\[(?!19\d{2}\]|20\d{2}\])([^\]]+)\]", r"\1", next_name)
    next_name = re.sub(r"\s+-\s+-\s+", " - ", next_name)
    next_name = re.sub(r"\s+", " ", next_name).strip(" -")
    return next_name + ext


def has_video(folder):
    for dirpath, _, filenames in os.walk(folder):
        for filename in filenames:
            if Path(filename).suffix.lower() in VIDEO_EXTS:
                return True
    return False


def on_rm_error(func, path, exc_info):
    # macOS sidecars on external volumes can disappear while deleting.
    if isinstance(exc_info[1], FileNotFoundError):
        return
    raise exc_info[1]


def main():
    rows = []
    log("Finishing folder-name normalization")
    for folder in sorted([p for p in ROOT.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
        target = folder.with_name(normalize_name(folder.name))
        if target == folder:
            continue
        if target.exists():
            rows.append({"original_path": str(folder), "new_path": str(target), "action": "skipped", "notes": "Target exists; no merge/overwrite."})
            continue
        folder.rename(target)
        rows.append({"original_path": str(folder), "new_path": str(target), "action": "renamed_folder", "notes": "Single-bracket naming finish pass."})

    log("Removing top-level folders with no movie files")
    for folder in sorted([p for p in ROOT.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
        if not has_video(folder):
            try:
                shutil.rmtree(folder, onerror=on_rm_error)
                rows.append({"original_path": str(folder), "new_path": "", "action": "removed_no_movie_folder", "notes": "No video file in folder subtree."})
            except FileNotFoundError:
                rows.append({"original_path": str(folder), "new_path": "", "action": "removed_no_movie_folder", "notes": "Folder disappeared during cleanup."})

    log("Removing empty folders")
    dirs = []
    for dirpath, dirnames, _ in os.walk(ROOT):
        for dirname in dirnames:
            dirs.append(Path(dirpath) / dirname)
    for folder in sorted(dirs, key=lambda p: len(str(p)), reverse=True):
        try:
            if folder.exists() and folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()
                rows.append({"original_path": str(folder), "new_path": "", "action": "removed_empty_folder", "notes": "Folder was empty."})
        except OSError:
            pass

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["original_path", "new_path", "action", "notes"])
        writer.writeheader()
        writer.writerows(rows)

    summary = {}
    for row in rows:
        summary[row["action"]] = summary.get(row["action"], 0) + 1
    log(f"Done: {summary}")


if __name__ == "__main__":
    main()
