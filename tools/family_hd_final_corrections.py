#!/usr/bin/env python3
import csv
import os
import re
import shutil
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-final-corrections-report.csv")
FINAL_AUDIT = Path("reports/family-hd-final-audit.csv")
DUP_VIDEO_ROOT = ROOT / "_Duplicate Videos - Review"

RENAMES = {
    "TV/eTc/16052010238 ~ 480p (SD).mp4": "TV/eTc/16052010238 - 480p.mp4",
    "TV/eTc/This Mp4 Stores 30 Frames Ie Pictures a Second ~ 480p (SD).mp4": "TV/eTc/This Mp4 Stores 30 Frames Ie Pictures a Second - 480p.mp4",
    "TV/eTc/Macx Screen Recorder 06 25 at Am 01 28 38 ~ 2015 ~ 480p (SD).mp4": "TV/eTc/Macx Screen Recorder 06 25 at Am 01 28 38 [2015] - 480p.mp4",
    "TV/eTc/Again How Much is a Moving Picture Worth ~ 720p (HD).mp4": "TV/eTc/Again How Much Is a Moving Picture Worth - 720p.mp4",
    "TV/eTc/A Moving Picture is Worth How Much Again ~ 720p (HD).mp4": "TV/eTc/A Moving Picture Is Worth How Much Again - 720p.mp4",
    "TV/eTc/Movie on 09 07 11 at 11 05 Pm ~ 480p (SD).mp4": "TV/eTc/Movie on 09 07 11 at 11 05 PM - 480p.mp4",
    "TV/X/The Imitation Game ~ 2014 ~ 720p (HD).mp4": "TV/X/The Imitation Game [2014] - 720p.mp4",
    "TV/X/M2u00121 ~ 480p (SD).mp4": "TV/X/M2u00121 - 480p.mp4",
    "Mac Video Library/Justin Bieber Intentions Official Video Short Version Ft Quavobb - 1080p.mp4": "Mac Video Library/Justin Bieber Intentions Official Video Short Ft Quavobb - 1080p.mp4",
    "Mac Video Library/Britney Spears My Prerogative in Bed Version Hqb - 480p.mp4": "Mac Video Library/Britney Spears My Prerogative in Bed Hqb - 480p.mp4",
    "Mac Video Library/Justin Bieber Intentions Official Video Short Version Ft Quavoaa - 1080p.mp4": "Mac Video Library/Justin Bieber Intentions Official Video Short Ft Quavoaa - 1080p.mp4",
    "Mac Video Library/Jeremih Ft 50 Cent Down on Me Version2 Mrda [2010] - 1080p.mp4": "Mac Video Library/Jeremih Ft 50 Cent Down on Me Mrda [2010] - 1080p.mp4",
    "Mac Video Library/Taylor Swift Cardigan “cabin in Candlelight” Version Official Video - 1080p.mp4": "Mac Video Library/Taylor Swift Cardigan Cabin in Candlelight Official Video - 1080p.mp4",
    "Mac Video Library/Britney Spears My Prerogative in Bed Version Hq - 480p.flv": "Mac Video Library/Britney Spears My Prerogative in Bed Hq - 480p.flv",
    "Mac Video Library/Peter Gabriel Sledgehammer Versionb - 720p.mp4": "Mac Video Library/Peter Gabriel Sledgehammer - 720p.mp4",
    "Mac Video Library/Justin Bieber Intentions Official Video Short Version Ft Quavob - 1080p.mp4": "Mac Video Library/Justin Bieber Intentions Official Video Short Ft Quavob - 1080p.mp4",
    "Mac Video Library/Calum Scott Leona Lewis You Are the Reason Duet Versionb - 1080p.mp4": "Mac Video Library/Calum Scott Leona Lewis You Are the Reason Duet - 1080p.mp4",
    "SG BU/Downloads/Investment_Growth_39_percent.xlsx": "SG BU/Downloads/Investment Growth 39 Percent.xlsx",
    "SG BU/Downloads/Investment_Projection_3_Years_Wide.xlsx": "SG BU/Downloads/Investment Projection 3 Years Wide.xlsx",
}


def unique_path(target):
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 1000):
        candidate = target.with_name(f"{stem} - {n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(target)


def audit_rows():
    rows = []
    tokens = ["webrip", "bluray", "yify", "yts", "x264", "x265", "aac", "duplicate", "version", "copy"]
    skip = {"_Duplicate Videos - Review", "_Duplicate Subtitles - Review", "_Junk Metadata - Review", ".AppleDB", ".AppleDesktop"}
    for base in [ROOT / "Movies", ROOT / "TV", ROOT / "Videos", ROOT / "Mac Video Library", ROOT / "SG BU"]:
        if not base.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in skip and not d.endswith((".localized", ".fcpbundle", ".app", ".movpkg", ".tvlibrary"))]
            current = Path(dirpath)
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
    copy_video = ROOT / "Movies/2073 [2024] - 1080p/2073 [2024] - 1080p - Copy 2.mp4"
    if copy_video.exists():
        dst = unique_path(DUP_VIDEO_ROOT / copy_video.relative_to(ROOT))
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(copy_video), str(dst))
        rows.append({"Original Path": str(copy_video), "Proposed Path": str(dst), "Action": "moved_duplicate_video_name", "Notes": "Leftover copy-named video staged for review."})

    for old, new in RENAMES.items():
        src = ROOT / old
        dst = ROOT / new
        if src.exists():
            dst = unique_path(dst)
            dst.parent.mkdir(parents=True, exist_ok=True)
            os.rename(src, dst)
            rows.append({"Original Path": str(src), "Proposed Path": str(dst), "Action": "renamed_final_protocol_issue", "Notes": "Final audit issue corrected."})

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    ar = audit_rows()
    with FINAL_AUDIT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Issues"])
        writer.writeheader()
        writer.writerows(ar)

    print(f"Corrections: {len(rows)}")
    print(f"Remaining audit issues: {len(ar)}")
    print(f"Report: {REPORT}")
    print(f"Final audit: {FINAL_AUDIT}")


if __name__ == "__main__":
    main()
