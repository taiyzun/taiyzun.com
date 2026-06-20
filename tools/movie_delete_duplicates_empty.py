#!/usr/bin/env python3
import csv
import hashlib
import os
import shutil
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path("/Volumes/Family/movieS")
REPORT = Path("reports/movie-delete-duplicates-empty-report.csv")
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"}
MEDIA_EXTS = VIDEO_EXTS | {".srt", ".sub", ".idx", ".ass", ".ssa"}


def log(message):
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def keep_score(path):
    text = str(path)
    name = path.name
    score = 0
    if "_Cleanup Review" not in text and "_Manual Review" not in text:
        score += 50
    if " - Duplicate " not in text and "Duplicate Files" not in text:
        score += 25
    if "[" in text and "]" in text and " [" not in name.replace(" [", "", 1):
        score += 10
    if not name.startswith("._") and name != ".DS_Store":
        score += 5
    if path.suffix.lower() in VIDEO_EXTS:
        score += 3
    return score


def on_rm_error(func, path, exc_info):
    if isinstance(exc_info[1], FileNotFoundError):
        return
    raise exc_info[1]


def has_video(folder):
    for dirpath, _, filenames in os.walk(folder):
        for filename in filenames:
            if Path(filename).suffix.lower() in VIDEO_EXTS:
                return True
    return False


def write_report(rows):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "action", "notes"])
        writer.writeheader()
        writer.writerows(rows)


def main():
    rows = []

    log("Indexing files")
    files = []
    dirs = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        dirs.append(current)
        if len(dirs) % 250 == 0:
            log(f"Indexed {len(dirs)} folders, {len(files)} files")
        for filename in filenames:
            p = current / filename
            try:
                st = p.stat()
            except OSError:
                continue
            files.append((p, st.st_size))

    log("Deleting zero-byte files")
    for p, size in files:
        if size == 0 and p.exists():
            try:
                p.unlink()
                rows.append({"path": str(p), "action": "deleted_zero_byte_file", "notes": "Size was 0 bytes."})
            except OSError as e:
                rows.append({"path": str(p), "action": "skipped", "notes": f"Could not delete zero-byte file: {e}"})
    write_report(rows)

    log("Hashing same-size duplicate candidates")
    by_size = defaultdict(list)
    for p, size in files:
        if not p.exists() or size <= 0:
            continue
        if p.name == ".DS_Store" or p.name.startswith("._"):
            # Sidecars can be safely deleted later if duplicate folders/no-movie folders are removed.
            continue
        by_size[size].append(p)

    by_hash = defaultdict(list)
    hashed = 0
    for group in by_size.values():
        if len(group) < 2:
            continue
        for p in group:
            if not p.exists():
                continue
            try:
                by_hash[sha256(p)].append(p)
                hashed += 1
                if hashed % 100 == 0:
                    log(f"Hashed {hashed} duplicate-size candidates")
            except OSError as e:
                rows.append({"path": str(p), "action": "skipped", "notes": f"Could not hash: {e}"})
    write_report(rows)

    log("Deleting exact duplicate files")
    deleted_dupes = 0
    for group in by_hash.values():
        existing = [p for p in group if p.exists()]
        if len(existing) < 2:
            continue
        existing.sort(key=keep_score, reverse=True)
        keep = existing[0]
        for dup in existing[1:]:
            if not dup.exists():
                continue
            try:
                dup.unlink()
                deleted_dupes += 1
                rows.append({"path": str(dup), "action": "deleted_duplicate_file", "notes": f"Exact SHA-256 duplicate of kept file: {keep}"})
            except OSError as e:
                rows.append({"path": str(dup), "action": "skipped", "notes": f"Could not delete duplicate: {e}"})
        if deleted_dupes and deleted_dupes % 250 == 0:
            log(f"Deleted {deleted_dupes} exact duplicate files")
            write_report(rows)
    write_report(rows)

    log("Deleting duplicate folders that no longer contain unique movies")
    # Recompute dirs after duplicate file deletion.
    duplicate_dirs = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        if " - Duplicate " in current.name or "Duplicate Files" in current.parts:
            duplicate_dirs.append(current)
    duplicate_dirs.sort(key=lambda p: len(str(p)), reverse=True)
    for folder in duplicate_dirs:
        if not folder.exists() or not folder.is_dir():
            continue
        if has_video(folder):
            rows.append({"path": str(folder), "action": "kept_duplicate_folder", "notes": "Still contains video files after exact duplicate deletion; not deleting blindly."})
            continue
        try:
            shutil.rmtree(folder, onerror=on_rm_error)
            rows.append({"path": str(folder), "action": "deleted_duplicate_folder", "notes": "Duplicate folder contained no remaining video files."})
        except OSError as e:
            rows.append({"path": str(folder), "action": "skipped", "notes": f"Could not delete duplicate folder: {e}"})
    write_report(rows)

    log("Deleting top-level folders with no movie files")
    for folder in sorted([p for p in ROOT.iterdir() if p.is_dir()], key=lambda p: p.name.lower()):
        if not folder.exists() or not folder.is_dir():
            continue
        if has_video(folder):
            continue
        try:
            shutil.rmtree(folder, onerror=on_rm_error)
            rows.append({"path": str(folder), "action": "deleted_no_movie_folder", "notes": "No video files in folder subtree."})
        except OSError as e:
            rows.append({"path": str(folder), "action": "skipped", "notes": f"Could not delete no-movie folder: {e}"})
    write_report(rows)

    log("Deleting empty folders")
    all_dirs = []
    for dirpath, dirnames, _ in os.walk(ROOT):
        for dirname in dirnames:
            all_dirs.append(Path(dirpath) / dirname)
    for folder in sorted(all_dirs, key=lambda p: len(str(p)), reverse=True):
        try:
            if folder.exists() and folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()
                rows.append({"path": str(folder), "action": "deleted_empty_folder", "notes": "Folder was empty."})
        except OSError:
            pass

    write_report(rows)
    summary = defaultdict(int)
    for row in rows:
        summary[row["action"]] += 1
    log(f"Done: {dict(summary)}")
    print(f"Report: {REPORT}", flush=True)


if __name__ == "__main__":
    main()
