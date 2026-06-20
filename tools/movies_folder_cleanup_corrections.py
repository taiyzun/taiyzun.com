#!/usr/bin/env python3
import csv
import os
from pathlib import Path


ROOT = Path("/Users/tai/Movies")
REPORT = Path("reports/user-movies-folder-corrections-report.csv")


def clean_target(path: Path) -> Path:
    name = path.name
    for marker in [" - 2."]:
        if marker in name:
            return path.with_name(name.replace(marker, "."))
    if name.endswith(" - 2"):
        return path.with_name(name[:-4])
    return path


def main() -> None:
    rows = []
    for path in sorted(ROOT.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if " - 2" not in path.name:
            continue
        rel = path.relative_to(ROOT).parts
        if rel and rel[0] in {"_Movie Extras - Review", "_Duplicate Videos - Review", "iMovie Library.imovielibrary", "iMovie Theater.theater", "Final Cut Backups.localized", "TV"}:
            continue
        target = clean_target(path)
        if target == path or target.exists():
            rows.append(
                {
                    "Original Path": str(path),
                    "Proposed Path": str(target),
                    "Confidence": "Skipped",
                    "Notes": "Target already exists; no overwrite performed.",
                }
            )
            continue
        os.rename(path, target)
        rows.append(
            {
                "Original Path": str(path),
                "Proposed Path": str(target),
                "Confidence": "High",
                "Notes": "Renamed. Removed accidental collision suffix.",
            }
        )

    # Specific child names that were stranded inside the corrected downloader folder.
    explicit = {
        ROOT / "Personal Videos/4K Video Downloader/halSey you Should be Sad.mp4": ROOT / "Personal Videos/4K Video Downloader/Halsey - You Should Be Sad.mp4",
        ROOT / "Personal Videos/4K Video Downloader/halSey wiThouT mE.mp4": ROOT / "Personal Videos/4K Video Downloader/Halsey - Without Me.mp4",
    }
    for src, dst in explicit.items():
        if src.exists() and not dst.exists():
            os.rename(src, dst)
            rows.append(
                {
                    "Original Path": str(src),
                    "Proposed Path": str(dst),
                    "Confidence": "High",
                    "Notes": "Renamed. Corrected stranded personal-video filename.",
                }
            )

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Original Path", "Proposed Path", "Confidence", "Notes"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Report: {REPORT}")
    print(f"Corrections: {sum(1 for r in rows if r['Confidence'] == 'High')}")


if __name__ == "__main__":
    main()
