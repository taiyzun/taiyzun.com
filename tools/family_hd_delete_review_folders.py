#!/usr/bin/env python3
import csv
import shutil
import time
from pathlib import Path


ROOT = Path("/Volumes/Family")
REPORT = Path("reports/family-hd-delete-review-folders-report.csv")
SUMMARY = Path("reports/family-hd-delete-review-folders-summary.txt")

TARGETS = [
    ROOT / "_Junk Metadata - Review",
    ROOT / "_Duplicate Subtitles - Review",
    ROOT / "_Duplicate Videos - Review",
]


def folder_stats(path):
    files = 0
    dirs = 0
    size = 0
    for item in path.rglob("*"):
        try:
            if item.is_file():
                files += 1
                size += item.stat().st_size
            elif item.is_dir():
                dirs += 1
        except OSError:
            pass
    return files, dirs, size


def main():
    rows = []
    start = time.time()
    for target in TARGETS:
        if not target.exists():
            rows.append({
                "Path": str(target),
                "Action": "already_missing",
                "Files": 0,
                "Dirs": 0,
                "Bytes": 0,
                "Notes": "Folder was not present.",
            })
            continue
        files, dirs, size = folder_stats(target)
        try:
            shutil.rmtree(target)
            action = "deleted_review_folder"
            notes = "Deleted allowlisted cleanup review folder."
        except Exception as exc:
            action = "delete_failed"
            notes = str(exc)
        rows.append({
            "Path": str(target),
            "Action": action,
            "Files": files,
            "Dirs": dirs,
            "Bytes": size,
            "Notes": notes,
        })

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Path", "Action", "Files", "Dirs", "Bytes", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    deleted = [r for r in rows if r["Action"] == "deleted_review_folder"]
    failed = [r for r in rows if r["Action"] == "delete_failed"]
    freed = sum(int(r["Bytes"]) for r in deleted)
    lines = [
        "Family HD review folder deletion summary",
        f"Deleted folders: {len(deleted)}",
        f"Failed folders: {len(failed)}",
        f"Approx bytes deleted: {freed}",
        f"Elapsed seconds: {time.time() - start:.1f}",
        f"Report: {REPORT}",
    ]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
