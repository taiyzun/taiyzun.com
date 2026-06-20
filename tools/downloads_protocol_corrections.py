#!/usr/bin/env python3
import csv
import os
from pathlib import Path


DOWNLOADS = Path("/Users/tai/Downloads")
REPORT = Path("reports/downloads-protocol-corrections-report.csv")

RENAMES = {
    "FTP/Public Html - 2.zip": "FTP/Public Html - Main.zip",
    "FTP/S R Nitygrids - 2.Zip": "FTP/S R Nitygrids.Zip",
    "Audience Export 9c62c33314/subscribed_email_audience_export_9c62c33314.csv": "Audience Export 9c62c33314/Subscribed Email Audience Export 9c62c33314.csv",
    "Audience Export 9c62c33314/unsubscribed_email_audience_export_9c62c33314.csv": "Audience Export 9c62c33314/Unsubscribed Email Audience Export 9c62c33314.csv",
    "Audience Export 9c62c33314/cleaned_email_audience_export_9c62c33314.csv": "Audience Export 9c62c33314/Cleaned Email Audience Export 9c62c33314.csv",
}


def main() -> None:
    rows = []
    for old, new in RENAMES.items():
        src = DOWNLOADS / old
        dst = DOWNLOADS / new
        if not src.exists():
            continue
        if dst.exists():
            rows.append(
                {
                    "Original Path": str(src),
                    "Proposed Path": str(dst),
                    "Confidence": "Skipped",
                    "Notes": "Target already exists; no overwrite performed.",
                }
            )
            continue
        os.rename(src, dst)
        rows.append(
            {
                "Original Path": str(src),
                "Proposed Path": str(dst),
                "Confidence": "High",
                "Notes": "Renamed. Verification correction: removed leftover generic suffix or underscores.",
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
