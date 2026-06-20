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
REPORT = Path("reports/family-hd-streaming-cleanup-report.csv")
AUDIT = Path("reports/family-hd-streaming-audit.csv")
SUMMARY = Path("reports/family-hd-streaming-summary.txt")

DUP_VIDEO_ROOT = ROOT / "_Duplicate Videos - Review"
DUP_SUB_ROOT = ROOT / "_Duplicate Subtitles - Review"
JUNK_ROOT = ROOT / "_Junk Metadata - Review"

VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".wmv", ".webm", ".3gp", ".mpg", ".mpeg", ".ts", ".m2ts", ".vob"}
SUB_EXTS = {".srt", ".ass", ".ssa", ".sub", ".idx"}
LOOSE_MEDIA_ROOTS = {"Videos", "Mac Video Library"}
SYSTEM_ROOTS = {".AppleDB", ".AppleDesktop", ".ArchiveServiceTemp.sb-f42ca32c-3Zy8Zj"}
REVIEW_ROOTS = {"_Duplicate Videos - Review", "_Duplicate Subtitles - Review", "_Junk Metadata - Review"}


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def rel(path: Path) -> Path:
    return path.relative_to(ROOT)


def skip_path(path: Path) -> bool:
    try:
        first = rel(path).parts[0]
    except IndexError:
        return False
    return first in SYSTEM_ROOTS or first in REVIEW_ROOTS


def unique_path(target: Path) -> Path:
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 10000):
        candidate = target.with_name(f"{stem} - {n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"No unique path for {target}")


def add(rows, old: Path, new, action: str, notes: str) -> None:
    rows.append({"Original Path": str(old), "Proposed Path": str(new), "Action": action, "Notes": notes})


def flush(rows) -> None:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)


def move_review(rows, src: Path, root: Path, action: str, notes: str) -> None:
    if not src.exists():
        return
    target = unique_path(root / rel(src))
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(target))
    add(rows, src, target, action, notes)


def rename_path(rows, src: Path, dst: Path, action: str, notes: str) -> Path:
    if not src.exists() or src == dst:
        return dst
    if src.parent == dst.parent and src.name.lower() == dst.name.lower():
        tmp = unique_path(src.with_name(src.name + ".__tmp__"))
        os.rename(src, tmp)
        src = tmp
    dst = unique_path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    os.rename(src, dst)
    add(rows, src, dst, action, notes)
    return dst


def rename_main_folders(rows) -> None:
    log("Renaming top-level folders")
    for old, new in {
        "movieS": "Movies",
        "Tv": "TV",
        "videoS": "Videos",
        "mac video library": "Mac Video Library",
    }.items():
        rename_path(rows, ROOT / old, ROOT / new, "renamed_folder", "Top-level Family folder normalized.")
    for old, new in {
        "Videos/4k video downloader": "Videos/4K Video Downloader",
        "Videos/final cuT backupS localiZed 2": "Videos/Final Cut Backups.localized",
    }.items():
        rename_path(rows, ROOT / old, ROOT / new, "renamed_folder", "Nested folder normalized.")


def title_words(text: str) -> str:
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


def normalized_media_name(name: str) -> str:
    p = Path(name)
    stem = name[: -len(p.suffix)] if p.suffix else name
    return title_words(stem) + p.suffix.lower()


def stream_paths():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        dirnames[:] = [d for d in dirnames if d not in SYSTEM_ROOTS and d not in REVIEW_ROOTS]
        if skip_path(current):
            continue
        yield current, dirnames, filenames


def stage_metadata(rows) -> None:
    log("Staging metadata junk")
    count = 0
    for current, dirnames, filenames in stream_paths():
        for filename in list(filenames):
            path = current / filename
            try:
                is_zero = path.is_file() and path.stat().st_size == 0
            except OSError:
                is_zero = False
            if filename == ".DS_Store" or filename.startswith("._") or is_zero:
                move_review(rows, path, JUNK_ROOT, "moved_metadata_junk", "Finder AppleDouble, DS_Store, or zero-byte metadata staged for review.")
                count += 1
                if count % 500 == 0:
                    log(f"Metadata staged: {count}")
                    flush(rows)


def rename_subs_dirs(rows) -> None:
    log("Renaming subtitle folders")
    for current, dirnames, _ in stream_paths():
        for dirname in list(dirnames):
            if dirname == "SubS":
                rename_path(rows, current / dirname, current / "Subs", "renamed_folder", "Subtitle folder casing normalized.")


def rename_loose_media(rows) -> None:
    log("Renaming loose media collections")
    count = 0
    for current, _, filenames in stream_paths():
        parts = rel(current).parts
        if not parts or parts[0] not in LOOSE_MEDIA_ROOTS:
            continue
        if any(part.endswith(".app") or part.endswith(".fcpbundle") or part.endswith(".localized") for part in parts):
            continue
        for filename in filenames:
            path = current / filename
            if path.suffix.lower() not in VIDEO_EXTS and path.suffix.lower() not in {".mp3", ".m4a"}:
                continue
            new = normalized_media_name(filename)
            if new != filename:
                rename_path(rows, path, current / new, "renamed_file", "Loose media filename normalized.")
                count += 1
                if count % 250 == 0:
                    log(f"Loose media renamed: {count}")
                    flush(rows)


def stage_subtitle_clutter(rows) -> None:
    log("Staging subtitle copy/version clutter")
    count = 0
    for current, _, filenames in stream_paths():
        for filename in filenames:
            if not filename.lower().endswith(tuple(SUB_EXTS)):
                continue
            if re.search(r" - (Copy|Version) \d+", filename, re.I):
                move_review(rows, current / filename, DUP_SUB_ROOT, "moved_duplicate_subtitle", "Subtitle copy/version clutter staged for review.")
                count += 1
                if count % 500 == 0:
                    log(f"Subtitle clutter staged: {count}")
                    flush(rows)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024 * 4), b""):
            h.update(chunk)
    return h.hexdigest()


def duplicate_video_pass(rows) -> None:
    log("Indexing video sizes for duplicate candidates")
    by_size = defaultdict(list)
    scanned = 0
    for current, _, filenames in stream_paths():
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
    candidates = [group for group in by_size.values() if len(group) > 1]
    candidate_files = sum(len(g) for g in candidates)
    add(rows, ROOT, "", "duplicate_video_candidates", f"{len(candidates)} same-size groups; {candidate_files} files to hash.")
    log(f"Hashing duplicate candidates: {candidate_files} files")
    by_hash = defaultdict(list)
    hashed = 0
    for group in candidates:
        for path in group:
            if path.exists():
                by_hash[sha256(path)].append(path)
                hashed += 1
                if hashed % 100 == 0:
                    log(f"Duplicate candidates hashed: {hashed}/{candidate_files}")
                    flush(rows)
    moved = 0
    for group in by_hash.values():
        existing = [p for p in group if p.exists()]
        if len(existing) < 2:
            continue
        existing.sort(key=lambda p: (("_Duplicate" not in str(p)), ("/Movies/" in str(p)), p.stat().st_size), reverse=True)
        kept = existing[0]
        add(rows, kept, kept, "kept_duplicate_video_best_copy", f"Best copy kept among {len(existing)} exact duplicates.")
        for dup in existing[1:]:
            move_review(rows, dup, DUP_VIDEO_ROOT, "moved_duplicate_video", f"Exact duplicate of {kept}.")
            moved += 1
    log(f"Duplicate videos moved: {moved}")


def remove_empty_dirs(rows) -> None:
    log("Removing empty folders")
    removed = 0
    for dirpath, dirnames, _ in os.walk(ROOT, topdown=False):
        path = Path(dirpath)
        if path == ROOT or skip_path(path):
            continue
        try:
            if path.is_dir() and not any(path.iterdir()):
                path.rmdir()
                add(rows, path, "", "removed_empty_folder", "Empty folder removed after cleanup.")
                removed += 1
        except OSError:
            pass
    log(f"Empty folders removed: {removed}")


def audit_rows():
    tokens = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]
    rows = []
    for current, dirnames, filenames in stream_paths():
        names = list(dirnames) + filenames
        for name in names:
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


def main() -> None:
    rows = []
    rename_main_folders(rows)
    stage_metadata(rows)
    rename_subs_dirs(rows)
    rename_loose_media(rows)
    stage_subtitle_clutter(rows)
    duplicate_video_pass(rows)
    remove_empty_dirs(rows)
    flush(rows)

    ar = audit_rows()
    with AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(ar)

    counts = Counter(r["Action"] for r in rows)
    lines = [
        f"Root: {ROOT}",
        f"Actions: {len(rows)}",
        f"Folders renamed: {counts['renamed_folder']}",
        f"Files renamed: {counts['renamed_file']}",
        f"Metadata junk staged: {counts['moved_metadata_junk']}",
        f"Duplicate subtitles staged: {counts['moved_duplicate_subtitle']}",
        f"Duplicate videos moved: {counts['moved_duplicate_video']}",
        f"Empty folders removed: {counts['removed_empty_folder']}",
        f"Audit issues remaining outside review/system folders: {len(ar)}",
        f"Report: {REPORT}",
        f"Audit: {AUDIT}",
    ]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
