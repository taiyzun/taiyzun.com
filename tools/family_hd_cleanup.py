#!/usr/bin/env python3
import csv
import hashlib
import os
import re
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Union


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-cleanup-report.csv")
AUDIT = Path("reports/family-hd-protocol-audit.csv")
SUMMARY = Path("reports/family-hd-cleanup-summary.txt")

DUP_VIDEO_ROOT = ROOT / "_Duplicate Videos - Review"
DUP_SUB_ROOT = ROOT / "_Duplicate Subtitles - Review"
JUNK_ROOT = ROOT / "_Junk Metadata - Review"

VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".wmv", ".webm", ".3gp", ".mpg", ".mpeg", ".ts", ".m2ts", ".vob"}
SUB_EXTS = {".srt", ".ass", ".ssa", ".sub", ".idx"}
SKIP_ROOTS = {
    "_Duplicate Videos - Review",
    "_Duplicate Subtitles - Review",
    "_Junk Metadata - Review",
    ".AppleDB",
    ".AppleDesktop",
    ".ArchiveServiceTemp.sb-f42ca32c-3Zy8Zj",
}


def rel(path: Path) -> Path:
    return path.relative_to(ROOT)


def unique_path(target: Path) -> Path:
    if not target.exists():
        return target
    suffixes = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffixes)] if suffixes else target.name
    for n in range(2, 10000):
        candidate = target.with_name(f"{stem} - {n}{suffixes}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"Could not find unique target for {target}")


def log(rows, old: Path, new: Union[Path, str], action: str, notes: str) -> None:
    rows.append({"Original Path": str(old), "Proposed Path": str(new), "Action": action, "Notes": notes})


def move_to_review(rows, src: Path, review_root: Path, action: str, notes: str) -> None:
    if not src.exists():
        return
    target = unique_path(review_root / rel(src))
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(target))
    log(rows, src, target, action, notes)


def rename_path(rows, src: Path, dst: Path, action: str, notes: str) -> Path:
    if not src.exists():
        return dst
    if src == dst:
        return dst
    if src.parent == dst.parent and src.name.lower() == dst.name.lower() and src.name != dst.name:
        tmp = unique_path(src.with_name(src.name + ".__tmp_case_rename__"))
        os.rename(src, tmp)
        src = tmp
    dst = unique_path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    os.rename(src, dst)
    log(rows, src, dst, action, notes)
    return dst


def clean_title_text(stem: str) -> str:
    stem = stem.replace("_", " ").replace("|", " ").replace("\\", " ")
    stem = re.sub(r"\s+", " ", stem).strip()
    stem = re.sub(r"\s*~\s*(\d{3,4}p)\s*\((?:FHD|HD|SD|QHD|4K|5K|8K)\)\s*$", r" - \1", stem, flags=re.I)
    stem = re.sub(r"\s*~\s*(\d{4})\s*~\s*", r" [\1] - ", stem)
    stem = re.sub(r"\s*~\s*", " - ", stem)
    stem = stem.replace("(FHD)", "").replace("(HD)", "").replace("(SD)", "").replace("(QHD)", "")
    stem = re.sub(r"\s+", " ", stem).strip(" -")
    words = []
    small = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"}
    for i, word in enumerate(stem.split()):
        if re.fullmatch(r"S\d{2}E\d{2}", word, re.I) or re.fullmatch(r"\d{3,4}p|4K|5K|8K", word, re.I):
            words.append(word.upper().replace("P", "p"))
        elif word.lower() in small and i:
            words.append(word.lower())
        elif re.fullmatch(r"[A-Z]{2,}", word):
            words.append(word)
        else:
            words.append(word[:1].upper() + word[1:].lower())
    return " ".join(words)


def normalize_loose_media_name(name: str) -> str:
    path = Path(name)
    stem = path.name[: -len(path.suffix)] if path.suffix else path.name
    stem = clean_title_text(stem)
    return stem + path.suffix.lower()


def is_inside_skipped(path: Path) -> bool:
    parts = rel(path).parts
    return bool(parts and parts[0] in SKIP_ROOTS)


def stage_metadata_junk(rows) -> None:
    for path in sorted(ROOT.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if path == ROOT or is_inside_skipped(path):
            continue
        name = path.name
        if name == ".DS_Store" or name.startswith("._") or (path.is_file() and path.stat().st_size == 0):
            move_to_review(rows, path, JUNK_ROOT, "moved_metadata_junk", "Finder AppleDouble, DS_Store, or zero-byte metadata staged for review.")


def rename_main_folders(rows) -> None:
    mapping = {
        "movieS": "Movies",
        "Tv": "TV",
        "videoS": "Videos",
        "mac video library": "Mac Video Library",
    }
    for old, new in mapping.items():
        rename_path(rows, ROOT / old, ROOT / new, "renamed_folder", "Top-level Family folder normalized.")
    nested = {
        "Videos/4k video downloader": "Videos/4K Video Downloader",
        "Videos/final cuT backupS localiZed 2": "Videos/Final Cut Backups.localized",
    }
    for old, new in nested.items():
        rename_path(rows, ROOT / old, ROOT / new, "renamed_folder", "Nested folder normalized.")


def clean_subs_folders(rows) -> None:
    for path in sorted(ROOT.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if path.is_dir() and not is_inside_skipped(path) and path.name == "SubS":
            rename_path(rows, path, path.with_name("Subs"), "renamed_folder", "Subtitle folder casing normalized.")


def normalize_loose_video_collections(rows) -> None:
    roots = [ROOT / "Videos", ROOT / "Mac Video Library", ROOT / "TV" / "eTc", ROOT / "TV" / "X"]
    for base in roots:
        if not base.exists():
            continue
        for path in list(base.rglob("*")):
            if not path.is_file() or is_inside_skipped(path):
                continue
            if any(part.endswith(".fcpbundle") or part.endswith(".app") or part.endswith(".localized") for part in rel(path).parts):
                continue
            if path.suffix.lower() not in VIDEO_EXTS and path.suffix.lower() not in {".mp3", ".m4a"}:
                continue
            new_name = normalize_loose_media_name(path.name)
            if new_name != path.name:
                rename_path(rows, path, path.with_name(new_name), "renamed_file", "Loose media filename normalized; extension preserved.")


def stage_duplicate_subtitles(rows) -> None:
    candidates = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or is_inside_skipped(path) or path.suffix.lower() not in SUB_EXTS:
            continue
        if re.search(r" - (Copy|Version) \d+", path.stem, re.I) or path.name.startswith("._"):
            candidates.append(path)
    by_key = defaultdict(list)
    for path in candidates:
        key = re.sub(r" - (Copy|Version) \d+", "", path.stem, flags=re.I).lower(), path.suffix.lower(), path.stat().st_size
        by_key[key].append(path)
    for group in by_key.values():
        for path in group:
            move_to_review(rows, path, DUP_SUB_ROOT, "moved_duplicate_subtitle", "Subtitle copy/version clutter staged for review.")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024 * 4), b""):
            h.update(chunk)
    return h.hexdigest()


def video_keep_score(path: Path) -> tuple[int, int]:
    text = str(path)
    score = 0
    if "_Duplicate Videos - Review" not in text:
        score += 100
    if "/Movies/" in text:
        score += 20
    if " - 4K" in text:
        score += 40
    elif " - 1080p" in text:
        score += 30
    elif " - 720p" in text:
        score += 20
    return score, path.stat().st_size


def stage_exact_duplicate_videos(rows) -> None:
    by_size = defaultdict(list)
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in VIDEO_EXTS or is_inside_skipped(path):
            continue
        try:
            size = path.stat().st_size
        except OSError:
            continue
        if size:
            by_size[size].append(path)
    by_hash = defaultdict(list)
    for group in by_size.values():
        if len(group) < 2:
            continue
        for path in group:
            if path.exists():
                by_hash[sha256(path)].append(path)
    for group in by_hash.values():
        existing = [p for p in group if p.exists()]
        if len(existing) < 2:
            continue
        existing.sort(key=video_keep_score, reverse=True)
        kept = existing[0]
        log(rows, kept, kept, "kept_duplicate_video_best_copy", f"Best copy kept among {len(existing)} exact duplicates.")
        for dup in existing[1:]:
            move_to_review(rows, dup, DUP_VIDEO_ROOT, "moved_duplicate_video", f"Exact duplicate of {kept}.")


def remove_empty_dirs(rows) -> None:
    for dirpath, _, _ in os.walk(ROOT, topdown=False):
        path = Path(dirpath)
        if path == ROOT or is_inside_skipped(path):
            continue
        try:
            if path.is_dir() and not any(path.iterdir()):
                path.rmdir()
                log(rows, path, "", "removed_empty_folder", "Empty folder removed after cleanup.")
        except OSError:
            pass


def audit() -> list[dict]:
    bad = []
    tokens = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]
    for path in ROOT.rglob("*"):
        if path.name.startswith(".") or is_inside_skipped(path):
            continue
        issues = []
        name = path.name
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
            bad.append({"Path": str(path), "Issues": "; ".join(dict.fromkeys(issues))})
    return bad


def main() -> None:
    if not ROOT.exists():
        raise SystemExit(f"Missing {ROOT}")
    rows = []
    stage_metadata_junk(rows)
    rename_main_folders(rows)
    clean_subs_folders(rows)
    normalize_loose_video_collections(rows)
    stage_duplicate_subtitles(rows)
    stage_exact_duplicate_videos(rows)
    remove_empty_dirs(rows)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    audit_rows = audit()
    with AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(audit_rows)

    summary = [
        f"Root: {ROOT}",
        f"Actions: {len(rows)}",
        f"Metadata junk staged: {sum(1 for r in rows if r['Action'] == 'moved_metadata_junk')}",
        f"Duplicate subtitles staged: {sum(1 for r in rows if r['Action'] == 'moved_duplicate_subtitle')}",
        f"Duplicate videos staged: {sum(1 for r in rows if r['Action'] == 'moved_duplicate_video')}",
        f"Folders renamed: {sum(1 for r in rows if r['Action'] == 'renamed_folder')}",
        f"Files renamed: {sum(1 for r in rows if r['Action'] == 'renamed_file')}",
        f"Empty folders removed: {sum(1 for r in rows if r['Action'] == 'removed_empty_folder')}",
        f"Audit issues remaining outside review/system folders: {len(audit_rows)}",
    ]
    SUMMARY.write_text("\n".join(summary) + "\n", encoding="utf-8")
    print("\n".join(summary))
    print(f"Report: {REPORT}")
    print(f"Audit: {AUDIT}")


if __name__ == "__main__":
    main()
