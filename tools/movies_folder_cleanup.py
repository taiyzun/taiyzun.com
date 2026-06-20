#!/usr/bin/env python3
import csv
import hashlib
import os
import shutil
from pathlib import Path


ROOT = Path("/Users/tai/Movies")
REPORT = Path("reports/user-movies-folder-cleanup-report.csv")
AUDIT = Path("reports/user-movies-folder-audit-report.csv")
EXTRAS_REVIEW = ROOT / "_Movie Extras - Review"
DUP_REVIEW = ROOT / "_Duplicate Videos - Review"

VIDEO_EXTS = {".mp4", ".mkv", ".mov", ".m4v", ".avi"}
SKIP_DIR_NAMES = {
    "iMovie Library.imovielibrary",
    "iMovie Theater.theater",
    "Final Cut Backups.localized",
    "TV",
    "Motion Templates.localized",
    "_Movie Extras - Review",
    "_Duplicate Videos - Review",
}


MOVIE_FOLDERS = {
    "The Freddie Mercury Tribute Concert For AIDS Awareness (1992) [1080p] [BluRay] [YTS.MX]": ("The Freddie Mercury Tribute Concert for AIDS Awareness", "1992", "1080p"),
    "Metallica Through The Never (2013) [1080p] [YTS.AG]": ("Metallica Through the Never", "2013", "1080p"),
    "Deep Water (2026) [1080p] [WEBRip] [5.1] [YTS.GG - YTS.BZ]": ("Deep Water", "2026", "1080p"),
    "Metallica San Francisco Symphony - S M2 (2019) [1080p] [BluRay] [5.1] [YTS.MX]": ("Metallica and San Francisco Symphony - S&M2", "2019", "1080p"),
    "Michael (2026) [2160p] [4K] [WEB] [5.1] [YTS.BZ]": ("Michael", "2026", "4K"),
    "Mortal Kombat (2021) [1080p] [BluRay] [5.1] [YTS.MX]": ("Mortal Kombat", "2021", "1080p"),
    "Mortal Kombat II (2026) [REPACK] [1080p] [WEBRip] [x265] [10bit] [5.1] [YTS.BZ]": ("Mortal Kombat II", "2026", "1080p"),
    "The Life Of Chuck (2024) [1080p] [BluRay] [5.1] [YTS.MX]": ("The Life of Chuck", "2024", "1080p"),
    "Metallica Some Kind of Monster (2004) [1080p]": ("Metallica - Some Kind of Monster", "2004", "1080p"),
    "The Shift (2023) [1080p] [BluRay] [5.1] [YTS.MX]": ("The Shift", "2023", "1080p"),
    "Ready Or Not Here I Come (2026) [2160p] [4K] [WEB] [5.1] [YTS.BZ]": ("Ready or Not 2 - Here I Come", "2026", "4K"),
    "Doctor Sleep (2019) [1080p] [BluRay] [5.1] [YTS.LT]": ("Doctor Sleep", "2019", "1080p"),
    "Metallica Slayer Megadeth Anthrax The Big 4 Live From Sofia, Bulgaria (2010) [1080p] [BluRay] [5.1] [YTS.MX]": ("Metallica Slayer Megadeth Anthrax - The Big 4 Live from Sofia Bulgaria", "2010", "1080p"),
    "Iron Maiden Burning Ambition (2026) [1080p] [WEBRip] [5.1] [YTS.BZ]": ("Iron Maiden - Burning Ambition", "2026", "1080p"),
    "Cover Your Ears (2023) [1080p] [WEBRip] [YTS.MX]": ("Cover Your Ears", "2023", "1080p"),
    "Metallica Quebec Magnetic (2012) [1080p] [BluRay] [5.1] [YTS.MX]": ("Metallica - Quebec Magnetic", "2012", "1080p"),
    "The Passenger (2026) [1080p] [WEBRip] [5.1] [YTS.BZ]": ("The Passenger", "2026", "1080p"),
    "Metallica Presents The Helping Hands Concert (2022) [1080p] [BluRay] [YTS.MX]": ("Metallica Presents The Helping Hands Concert", "2022", "1080p"),
}


FOLDER_RENAMES = {
    "Billions Seasons 1 to 6": "Billions [2016]",
    "Billions [2016]/billionS SeaSon 6": "Billions [2016]/Season 06",
    "Personal Videos/4k video downloader": "Personal Videos/4K Video Downloader",
    "ScienTific ~ maThemaTical ~ hiSTorical miracleS of The quran": "Scientific Mathematical Historical Miracles of the Quran",
}


FILE_RENAMES = {
    "Patience Will Carry Us Home.mp4": "Patience Will Carry Us Home.mp4",
    "Personal Videos/img 5108.mov": "Personal Videos/IMG 5108.mov",
    "Personal Videos/4K Video Downloader/halSey you Should be Sad.mp4": "Personal Videos/4K Video Downloader/Halsey - You Should Be Sad.mp4",
    "Personal Videos/4K Video Downloader/halSey wiThouT mE.mp4": "Personal Videos/4K Video Downloader/Halsey - Without Me.mp4",
    "Personal Videos/whaTSapp video 2026 02 04 aT 12 13 27.mp4": "Personal Videos/WhatsApp Video [2026-02-04 12.13.27].mp4",
    "Personal Videos/whaTSapp video 2026 03 13 aT 23 16 14.mp4": "Personal Videos/WhatsApp Video [2026-03-13 23.16.14].mp4",
    "Billions [2016]/Season 06/billionS S06e09 hindenburg 1080p 10biT amZn web dl ddp5 1 hevc vyndroS.mp4": "Billions [2016]/Season 06/Billions - S06E09 - Hindenburg - 1080p.mp4",
    "Billions [2016]/Season 06/billionS S06e10 johnny favouriTe 1080p 10biT amZn web dl ddp5 1 hevc vyndroS.mp4": "Billions [2016]/Season 06/Billions - S06E10 - Johnny Favorite - 1080p.mp4",
    "Billions [2016]/Season 06/billionS S06e11 SucceSSion 1080p 10biT amZn web dl ddp5 1 hevc vyndroS.mp4": "Billions [2016]/Season 06/Billions - S06E11 - Succession - 1080p.mp4",
    "Billions [2016]/Season 06/billionS S06e12 cold STorage 1080p 10biT amZn web dl ddp5 1 hevc vyndroS.mp4": "Billions [2016]/Season 06/Billions - S06E12 - Cold Storage - 1080p.mp4",
    "Mac Video Library/Hiren Preach 001.mp4": "Mac Video Library/Hiren Preach 001.mp4",
    "Mac Video Library/Hiren Preach 002.mp4": "Mac Video Library/Hiren Preach 002.mp4",
    "Mac Video Library/Hiren Preach 003.mp4": "Mac Video Library/Hiren Preach 003.mp4",
    "Mac Video Library/Hiren Preach 004.mp4": "Mac Video Library/Hiren Preach 004.mp4",
}


QURAN_FILES = {
    "Scientists Prove Prophet Muhammad Shocking Flymiracle ~ 2016 ~ 480p (SD).mp4": "Scientists Prove Prophet Muhammad Shocking Fly Miracle [2016] - 480p.mp4",
    "NASA Proves Allah Islam Miracle ~ 480p (SD).mp4": "NASA Proves Allah Islam Miracle - 480p.mp4",
    "The Mathematical Miracle of Quran ~ 480p (SD).mp4": "The Mathematical Miracle of Quran - 480p.mp4",
    "Makkah the Miraculous Golden Ratio City the Secret of Kaaba ~ 480p (SD).mp4": "Makkah the Miraculous Golden Ratio City the Secret of Kaaba - 480p.mp4",
    "Top Scientists Comments on Scientific Miracles in the Quran ~ 480p (SD).mp4": "Top Scientists Comments on Scientific Miracles in the Quran - 480p.mp4",
    "Claude Van Damme on Prophet Muhammad ~ 720p (HD).mp4": "Claude Van Damme on Prophet Muhammad - 720p.mp4",
    "Scientific Facts in the Quran Must See ~ 720p (HD).mp4": "Scientific Facts in the Quran Must See - 720p.mp4",
    "Why 19 Secrets of the Quran Prophecy of 19 a Mathematical Miracle Portion 1 Part 4 of 4 ~ 480p (SD).mp4": "Why 19 Secrets of the Quran Prophecy of 19 a Mathematical Miracle Portion 1 Part 4 of 4 - 480p.mp4",
    "Historical Miracle of Quran on Discovery of City of Iram Where Ad Lived ~ 480p (SD).mp4": "Historical Miracle of Quran on Discovery of City of Iram Where Ad Lived - 480p.mp4",
    "Holy Quran Top Scientists Comments on Scientific Miracles in the Quran Faith and Science ~ 480p (SD).mp4": "Holy Quran Top Scientists Comments on Scientific Miracles in the Quran Faith and Science - 480p.mp4",
    "Quran Miracle Talking Ants Scientific Discovery in Proof that Quran is from Allah ~ 2009 ~ 720p (HD).mp4": "Quran Miracle Talking Ants Scientific Discovery in Proof That Quran Is from Allah [2009] - 720p.mp4",
    "What Does NASA Say About Moon S Ancient Past Moon Splitting in Quran ~ 720p (HD).mp4": "What Does NASA Say About Moon's Ancient Past Moon Splitting in Quran - 720p.mp4",
    "10 Historical Miracles in the Quran Proof of Islam ~ 480p (SD).mp4": "10 Historical Miracles in the Quran Proof of Islam - 480p.mp4",
    "Why Pork is Prohibited in Islam Yusuf Estes Read Description Below ~ 480p (SD).mp4": "Why Pork Is Prohibited in Islam Yusuf Estes - 480p.mp4",
    "One of the Miracles of the Quran Explained by Yusuf Estes ~ 480p (SD).mp4": "One of the Miracles of the Quran Explained by Yusuf Estes - 480p.mp4",
    "► Scientific Miracles of the Quran║mind Blowing Facts║all Parts 1 17 English Full Documentary ~ 480p (SD).mp4": "Scientific Miracles of the Quran - Mind Blowing Facts - All Parts 1-17 English Full Documentary - 480p.mp4",
    "Historical Miracle of Quran Illustrated Nouman Ali Khan Miracles of the Quran Subtitled ~ 720p (HD).mp4": "Historical Miracle of Quran Illustrated - Nouman Ali Khan - 720p.mp4",
    "The News of Ghayb from the Qur’an 6 the City of Iram ~ 720p (HD).mp4": "The News of Ghayb from the Quran 6 - The City of Iram - 720p.mp4",
    "What Famous People Have Said About Prophet Muhammad Pbuh ~ 480p (SD).mp4": "What Famous People Have Said About Prophet Muhammad PBUH - 480p.mp4",
    "Muhammad ﷺ Splitting the Moon Shaykh Anwar Al Awlaki ~ 720p (HD).mp4": "Muhammad Splitting the Moon - Shaykh Anwar Al Awlaki - 720p.mp4",
    "Video 7 Why the Mathematical Miracle of the Quran Was Revealed in the United States of America ~ 480p (SD).mp4": "Video 7 - Why the Mathematical Miracle of the Quran Was Revealed in the United States of America - 480p.mp4",
    "Allas Name Everywhere ~ 480p (SD).mp4": "Allah's Name Everywhere - 480p.mp4",
}


def movie_folder_name(title: str, year: str, quality: str) -> str:
    return f"{title} [{year}] - {quality}"


def movie_file_stem(title: str, year: str, quality: str) -> str:
    return f"{title} [{year}] - {quality}"


def safe_target(dst: Path) -> Path:
    if not dst.exists():
        return dst
    suffixes = "".join(dst.suffixes) if dst.is_file() or dst.suffix else ""
    stem = dst.name[: -len(suffixes)] if suffixes else dst.name
    i = 2
    while True:
        candidate = dst.with_name(f"{stem} - {i}{suffixes}")
        if not candidate.exists():
            return candidate
        i += 1


def log(rows, original: Path, proposed: Path, confidence: str, notes: str) -> None:
    rows.append(
        {
            "Original Path": str(original),
            "Proposed Path": str(proposed),
            "Confidence": confidence,
            "Notes": notes,
        }
    )


def rename_path(rows, src: Path, dst: Path, confidence: str, notes: str) -> Path:
    if not src.exists():
        return dst
    dst = safe_target(dst)
    if src.resolve() == dst.resolve():
        log(rows, src, dst, confidence, "Already correct. " + notes)
        return dst
    dst.parent.mkdir(parents=True, exist_ok=True)
    os.rename(src, dst)
    log(rows, src, dst, confidence, "Renamed. " + notes)
    return dst


def move_review(rows, src: Path, review_root: Path, reason: str) -> None:
    if not src.exists():
        return
    rel = src.relative_to(ROOT)
    dst = safe_target(review_root / rel)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    log(rows, src, dst, "High", "Moved to review folder. " + reason)


def rename_movie_pack(rows, old_folder: str, title: str, year: str, quality: str) -> None:
    src_folder = ROOT / old_folder
    if not src_folder.exists():
        return
    target_folder = ROOT / movie_folder_name(title, year, quality)
    video_stem = movie_file_stem(title, year, quality)
    for child in list(src_folder.rglob("*")):
        if child.is_dir():
            continue
        low = child.name.lower()
        if child.suffix.lower() in VIDEO_EXTS:
            rename_path(rows, child, child.with_name(video_stem + child.suffix.lower()), "High", "Official movie naming; release cruft removed.")
        elif child.suffix.lower() == ".srt" and child.parent.name != "Subs":
            rename_path(rows, child, child.with_name(video_stem + ".srt"), "High", "Subtitle matched to cleaned movie name.")
        elif child.suffix.lower() == ".jpg" or child.suffix.lower() == ".txt":
            move_review(rows, child, EXTRAS_REVIEW, "YTS or release-site promotional sidecar, not deleted.")

    subs = src_folder / "Subs"
    if subs.exists():
        for sub in list(subs.glob("*.srt")):
            new_name = (
                sub.name.replace("(", "- ")
                .replace(")", "")
                .replace("[Forced]", "- Forced")
                .replace("[SDH]", "- SDH")
                .replace("  ", " ")
            )
            rename_path(rows, sub, sub.with_name(new_name), "Medium", "Subtitle language filename cleaned.")

    rename_path(rows, src_folder, target_folder, "High", "Movie folder normalized.")


def apply_manual_sets(rows) -> None:
    for old, new in sorted(FOLDER_RENAMES.items(), key=lambda kv: kv[0].count("/")):
        rename_path(rows, ROOT / old, ROOT / new, "High", "Folder name normalized.")

    for old, new in FILE_RENAMES.items():
        rename_path(rows, ROOT / old, ROOT / new, "High", "Local video or TV filename normalized.")

    base = ROOT / "Scientific Mathematical Historical Miracles of the Quran"
    for old, new in QURAN_FILES.items():
        rename_path(rows, base / old, base / new, "High", "Collection video filename cleaned.")


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024 * 4), b""):
            h.update(chunk)
    return h.hexdigest()


def move_duplicates(rows) -> None:
    seen: dict[tuple[int, str], Path] = {}
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in VIDEO_EXTS:
            continue
        rel_parts = path.relative_to(ROOT).parts
        if rel_parts and rel_parts[0] in SKIP_DIR_NAMES:
            continue
        key = (path.stat().st_size, file_hash(path))
        if key in seen:
            move_review(rows, path, DUP_REVIEW, f"Exact duplicate of {seen[key]}.")
        else:
            seen[key] = path


def audit(rows) -> None:
    bad_tokens = ["webrip", "bluray", "yts", "x264", "x265", "aac", "duplicate", "repack", "10bit", "web dl"]
    audit_rows = []
    for path in sorted(ROOT.rglob("*")):
        if path.name.startswith("."):
            continue
        rel_parts = path.relative_to(ROOT).parts
        if rel_parts and rel_parts[0] in SKIP_DIR_NAMES:
            continue
        name = path.name.lower()
        issues = []
        if "_" in path.name:
            issues.append("underscore")
        if "(" in path.name or ")" in path.name:
            issues.append("round brackets")
        if "|" in path.name or "/" in path.name:
            issues.append("slash or pipe")
        for token in bad_tokens:
            if token in name:
                issues.append("generic token: " + token)
        if issues:
            audit_rows.append({"Path": str(path), "Issues": "; ".join(dict.fromkeys(issues))})

    AUDIT.parent.mkdir(parents=True, exist_ok=True)
    with AUDIT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(audit_rows)
    print(f"Audit issues: {len(audit_rows)}")


def main() -> None:
    rows = []
    for old, meta in MOVIE_FOLDERS.items():
        rename_movie_pack(rows, old, *meta)
    apply_manual_sets(rows)
    move_duplicates(rows)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Original Path", "Proposed Path", "Confidence", "Notes"])
        writer.writeheader()
        writer.writerows(rows)
    audit(rows)
    print(f"Report: {REPORT}")
    print(f"Actions: {len(rows)}")
    print(f"Review extras: {EXTRAS_REVIEW if EXTRAS_REVIEW.exists() else 'none'}")
    print(f"Duplicate review: {DUP_REVIEW if DUP_REVIEW.exists() else 'none'}")


if __name__ == "__main__":
    main()
