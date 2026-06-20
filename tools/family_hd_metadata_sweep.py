#!/usr/bin/env python3
import csv
import os
import shutil
import time
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-final-metadata-sweep.csv")
JUNK_ROOT = ROOT / "_Junk Metadata - Review"
ACTIVE_ROOTS = [ROOT / "Movies", ROOT / "TV", ROOT / "Videos", ROOT / "Mac Video Library", ROOT / "SG BU"]
PRUNE_SUFFIXES = (".localized", ".fcpbundle", ".app", ".movpkg", ".tvlibrary", ".imovielibrary", ".theater")
PRUNE_NAMES = {"_Junk Metadata - Review", "_Duplicate Videos - Review", "_Duplicate Subtitles - Review", ".AppleDB", ".AppleDesktop"}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def unique_path(target):
    if not target.exists():
        return target
    suffix = "".join(target.suffixes) if target.suffix else ""
    stem = target.name[: -len(suffix)] if suffix else target.name
    for n in range(2, 10000):
        candidate = target.with_name(f"{stem} - {n}{suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError(target)


def main():
    rows = []
    for base in ACTIVE_ROOTS:
        if not base.exists():
            continue
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [d for d in dirnames if d not in PRUNE_NAMES and not d.endswith(PRUNE_SUFFIXES)]
            current = Path(dirpath)
            for filename in filenames:
                if filename != ".DS_Store" and not filename.startswith("._"):
                    continue
                src = current / filename
                dst = unique_path(JUNK_ROOT / src.relative_to(ROOT))
                dst.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.move(str(src), str(dst))
                except FileNotFoundError:
                    continue
                rows.append({"Original Path": str(src), "Proposed Path": str(dst), "Action": "moved_metadata_junk", "Notes": "Final post-rename AppleDouble or DS_Store sweep."})
                if len(rows) % 500 == 0:
                    log(f"Metadata swept: {len(rows)}")
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Original Path", "Proposed Path", "Action", "Notes"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Metadata swept: {len(rows)}")
    print(f"Report: {REPORT}")


if __name__ == "__main__":
    main()
