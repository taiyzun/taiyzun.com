#!/usr/bin/env python3
import csv
import hashlib
import os
import re
import shutil
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path("/Volumes/Family/movieS")
REPORT = Path("reports/movie-final-full-cleanup-report.csv")
VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"}
SUB_EXTS = {".srt", ".sub", ".idx", ".ass", ".ssa"}
MEDIA_EXTS = VIDEO_EXTS | SUB_EXTS
JUNK_NAMES = {".DS_Store", "YIFYStatus.com.txt", "YTS.BZ - Official site.jpg", "YTSProxies.com.txt"}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def sha256(p):
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_text(s):
    s = s.replace("\\", " ~ ").replace("/", " ~ ").replace(":", " ~ ").replace("|", " ").replace("_", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def title_case(s):
    small = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"}
    words = []
    for w in clean_text(s).split():
        if re.fullmatch(r"[A-Z]{2,}", w) or re.fullmatch(r"[IVXLCDM]+", w, re.I):
            words.append(w.upper())
        elif w.lower() in small and words:
            words.append(w.lower())
        else:
            words.append(w[:1].upper() + w[1:].lower())
    out = " ".join(words)
    fixes = {"I S S": "I.S.S.", "M I A": "M.I.A.", "Qb": "QB", "Dc": "DC", "Ii": "II", "Iii": "III", "Iv": "IV", "DID": "Did"}
    for old, new in fixes.items():
        out = re.sub(rf"\b{re.escape(old)}\b", new, out)
    return out


def standard_tag(v):
    k = re.sub(r"\s+", "", v.lower())
    return {
        "2160p": "4K", "4k": "4K", "uhd": "4K",
        "uhdbluray": "UHD BluRay", "bluray": "BluRay",
        "webrip": "WEBRip", "web-dl": "WEB-DL", "webdl": "WEB-DL",
        "brrip": "BRRip", "hdtv": "HDTV",
    }.get(k, v)


def quality_for(*vals):
    t = " ".join(str(v) for v in vals if v).lower()
    t = re.sub(r"[._()\[\]\-]+", " ", t)
    res = ""
    if re.search(r"\b(2160p|4k|uhd)\b", t):
        res = "4K"
    elif re.search(r"\b(1080p|fhd)\b", t):
        res = "1080p"
    elif re.search(r"\b(720p|hd)\b", t):
        res = "720p"
    elif re.search(r"\b(480p|sd)\b", t):
        res = "480p"
    src = ""
    if re.search(r"\buhd\b.*\bbluray\b|\bbluray\b.*\buhd\b", t):
        src = "UHD BluRay"
    elif re.search(r"\bblu ?ray\b|\bbluray\b", t):
        src = "BluRay"
    elif re.search(r"\bweb ?dl\b", t):
        src = "WEB-DL"
    elif re.search(r"\bweb ?rip\b", t):
        src = "WEBRip"
    elif re.search(r"\bbrrip\b", t):
        src = "BRRip"
    elif re.search(r"\bhdtv\b", t):
        src = "HDTV"
    return " ".join(x for x in (res, src) if x)


def parse_title_year(name):
    stem = Path(name).stem
    stem = re.sub(r"\]+", "]", stem)
    # Special malformed case: [2073] - 2024...
    m = re.match(r"^\[(.+?)\]\s*-\s*(19\d{2}|20\d{2})", stem)
    if m:
        return title_case(m.group(1)), m.group(2)
    m = re.search(r"\b(19\d{2}|20\d{2})\b", stem)
    if not m:
        return None
    year = m.group(1)
    title = stem[:m.start()]
    title = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", title)
    title = re.sub(r"[~,\-\[\]\(\)]+$", " ", title)
    title = title_case(title)
    return (title, year) if title else None


def base_name_for(folder):
    parsed = parse_title_year(folder.name)
    first_video = None
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
            first_video = p
            if not parsed:
                parsed = parse_title_year(p.name)
            break
    if not parsed:
        return None
    title, year = parsed
    q = quality_for(folder.name, first_video.name if first_video else "")
    base = f"{title} [{year}]"
    if q:
        base += f" - {q}"
    return base


def normalize_name(name):
    ext = Path(name).suffix
    stem = name[:-len(ext)] if ext else name
    parsed = parse_title_year(stem)
    if parsed:
        title, year = parsed
        q = quality_for(stem)
        out = f"{title} [{year}]"
        if q:
            out += f" - {q}"
    else:
        out = clean_text(stem)
        out = re.sub(r"\((19\d{2}|20\d{2})\)", r"[\1]", out)
        out = re.sub(r"\]\s+\[", "] - ", out)
        out = re.sub(r"\[\s*(4K|2160p|1080p|720p|480p|UHD BluRay|BluRay|WEBRip|WEB-DL|BRRip|HDTV)\s*\]", lambda m: " - " + standard_tag(m.group(1)), out, flags=re.I)
        out = re.sub(r"\[(?!19\d{2}\]|20\d{2}\])([^\]]+)\]", r"\1", out)
        out = re.sub(r"\s+-\s+-\s+", " - ", out)
        out = re.sub(r"\s+", " ", out).strip(" -")
    return out + ext


def subtitle_suffix(name):
    low = name.lower()
    if "forced" in low and ("eng" in low or "english" in low):
        return " - English Forced"
    if ("sdh" in low or " hi" in low) and ("eng" in low or "english" in low):
        return " - English SDH"
    if "eng" in low or "english" in low:
        return " - English"
    langs = [("spanish", "Spanish"), ("french", "French"), ("german", "German"), ("arabic", "Arabic")]
    for token, label in langs:
        if token in low:
            return f" - {label}"
    return ""


def unique_path(target):
    if not target.exists():
        return target
    stem, suffix = target.stem, target.suffix
    n = 2
    while True:
        c = target.with_name(f"{stem} - Version {n}{suffix}")
        if not c.exists():
            return c
        n += 1


def on_rm_error(func, path, exc):
    if isinstance(exc[1], FileNotFoundError):
        return
    raise exc[1]


def has_video(folder):
    return any(p.is_file() and p.suffix.lower() in VIDEO_EXTS for p in folder.rglob("*"))


def write_report(rows):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["path", "new_path", "action", "notes"])
        w.writeheader()
        w.writerows(rows)


def delete_junk_and_zero(rows):
    log("Deleting sidecars, release junk, and zero-byte files")
    for p in list(ROOT.rglob("*")):
        if not p.is_file():
            continue
        try:
            size = p.stat().st_size
        except OSError:
            continue
        if p.name == ".DS_Store" or p.name.startswith("._") or p.name in JUNK_NAMES or size == 0:
            try:
                p.unlink()
                rows.append({"path": str(p), "new_path": "", "action": "deleted_junk_or_zero", "notes": "Sidecar/release junk or zero-byte file."})
            except OSError as e:
                rows.append({"path": str(p), "new_path": "", "action": "skipped", "notes": f"Could not delete junk/zero: {e}"})


def rename_top_folders(rows):
    log("Renaming top-level folders")
    for i, folder in enumerate([p for p in ROOT.iterdir() if p.is_dir()], 1):
        if i % 50 == 0:
            log(f"Folder rename checked {i}")
            write_report(rows)
        base = base_name_for(folder)
        if not base:
            continue
        target = folder.with_name(base)
        if target == folder:
            continue
        if target.exists():
            target = unique_path(target)
        folder.rename(target)
        rows.append({"path": str(folder), "new_path": str(target), "action": "renamed_folder", "notes": "Top-level folder normalized; conflict became Version N."})


def rename_media_files(rows):
    log("Renaming media/subtitle files recursively")
    folders = [p for p in ROOT.iterdir() if p.is_dir()]
    for i, folder in enumerate(folders, 1):
        if i % 50 == 0:
            log(f"Media rename processed {i}/{len(folders)} folders")
            write_report(rows)
        base = base_name_for(folder) or normalize_name(folder.name)
        for p in list(folder.rglob("*")):
            if not p.is_file() or p.suffix.lower() not in MEDIA_EXTS:
                continue
            ext = p.suffix.lower() if p.suffix.lower() in SUB_EXTS else p.suffix
            suffix = subtitle_suffix(p.name) if ext.lower() in SUB_EXTS else ""
            target = p.with_name(f"{base}{suffix}{ext}")
            if target == p:
                continue
            target = unique_path(target)
            p.rename(target)
            rows.append({"path": str(p), "new_path": str(target), "action": "renamed_media_file", "notes": "Media/subtitle normalized to movie base."})


def delete_exact_duplicates(rows):
    log("Deleting exact duplicate files by SHA-256")
    by_size = defaultdict(list)
    for p in ROOT.rglob("*"):
        if p.is_file() and p.suffix.lower() in MEDIA_EXTS:
            try:
                by_size[p.stat().st_size].append(p)
            except OSError:
                pass
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
            except OSError:
                pass
    for group in by_hash.values():
        existing = [p for p in group if p.exists()]
        if len(existing) < 2:
            continue
        existing.sort(key=lambda p: (" - Version " in str(p), "Duplicate" in str(p), len(str(p))))
        keep = existing[0]
        for dup in existing[1:]:
            if dup.exists():
                dup.unlink()
                rows.append({"path": str(dup), "new_path": "", "action": "deleted_exact_duplicate", "notes": f"Exact duplicate of {keep}"})


def collapse_duplicate_folders(rows):
    log("Collapsing remaining duplicate/version folders")
    for folder in list(ROOT.iterdir()):
        if not folder.is_dir() or not re.search(r" - (Duplicate|Version) \d+$", folder.name):
            continue
        base_name = re.sub(r" - (Duplicate|Version) \d+$", "", folder.name)
        base = ROOT / base_name
        if not base.exists():
            folder.rename(base)
            rows.append({"path": str(folder), "new_path": str(base), "action": "renamed_duplicate_folder_to_base", "notes": "Base folder did not exist."})
            continue
        # Move unique media into base as Version files, then delete the duplicate folder.
        for p in list(folder.rglob("*")):
            if not p.is_file():
                continue
            if p.suffix.lower() in MEDIA_EXTS:
                target = unique_path(base / p.name)
                target.parent.mkdir(parents=True, exist_ok=True)
                p.rename(target)
                rows.append({"path": str(p), "new_path": str(target), "action": "moved_unique_media_from_duplicate_folder", "notes": "Moved into base folder with unique name."})
        shutil.rmtree(folder, onerror=on_rm_error)
        rows.append({"path": str(folder), "new_path": "", "action": "deleted_duplicate_folder", "notes": "Duplicate/version folder collapsed into base."})


def remove_no_movie_and_empty(rows):
    log("Removing no-movie and empty folders")
    for folder in list(ROOT.iterdir()):
        if folder.is_dir() and not has_video(folder):
            shutil.rmtree(folder, onerror=on_rm_error)
            rows.append({"path": str(folder), "new_path": "", "action": "deleted_no_movie_folder", "notes": "No video files in subtree."})
    dirs = [p for p in ROOT.rglob("*") if p.is_dir()]
    for d in sorted(dirs, key=lambda p: len(str(p)), reverse=True):
        try:
            if d.exists() and not any(d.iterdir()):
                d.rmdir()
                rows.append({"path": str(d), "new_path": "", "action": "deleted_empty_folder", "notes": "Folder was empty."})
        except OSError:
            pass


def audit(rows):
    log("Final audit")
    issues = 0
    for p in ROOT.rglob("*"):
        name = p.name
        if name.startswith("._") or name == ".DS_Store":
            issues += 1
        if re.search(r"\]\s+\[", name) or "_" in name or re.search(r"\((19\d{2}|20\d{2}|1080p|720p|480p|FHD|HD|SD)[^)]*\)", name, re.I):
            issues += 1
        if p.is_file():
            try:
                if p.stat().st_size == 0:
                    issues += 1
            except OSError:
                pass
    rows.append({"path": str(ROOT), "new_path": "", "action": "final_audit", "notes": f"Remaining simple naming/sidecar/zero issues counted: {issues}"})
    return issues


def main():
    rows = []
    delete_junk_and_zero(rows)
    rename_top_folders(rows)
    rename_media_files(rows)
    delete_exact_duplicates(rows)
    collapse_duplicate_folders(rows)
    # Rename media once more after collapsing.
    rename_media_files(rows)
    delete_exact_duplicates(rows)
    remove_no_movie_and_empty(rows)
    issues = audit(rows)
    write_report(rows)
    summary = defaultdict(int)
    for r in rows:
        summary[r["action"]] += 1
    log(f"Done. Remaining audit issues: {issues}. Summary: {dict(summary)}")
    print(f"Report: {REPORT}", flush=True)


if __name__ == "__main__":
    main()
