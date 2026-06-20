#!/usr/bin/env python3
import csv
import hashlib
import json
import os
import shutil
import subprocess
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path("/Volumes/Family")
DUP_ROOT = ROOT / "_Duplicate Videos - Review"
REPORT = Path("reports/family-video-full-hd-cleanup.csv")
SUMMARY = Path("reports/family-video-full-hd-cleanup-summary.txt")
FFPROBE = "/opt/homebrew/bin/ffprobe"
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".wmv", ".webm", ".3gp", ".mpg", ".mpeg", ".ts", ".m2ts"}


def log(message):
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def rel(path):
    try:
        return path.relative_to(ROOT)
    except ValueError:
        return path.name


def unique_path(target):
    if not target.exists():
        return target
    stem, suffix = target.stem, target.suffix
    n = 2
    while True:
        candidate = target.with_name(f"{stem} [{n}]{suffix}")
        if not candidate.exists():
            return candidate
        n += 1


def ffprobe_dimensions(path):
    try:
        result = subprocess.run(
            [
                FFPROBE,
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height",
                "-of",
                "json",
                str(path),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=20,
        )
        if result.returncode != 0:
            return None, None, result.stderr.strip()[:200]
        data = json.loads(result.stdout or "{}")
        stream = (data.get("streams") or [{}])[0]
        width = int(stream.get("width") or 0)
        height = int(stream.get("height") or 0)
        if width and height:
            return width, height, ""
        return None, None, "ffprobe returned no dimensions"
    except Exception as exc:
        return None, None, str(exc)[:200]


def resolution_class(width, height):
    if not width or not height:
        return "Unknown resolution"
    max_dim = max(width, height)
    min_dim = min(width, height)
    if max_dim >= 3800 or min_dim >= 2000:
        return "4K / above Full HD"
    if max_dim >= 1900 or min_dim >= 1000:
        return "Full HD 1080p"
    if max_dim >= 1200 or min_dim >= 700:
        return "HD 720p below Full HD"
    return "SD below Full HD"


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def keep_score(item):
    cls_score = {
        "4K / above Full HD": 50,
        "Full HD 1080p": 40,
        "HD 720p below Full HD": 20,
        "SD below Full HD": 10,
        "Unknown resolution": 0,
    }.get(item["resolution_class"], 0)
    path_text = str(item["path"])
    score = cls_score
    if "_Duplicate Videos - Review" not in path_text:
        score += 100
    if "/movieS/" in path_text:
        score += 10
    if " - Copy " not in path_text and "Duplicate" not in path_text:
        score += 5
    score += min(item["size"] / (1024**3), 20)
    return score


def move_duplicate(item, kept):
    source = item["path"]
    target = unique_path(DUP_ROOT / rel(source))
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(source), str(target))
    return target


def remove_empty_dirs():
    removed = []
    dirs = []
    for dirpath, dirnames, _ in os.walk(ROOT):
        current = Path(dirpath)
        if current == ROOT or current == DUP_ROOT or str(current).startswith(str(DUP_ROOT) + os.sep):
            continue
        dirs.append(current)
    for folder in sorted(dirs, key=lambda p: len(str(p)), reverse=True):
        try:
            if folder.exists() and folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()
                removed.append(folder)
        except OSError:
            pass
    return removed


def main():
    if not ROOT.exists():
        raise SystemExit(f"Missing volume: {ROOT}")

    rows = []
    log("Indexing video files across full Family volume")
    videos = []
    for dirpath, _, filenames in os.walk(ROOT):
        current = Path(dirpath)
        if current == DUP_ROOT or str(current).startswith(str(DUP_ROOT) + os.sep):
            continue
        for filename in filenames:
            path = current / filename
            if path.suffix.lower() not in VIDEO_EXTS:
                continue
            try:
                st = path.stat()
            except OSError as exc:
                rows.append({"path": str(path), "action": "scan_error", "resolution_class": "", "width": "", "height": "", "size_bytes": "", "notes": str(exc)})
                continue
            videos.append({"path": path, "size": st.st_size})
            if len(videos) % 250 == 0:
                log(f"Indexed {len(videos)} videos")

    log("Probing actual video dimensions with ffprobe")
    for i, item in enumerate(videos, 1):
        width, height, err = ffprobe_dimensions(item["path"])
        item["width"] = width or ""
        item["height"] = height or ""
        item["resolution_class"] = resolution_class(width, height)
        item["probe_error"] = err
        if i % 100 == 0:
            log(f"Probed {i}/{len(videos)} videos")

    log("Hashing same-size duplicate video candidates")
    by_size = defaultdict(list)
    for item in videos:
        if item["size"] > 0 and item["path"].exists():
            by_size[item["size"]].append(item)
    by_hash = defaultdict(list)
    hashed = 0
    for group in by_size.values():
        if len(group) < 2:
            continue
        for item in group:
            if not item["path"].exists():
                continue
            try:
                item["sha256"] = sha256(item["path"])
                by_hash[item["sha256"]].append(item)
                hashed += 1
                if hashed % 50 == 0:
                    log(f"Hashed {hashed} duplicate-size candidates")
            except OSError as exc:
                rows.append({"path": str(item["path"]), "action": "hash_error", "resolution_class": item["resolution_class"], "width": item["width"], "height": item["height"], "size_bytes": item["size"], "notes": str(exc)})

    log("Moving exact duplicate videos to one main duplicate folder")
    moved = 0
    for group in by_hash.values():
        existing = [item for item in group if item["path"].exists()]
        if len(existing) < 2:
            continue
        existing.sort(key=keep_score, reverse=True)
        kept = existing[0]
        rows.append({"path": str(kept["path"]), "action": "kept_duplicate_group_best_copy", "resolution_class": kept["resolution_class"], "width": kept["width"], "height": kept["height"], "size_bytes": kept["size"], "notes": f"Kept best copy among {len(existing)} exact duplicates"})
        for dup in existing[1:]:
            target = move_duplicate(dup, kept)
            moved += 1
            rows.append({"path": str(dup["path"]), "action": "moved_exact_duplicate_video", "resolution_class": dup["resolution_class"], "width": dup["width"], "height": dup["height"], "size_bytes": dup["size"], "notes": f"Moved to {target}; exact duplicate of {kept['path']}"})

    log("Removing empty folders left behind")
    removed_dirs = remove_empty_dirs()
    for folder in removed_dirs:
        rows.append({"path": str(folder), "action": "removed_empty_folder", "resolution_class": "", "width": "", "height": "", "size_bytes": "", "notes": "Folder became empty after duplicate moves"})

    log("Writing reports")
    # Add classification rows for all videos that were not duplicate-action rows.
    action_paths = {row["path"] for row in rows if row["action"] in {"moved_exact_duplicate_video", "kept_duplicate_group_best_copy"}}
    for item in videos:
        if str(item["path"]) in action_paths:
            continue
        rows.append({"path": str(item["path"]), "action": "classified_video", "resolution_class": item["resolution_class"], "width": item["width"], "height": item["height"], "size_bytes": item["size"], "notes": item.get("probe_error", "")})

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["path", "action", "resolution_class", "width", "height", "size_bytes", "notes"])
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(item["resolution_class"] for item in videos)
    actions = Counter(row["action"] for row in rows)
    lines = [
        f"Root: {ROOT}",
        f"Total videos scanned: {len(videos)}",
        f"Exact duplicate videos moved: {moved}",
        f"Empty folders removed: {len(removed_dirs)}",
        "",
        "Resolution classes by actual ffprobe dimensions:",
    ]
    for key in ["4K / above Full HD", "Full HD 1080p", "HD 720p below Full HD", "SD below Full HD", "Unknown resolution"]:
        lines.append(f"- {key}: {counts[key]}")
    lines.append("")
    lines.append("Actions:")
    for key, value in sorted(actions.items()):
        lines.append(f"- {key}: {value}")
    below = [item for item in videos if item["resolution_class"] in {"HD 720p below Full HD", "SD below Full HD"}]
    lines.append("")
    lines.append(f"Below Full HD videos: {len(below)}")
    for item in below[:80]:
        lines.append(f"- {item['resolution_class']} {item['width']}x{item['height']}: {item['path']}")
    SUMMARY.write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:20]))
    print(f"Report: {REPORT}")
    print(f"Summary: {SUMMARY}")


if __name__ == "__main__":
    main()
