#!/usr/bin/env python3
import csv
import hashlib
import os
import re
import shutil
import time
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-targeted-cleanup-report.csv")
AUDIT = Path("reports/family-hd-targeted-audit.csv")
SUMMARY = Path("reports/family-hd-targeted-summary.txt")

JUNK_ROOT = ROOT / "_Junk Metadata - Review"
DUP_SUB_ROOT = ROOT / "_Duplicate Subtitles - Review"
DUP_VIDEO_ROOT = ROOT / "_Duplicate Videos - Review"

ACTIVE_ROOTS = [ROOT / "Movies", ROOT / "TV", ROOT / "Videos", ROOT / "Mac Video Library", ROOT / "SG BU"]
PRUNE_SUFFIXES = (".localized", ".fcpbundle", ".app", ".movpkg", ".tvlibrary", ".imovielibrary", ".theater")
PRUNE_NAMES = {"_Junk Metadata - Review", "_Duplicate Videos - Review", "_Duplicate Subtitles - Review", ".AppleDB", ".AppleDesktop"}
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".wmv", ".webm", ".3gp", ".mpg", ".mpeg", ".ts", ".m2ts", ".vob"}
SUB_EXTS = {".srt", ".ass", ".ssa", ".sub", ".idx"}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


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
    raise RuntimeError(f"No unique path for {target}")


def add(rows, old, new, action, notes):
    rows.append({"Original Path": str(old), "Proposed Path": str(new), "Action": action, "Notes": notes})


def move_review(rows, src, review_root, action, notes):
    if not src.exists():
        return
    target = unique_path(review_root / rel(src))
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(target))
    add(rows, src, target, action, notes)


def rename_path(rows, src, dst, action, notes):
    if not src.exists() or src == dst:
        return
    if src.parent == dst.parent and src.name.lower() == dst.name.lower():
        tmp = unique_path(src.with_name(src.name + ".__tmp__"))
        os.rename(src, tmp)
        src = tmp
    dst = unique_path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    os.rename(src, dst)
    add(rows, src, dst, action, notes)


def should_prune_dir(name):
    return name in PRUNE_NAMES or name.startswith("._") or name.endswith(PRUNE_SUFFIXES)


def walk_active():
    for base in ACTIVE_ROOTS:
        if not base.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if not should_prune_dir(d)]
            yield Path(dirpath), dirnames, filenames


def title_words(text):
    text = text.replace("_", " ").replace("|", " ").replace("\\", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s*~\s*(\d{4})\s*~\s*", r" [\1] - ", text)
    text = re.sub(r"\s*~\s*(\d{3,4}p|4K|5K|8K)\s*\([^)]*\)\s*$", r" - \1", text, flags=re.I)
    text = re.sub(r"\s*~\s*", " - ", text)
    text = re.sub(r"\((?:FHD|HD|SD|QHD|4K|5K|8K)\)", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" -")
    small = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"}
    out = []
    for i, word in enumerate(text.split()):
        if re.fullmatch(r"\d{3,4}p|4K|5K|8K", word, re.I):
            out.append(word.upper().replace("P", "p"))
        elif re.fullmatch(r"[A-Z]{2,}", word):
            out.append(word)
        elif word.lower() in small and i:
            out.append(word.lower())
        else:
            out.append(word[:1].upper() + word[1:].lower())
    return " ".join(out)


def normalized_media_name(name):
    p = Path(name)
    stem = name[: -len(p.suffix)] if p.suffix else name
    return title_words(stem) + p.suffix.lower()


def stage_metadata(rows):
    log("Staging AppleDouble and DS_Store files")
    count = 0
    for current, _, filenames in walk_active():
        for filename in filenames:
            if filename == ".DS_Store" or filename.startswith("._"):
                move_review(rows, current / filename, JUNK_ROOT, "moved_metadata_junk", "AppleDouble or DS_Store staged for review.")
                count += 1
                if count % 500 == 0:
                    log(f"Metadata staged: {count}")


def rename_subs_dirs(rows):
    for current, dirnames, _ in walk_active():
        for dirname in list(dirnames):
            if dirname == "SubS":
                rename_path(rows, current / dirname, current / "Subs", "renamed_folder", "Subtitle folder casing normalized.")


def rename_loose_media(rows):
    log("Renaming loose media in Videos and Mac Video Library")
    count = 0
    for current, _, filenames in walk_active():
        first = rel(current).parts[0]
        if first not in {"Videos", "Mac Video Library"}:
            continue
        for filename in filenames:
            path = current / filename
            if path.suffix.lower() not in VIDEO_EXTS and path.suffix.lower() not in {".mp3", ".m4a"}:
                continue
            new_name = normalized_media_name(filename)
            if new_name != filename:
                rename_path(rows, path, current / new_name, "renamed_file", "Loose media filename normalized.")
                count += 1
                if count % 250 == 0:
                    log(f"Loose media renamed: {count}")


def stage_subtitle_clutter(rows):
    log("Staging subtitle copy/version clutter")
    count = 0
    for current, _, filenames in walk_active():
        for filename in filenames:
            if Path(filename).suffix.lower() in SUB_EXTS and re.search(r" - (Copy|Version) \d+", filename, re.I):
                move_review(rows, current / filename, DUP_SUB_ROOT, "moved_duplicate_subtitle", "Subtitle copy/version clutter staged for review.")
                count += 1
                if count % 500 == 0:
                    log(f"Subtitle clutter staged: {count}")


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024 * 4), b""):
            h.update(chunk)
    return h.hexdigest()


def duplicate_videos(rows):
    log("Indexing duplicate video candidates")
    by_size = defaultdict(list)
    scanned = 0
    for current, _, filenames in walk_active():
        for filename in filenames:
            path = current / filename
            if path.suffix.lower() not in VIDEO_EXTS:
                continue
            try:
                size = path.stat().st_size
            except OSError:
                continue
            if size:
                by_size[size].append(path)
            scanned += 1
            if scanned % 500 == 0:
                log(f"Videos indexed: {scanned}")
    candidates = [g for g in by_size.values() if len(g) > 1]
    add(rows, ROOT, "", "duplicate_video_candidates", f"{len(candidates)} same-size groups; {sum(len(g) for g in candidates)} files to hash.")
    by_hash = defaultdict(list)
    hashed = 0
    total = sum(len(g) for g in candidates)
    for group in candidates:
        for path in group:
            if path.exists():
                by_hash[sha256(path)].append(path)
                hashed += 1
                if hashed % 100 == 0:
                    log(f"Duplicate candidates hashed: {hashed}/{total}")
    moved = 0
    for group in by_hash.values():
        existing = [p for p in group if p.exists()]
        if len(existing) < 2:
            continue
        existing.sort(key=lambda p: ("/Movies/" in str(p), "/TV/" in str(p), p.stat().st_size), reverse=True)
        keep = existing[0]
        add(rows, keep, keep, "kept_duplicate_video_best_copy", f"Best copy kept among {len(existing)} exact duplicates.")
        for dup in existing[1:]:
            move_review(rows, dup, DUP_VIDEO_ROOT, "moved_duplicate_video", f"Exact duplicate of {keep}.")
            moved += 1
    log(f"Duplicate videos moved: {moved}")


def remove_empty(rows):
    log("Removing empty folders")
    removed = 0
    for base in ACTIVE_ROOTS:
        if not base.exists():
            continue
        for dirpath, dirnames, _ in os.walk(base, topdown=False):
            path = Path(dirpath)
            if any(part in PRUNE_NAMES for part in rel(path).parts):
                continue
            try:
                if path.is_dir() and not any(path.iterdir()):
                    path.rmdir()
                    add(rows, path, "", "removed_empty_folder", "Empty folder removed after cleanup.")
                    removed += 1
            except OSError:
                pass
    log(f"Empty folders removed: {removed}")


def audit():
    rows = []
    tokens = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]
    for current, dirnames, filenames in walk_active():
        for name in list(dirnames) + filenames:
            if name.startswith("."):
                continue
            issues = []
            low = name.lower()
            if "_" in name:
                issues.append("underscore")
            if "(" in name or ")" in name:
                issues.append("round brackets")
            if "|" in name or "\\" in name:
                issues.append("slash or pipe")
            for token in tokens:
                if token in low:
                    issues.append("generic token: " + token)
            if issues:
                rows.append({"Path": str(current / name), "Issues": "; ".join(dict.fromkeys(issues))})
    return rows


def main():
    rows = []
    stage_metadata(rows)
    rename_subs_dirs(rows)
    rename_loose_media(rows)
    stage_subtitle_clutter(rows)
    duplicate_videos(rows)
    remove_empty(rows)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    ar = audit()
    with AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(ar)

    counts = Counter(r["Action"] for r in rows)
    lines = [
        f"Root: {ROOT}",
        f"Actions: {len(rows)}",
        f"Metadata junk staged: {counts['moved_metadata_junk']}",
        f"Folders renamed: {counts['renamed_folder']}",
        f"Files renamed: {counts['renamed_file']}",
        f"Duplicate subtitles staged: {counts['moved_duplicate_subtitle']}",
        f"Duplicate videos moved: {counts['moved_duplicate_video']}",
        f"Empty folders removed: {counts['removed_empty_folder']}",
        f"Audit issues remaining in targeted active scope: {len(ar)}",
        f"Report: {REPORT}",
        f"Audit: {AUDIT}",
    ]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
