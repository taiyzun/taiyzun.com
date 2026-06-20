#!/usr/bin/env python3
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path("/Volumes/Family/movieS")
REPORT = Path("reports/movie-full-cleanup-report.csv")
CACHE = Path("reports/movie-full-metadata-cache.json")

VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"}
SUB_EXTS = {".srt", ".sub", ".idx", ".ass", ".ssa"}
MEDIA_EXTS = VIDEO_EXTS | SUB_EXTS
SKIP_RENAME_DIRS = {
    "_Cleanup Review - Check Before Delete",
    "_Manual Review - Check Before Delete",
}


def log(message):
    print(f"[{time.strftime('%H:%M:%S')}] {message}", flush=True)


def safe_name(value):
    value = value.replace("\\", " ~ ").replace("/", " ~ ").replace(":", " ~ ").replace("|", " ")
    value = value.replace("_", " ")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def title_case(value):
    small = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"}
    out = []
    for word in safe_name(value).split():
        if re.fullmatch(r"[A-Z]{2,}", word) or re.fullmatch(r"[IVXLCDM]+", word, re.I):
            out.append(word.upper())
        elif word.lower() in small and out:
            out.append(word.lower())
        else:
            out.append(word[:1].upper() + word[1:].lower())
    text = " ".join(out)
    fixes = {
        "Qb": "QB",
        "Dc": "DC",
        "Ii": "II",
        "Iii": "III",
        "Iv": "IV",
        "I S S": "I.S.S.",
        "M I A": "M.I.A.",
        "DID": "Did",
    }
    for old, new in fixes.items():
        text = re.sub(rf"\b{re.escape(old)}\b", new, text)
    return text


def parse_title_year(value):
    stem = Path(value).stem.replace(".", " ")
    match = re.search(r"\b(19\d{2}|20\d{2})\b", stem)
    if not match:
        return None
    year = match.group(1)
    title = stem[: match.start()]
    title = re.sub(r"\[[^\]]*\]|\([^)]*\)", " ", title)
    title = re.sub(r"[~,\-\[\]\(\)]+$", " ", title)
    title = re.sub(r"\s+", " ", title).strip()
    if not title:
        return None
    return {"title": title_case(title), "year": year}


def quality_for(*values):
    text = " ".join(str(v) for v in values if v).lower()
    text = re.sub(r"[._()\[\]\-]+", " ", text)
    resolution = ""
    if re.search(r"\b(2160p|4k|uhd)\b", text):
        resolution = "4K"
    elif re.search(r"\b(1080p|fhd)\b", text):
        resolution = "1080p"
    elif re.search(r"\b(720p|hd)\b", text):
        resolution = "720p"
    elif re.search(r"\b(480p|sd)\b", text):
        resolution = "480p"
    source = ""
    if re.search(r"\buhd\b.*\bbluray\b|\bbluray\b.*\buhd\b", text):
        source = "UHD BluRay"
    elif re.search(r"\bblu ?ray\b|\bbluray\b", text):
        source = "BluRay"
    elif re.search(r"\bweb ?dl\b", text):
        source = "WEB-DL"
    elif re.search(r"\bweb ?rip\b", text):
        source = "WEBRip"
    elif re.search(r"\bbrrip\b", text):
        source = "BRRip"
    elif re.search(r"\bhdtv\b", text):
        source = "HDTV"
    return " ".join(part for part in (resolution, source) if part)


def base_name(title, year, quality):
    base = f"{safe_name(title)} [{year}]"
    if quality:
        base += f" - {quality}"
    return base


def normalize_existing_name(name):
    ext = "".join(Path(name).suffixes[-1:])
    stem = name[: -len(ext)] if ext else name
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


def load_cache():
    if CACHE.exists():
        return json.loads(CACHE.read_text())
    return {}


def save_cache(cache):
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True) + "\n")


def metadata_lookup(parsed, cache, deadline):
    key = f"{parsed['title']}|||{parsed['year']}"
    if key in cache:
        return cache[key]
    if time.time() > deadline:
        cache[key] = {"matched": False, "title": parsed["title"], "note": "Metadata time budget exhausted; used parsed title."}
        return cache[key]
    query = f"{parsed['title']} {parsed['year']} film"
    url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(
        {"action": "query", "list": "search", "srsearch": query, "format": "json", "origin": "*"}
    )
    try:
        with urllib.request.urlopen(url, timeout=2.0) as response:
            data = json.loads(response.read().decode("utf-8"))
        hit = None
        for item in data.get("query", {}).get("search", []):
            snippet = re.sub(r"<[^>]*>", " ", item.get("snippet", "")).lower()
            if item.get("title", "").startswith("Q") and parsed["year"] in snippet and "film" in snippet:
                hit = item
                break
        if not hit:
            cache[key] = {"matched": False, "title": parsed["title"], "note": "No clear metadata hit; used parsed title."}
            return cache[key]
        entity_url = "https://www.wikidata.org/w/api.php?" + urllib.parse.urlencode(
            {
                "action": "wbgetentities",
                "ids": hit["title"],
                "props": "labels|descriptions",
                "languages": "en",
                "format": "json",
                "origin": "*",
            }
        )
        with urllib.request.urlopen(entity_url, timeout=2.0) as response:
            entity_data = json.loads(response.read().decode("utf-8"))
        entity = entity_data.get("entities", {}).get(hit["title"], {})
        label = entity.get("labels", {}).get("en", {}).get("value")
        desc = entity.get("descriptions", {}).get("en", {}).get("value", "")
        if label and "film" in desc.lower():
            cache[key] = {"matched": True, "title": safe_name(label), "id": hit["title"], "note": desc}
        else:
            cache[key] = {"matched": False, "title": parsed["title"], "note": "Metadata hit was not a clear film label; used parsed title."}
    except Exception as exc:
        cache[key] = {"matched": False, "title": parsed["title"], "note": f"Metadata lookup failed quickly: {exc}; used parsed title."}
    return cache[key]


def rel(path):
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def unique_path(target):
    if not target.exists():
        return target
    stem = target.stem
    suffix = target.suffix
    parent = target.parent
    counter = 2
    while True:
        candidate = parent / f"{stem} [Duplicate {counter}]{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def keep_score(path):
    name = path.name
    score = 0
    if re.search(r"\[\d{4}\]( - (4K|1080p|720p|480p))?", str(path)):
        score += 10
    if not re.search(r"[()_]", name):
        score += 5
    if "Duplicate" not in name:
        score += 3
    return score


def write_report(rows):
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["original_path", "new_path", "action", "notes"])
        writer.writeheader()
        writer.writerows(rows)


def main():
    if not ROOT.exists():
        raise SystemExit(f"Missing root: {ROOT}")
    rows = []
    cache = load_cache()
    metadata_deadline = time.time() + 180

    log("Phase 1: rename top-level movie folders")
    top_dirs = [p for p in ROOT.iterdir() if p.is_dir()]
    for i, folder in enumerate(top_dirs, 1):
        if folder.name in SKIP_RENAME_DIRS:
            continue
        if i % 50 == 0:
            log(f"Processed {i}/{len(top_dirs)} top-level folders")
            save_cache(cache)
            write_report(rows)
        parsed = parse_title_year(folder.name)
        first_video = None
        if not parsed:
            for dirpath, _, filenames in os.walk(folder):
                for filename in filenames:
                    candidate = Path(dirpath) / filename
                    if candidate.suffix.lower() in VIDEO_EXTS:
                        first_video = candidate
                        parsed = parse_title_year(filename)
                        break
                if parsed:
                    break
        else:
            for item in folder.iterdir():
                if item.is_file() and item.suffix.lower() in VIDEO_EXTS:
                    first_video = item
                    break
        if not parsed:
            rows.append({"original_path": str(folder), "new_path": "", "action": "skipped", "notes": "Could not parse title/year."})
            continue
        meta = metadata_lookup(parsed, cache, metadata_deadline)
        title = meta.get("title", parsed["title"])
        quality = quality_for(folder.name, first_video.name if first_video else "")
        target = folder.with_name(base_name(title, parsed["year"], quality))
        if folder == target:
            continue
        if target.exists():
            rows.append({"original_path": str(folder), "new_path": str(target), "action": "skipped", "notes": "Target folder exists; no merge/overwrite."})
            continue
        folder.rename(target)
        rows.append({"original_path": str(folder), "new_path": str(target), "action": "renamed_folder", "notes": meta.get("note", "")})

    save_cache(cache)
    write_report(rows)

    log("Phase 2: rename immediate media/subtitle files")
    for i, folder in enumerate([p for p in ROOT.iterdir() if p.is_dir() and p.name not in SKIP_RENAME_DIRS], 1):
        if i % 50 == 0:
            log(f"Processed file names in {i} top-level folders")
            write_report(rows)
        folder_base = normalize_existing_name(folder.name)
        for item in folder.iterdir():
            if not item.is_file():
                continue
            if item.name == ".DS_Store" or item.name.startswith("._"):
                continue
            ext = item.suffix
            lower = ext.lower()
            if lower not in MEDIA_EXTS:
                continue
            suffix = ""
            lower_name = item.name.lower()
            if lower in SUB_EXTS:
                if "forced" in lower_name and ("eng" in lower_name or "english" in lower_name):
                    suffix = " - English Forced"
                elif ("sdh" in lower_name or " hi" in lower_name) and ("eng" in lower_name or "english" in lower_name):
                    suffix = " - English SDH"
                elif "eng" in lower_name or "english" in lower_name:
                    suffix = " - English"
            target = item.with_name(f"{folder_base}{suffix}{lower if lower in SUB_EXTS else ext}")
            if item == target:
                continue
            if target.exists():
                target = unique_path(target)
            item.rename(target)
            rows.append({"original_path": str(item), "new_path": str(target), "action": "renamed_file", "notes": "Immediate media/subtitle file renamed to folder base."})

    write_report(rows)

    log("Phase 3: index files")
    files = []
    dirs = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        dirs.append(current)
        if len(dirs) % 250 == 0:
            log(f"Indexed {len(dirs)} folders, {len(files)} files")
        for filename in filenames:
            path = current / filename
            try:
                st = path.stat()
            except OSError:
                continue
            files.append((path, st.st_size))

    log("Phase 4: remove zero-byte files")
    for path, size in files:
        if size == 0 and path.exists():
            path.unlink()
            rows.append({"original_path": str(path), "new_path": "", "action": "removed_zero_byte_file", "notes": "Zero-byte file removed."})

    log("Phase 5: remove exact duplicate files by hash")
    by_size = defaultdict(list)
    for path, size in files:
        if size > 0 and path.exists() and not path.name.startswith("._"):
            by_size[size].append(path)
    by_hash = defaultdict(list)
    hashed = 0
    for group in by_size.values():
        if len(group) < 2:
            continue
        for path in group:
            if not path.exists():
                continue
            try:
                by_hash[sha256(path)].append(path)
                hashed += 1
                if hashed % 100 == 0:
                    log(f"Hashed {hashed} duplicate-size candidates")
            except OSError as exc:
                rows.append({"original_path": str(path), "new_path": "", "action": "skipped", "notes": f"Could not hash: {exc}"})
    for group in by_hash.values():
        if len(group) < 2:
            continue
        group.sort(key=keep_score, reverse=True)
        kept = group[0]
        for duplicate in group[1:]:
            if duplicate.exists():
                duplicate.unlink()
                rows.append({"original_path": str(duplicate), "new_path": "", "action": "removed_duplicate_file", "notes": f"Exact duplicate of kept file: {kept}"})

    log("Phase 6: remove folders with no movie files")
    # Recompute from disk after duplicate removal.
    no_movie_top = []
    for folder in ROOT.iterdir():
        if not folder.is_dir():
            continue
        has_video = False
        for dirpath, _, filenames in os.walk(folder):
            if any(Path(filename).suffix.lower() in VIDEO_EXTS for filename in filenames):
                has_video = True
                break
        if not has_video:
            no_movie_top.append(folder)
    for folder in no_movie_top:
        shutil.rmtree(folder)
        rows.append({"original_path": str(folder), "new_path": "", "action": "removed_no_movie_folder", "notes": "Top-level folder had no video files after cleanup."})

    log("Phase 7: remove empty folders")
    for folder in sorted([p for p in dirs if p.exists() and p != ROOT], key=lambda p: len(str(p)), reverse=True):
        try:
            if folder.exists() and folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()
                rows.append({"original_path": str(folder), "new_path": "", "action": "removed_empty_folder", "notes": "Folder was empty."})
        except OSError:
            pass

    write_report(rows)
    summary = defaultdict(int)
    for row in rows:
        summary[row["action"]] += 1
    log("Done")
    print(json.dumps({"report": str(REPORT), "summary": dict(summary)}, indent=2), flush=True)


if __name__ == "__main__":
    main()
