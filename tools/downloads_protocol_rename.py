#!/usr/bin/env python3
import csv
import os
from pathlib import Path
from typing import Optional


DOWNLOADS = Path("/Users/tai/Downloads")
REPORT = Path("reports/downloads-protocol-rename-report.csv")


RENAMES = {
    "Sandman_Full_Thesis_from_Tai.docx": "Sandman Full Thesis from Tai.docx",
    "New_Zealand_2026_Country_Trade_Opportunity_Thesis.docx": "New Zealand [2026] - Country Trade Opportunity Thesis.docx",
    "Iblis_and_Shaytan_by_mE_Tai_Sp@cE.docx": "Iblis and Shaytan by mE Tai Sp@cE.docx",
    "LittleSnitch-6.4-nightly-(7207).dmg": "Little Snitch [6.4 Nightly 7207].dmg",
    "WhatsApp-2.26.24.12.dmg": "WhatsApp [2.26.24.12].dmg",
    "Praven_kumar.jpg": "Praven Kumar.jpg",
    "Devika-Saigal-Kapoor-CEO-of-M2M-Ferries-and-Mandwa-Jetty-1.jpg": "Devika Saigal Kapoor - CEO of M2M Ferries and Mandwa Jetty.jpg",
    "Bob_Iger_hi.jpg": "Bob Iger.jpg",
    "Jesse-Ehrman-After-Party-GettyImages-817860726-H-2022.jpg": "Jesse Ehrman - After Party - Getty Images [2022].jpg",
    "Jesse-Ehrman-After-Party-GettyImages-817860726-H-2022.jpg.webp": "Jesse Ehrman - After Party - Getty Images [2022].jpg.webp",
    "Mehriban_Aliyeva_in_2024.jpg": "Mehriban Aliyeva [2024].jpg",
    "Hiroki-Totoki.jpg": "Hiroki Totoki.jpg",
    "Surinder-Arora.jpg.webp": "Surinder Arora.jpg.webp",
    "Mr.-Gianchandani-3-scaled-e1623304679285.jpg": "Mr. Gianchandani.jpg",
    "6.7.16MichaelBarkerByLuigiNovi2_(cropped).jpg": "Michael Barker - Photo by Luigi Novi [2016].jpg",
    "ajay-bijli-takes-centre-stage.jpg": "Ajay Bijli - Takes Centre Stage.jpg",
    "ajay-bijli-takes-centre-stage.jpg.avif": "Ajay Bijli - Takes Centre Stage.jpg.avif",
    "P1021808-scaled.jpeg": "Surinder Arora - Portrait.jpeg",
    "Screenshot-2026-06-18-at-18.10.04.jpg": "Michael Barker - Tribeca Festival [2021].jpg",
    "ECF-Pilot-Report-3-Rubber.pdf.fldownload": "ECF Pilot Report 3 Rubber.pdf.fldownload",
}

NESTED_RENAMES = {
    "FTP/public_html.zip": "FTP/Public Html.zip",
    "FTP/public hTml.Zip": "FTP/Public Html - Alternate.Zip",
    "FTP/Public Html copy.Zip": "FTP/Public Html - Copy.Zip",
    "FTP/Public Html Old123.Zip": "FTP/Public Html - Old 123.Zip",
    "FTP/s r niTygrids.Zip": "FTP/S R Nitygrids.Zip",
    "Mr Nobody (2009)/Mr.Nobody.2009.Extended.1080p.BluRay.x264.YIFY.mkv": "Mr Nobody (2009)/Mr. Nobody [2009] - Extended - 1080p.mkv",
    "Mr Nobody (2009)/Torrent downloaded from Demonoid.com - Copy.txt": "Mr Nobody (2009)/Mr. Nobody [2009] - Source Note - Demonoid.txt",
    "Mr Nobody (2009)/AhaShare.com.txt": "Mr Nobody (2009)/Mr. Nobody [2009] - Source Note - AhaShare.txt",
    "audience_export_9c62c33314": "Audience Export 9c62c33314",
    "audience_export_9c62c33314/subscribed_email_audience_export_9c62c33314.csv": "audience_export_9c62c33314/Subscribed Email Audience Export 9c62c33314.csv",
    "audience_export_9c62c33314/unsubscribed_email_audience_export_9c62c33314.csv": "audience_export_9c62c33314/Unsubscribed Email Audience Export 9c62c33314.csv",
    "audience_export_9c62c33314/cleaned_email_audience_export_9c62c33314.csv": "audience_export_9c62c33314/Cleaned Email Audience Export 9c62c33314.csv",
}

FINAL_FOLDER_RENAMES = {
    "Mr Nobody (2009)": "Mr. Nobody [2009] - 1080p",
}

MANUAL_REVIEW_NAMES = {
    "1561150_0381_r_v2.jpg",
    "1681482222071.jpeg",
    "49348751_1139400842881164_4413046770284625920_n.jpg",
    "720435645_4662343520663757_7891833751248069470_n.jpg",
    "720920088_122288771786184548_5191614960365194387_n.jpg",
    "722078080_997069996404086_1929333932384080656_n.jpg",
    "723240803_4662512203980222_1629674447349392376_n.jpg",
    "724129625_10167458940609465_551136946525590962_n.jpg",
    "IMG_6528.PNG",
    "IMG_6529.PNG",
    "MV5BMDIxYjIwNDYtNzA2OS00ZmUyLWI5NzYtNjRiNGUwZjE2MjRlXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg",
    "MV5BMDIxYjIwNDYtNzA2OS00ZmUyLWI5NzYtNjRiNGUwZjE2MjRlXkEyXkFqcGc@._V1_FMjpg_UX1000_-2.jpg",
    "MV5BMTYyNzU5ODkwNV5BMl5BanBnXkFtZTgwMjkxNTcxNDE@._V1_.jpg",
    "OJ-2-1-830x1024.jpeg",
    "OJ-2-1-830x1024.png.webp",
    "PHOTO-2026-06-09-20-05-59.jpg",
    "image.jpg",
    "images.jpeg",
    "images-2.jpeg",
    "images-3.jpeg",
    "images-4.jpeg",
    "images-5.jpeg",
    "images-6.jpeg",
    "images-7.jpeg",
    "rexfeatures_10074689t.jpg.webp",
}


def collision_safe(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.name
    suffix = ""
    if path.is_file():
        suffixes = "".join(path.suffixes)
        stem = path.name[: -len(suffixes)] if suffixes else path.name
        suffix = suffixes
    idx = 2
    while True:
        candidate = path.with_name(f"{stem} - {idx}{suffix}")
        if not candidate.exists():
            return candidate
        idx += 1


def rename_path(src: Path, dst: Path, confidence: str, notes: str, rows: list[dict]) -> Optional[Path]:
    if not src.exists():
        return None
    final_dst = collision_safe(dst)
    if src == final_dst:
        action = "Already correct"
    else:
        final_dst.parent.mkdir(parents=True, exist_ok=True)
        os.rename(src, final_dst)
        action = "Renamed"
    rows.append(
        {
            "Original Path": str(src),
            "Proposed Path": str(final_dst),
            "Confidence": confidence,
            "Notes": f"{action}. {notes}",
        }
    )
    return final_dst


def main() -> None:
    rows: list[dict] = []

    for old, new in RENAMES.items():
        rename_path(
            DOWNLOADS / old,
            DOWNLOADS / new,
            "High",
            "Protocol cleanup: removed underscores, hyphens, round brackets, or download noise.",
            rows,
        )

    for old, new in NESTED_RENAMES.items():
        rename_path(
            DOWNLOADS / old,
            DOWNLOADS / new,
            "High",
            "Nested file or folder cleanup with original extension preserved.",
            rows,
        )

    for old, new in FINAL_FOLDER_RENAMES.items():
        rename_path(
            DOWNLOADS / old,
            DOWNLOADS / new,
            "High",
            "Movie folder normalized after child files were renamed.",
            rows,
        )

    for name in sorted(MANUAL_REVIEW_NAMES):
        src = DOWNLOADS / name
        if src.exists():
            rows.append(
                {
                    "Original Path": str(src),
                    "Proposed Path": "",
                    "Confidence": "Manual Review",
                    "Notes": "Not renamed: generic image/download name and no reliable official identity available locally.",
                }
            )

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Original Path", "Proposed Path", "Confidence", "Notes"])
        writer.writeheader()
        writer.writerows(rows)

    renamed = sum(1 for r in rows if r["Proposed Path"] and "Renamed." in r["Notes"])
    manual = sum(1 for r in rows if r["Confidence"] == "Manual Review")
    print(f"Report: {REPORT}")
    print(f"Renamed: {renamed}")
    print(f"Manual review: {manual}")


if __name__ == "__main__":
    main()
