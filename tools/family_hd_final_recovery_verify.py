#!/usr/bin/env python3
import csv
import os
import shutil
import subprocess
import time
from pathlib import Path


WORKSPACE = Path("/Users/tai/Documents/GitHub/taiyzun.com")
REPORT = WORKSPACE / "reports/family-hd-final-recovery-verify-report.csv"
SUMMARY = WORKSPACE / "reports/family-hd-final-recovery-verify-summary.txt"
ALT_MOUNT = Path("/tmp/family-rescan-final")
SMB_URL = "//GUEST:@X._smb._tcp.local/Family"


def run_step(rows, name, cmd, timeout=20):
    started = time.strftime("%Y-%m-%d %H:%M:%S")
    try:
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
        status = "ok" if result.returncode == 0 else f"exit_{result.returncode}"
        out = (result.stdout + result.stderr).strip()
    except subprocess.TimeoutExpired as exc:
        status = "timeout"
        out = ((exc.stdout or "") + (exc.stderr or "")).strip() if isinstance(exc.stdout, str) else ""
    except Exception as exc:
        status = "error"
        out = str(exc)
    rows.append({
        "Step": name,
        "Command": " ".join(cmd),
        "Started": started,
        "Status": status,
        "Output": out[:4000],
    })
    return status, out


def quick_audit_mount(rows, mount_path: Path):
    if not mount_path.exists():
        rows.append({"Step": "quick_audit", "Command": str(mount_path), "Started": time.strftime("%Y-%m-%d %H:%M:%S"), "Status": "missing_mount_path", "Output": ""})
        return {"status": "missing", "issues": -1, "top": []}
    issues = []
    top = []
    try:
        with os.scandir(mount_path) as it:
            for entry in it:
                top.append(entry.name)
                name = entry.name
                if name in {".DS_Store", "._.DS_Store"}:
                    issues.append(f"volatile metadata: {mount_path / name}")
                if "_" in name or "(" in name or ")" in name or "|" in name:
                    if not name.startswith("."):
                        issues.append(f"top-level naming issue: {mount_path / name}")
    except Exception as exc:
        rows.append({"Step": "quick_audit", "Command": str(mount_path), "Started": time.strftime("%Y-%m-%d %H:%M:%S"), "Status": "scan_error", "Output": str(exc)})
        return {"status": "scan_error", "issues": -1, "top": top}
    rows.append({"Step": "quick_audit", "Command": str(mount_path), "Started": time.strftime("%Y-%m-%d %H:%M:%S"), "Status": "ok", "Output": "\\n".join(top[:200])})
    return {"status": "ok", "issues": len(issues), "top": top}


def stage_root_metadata(rows, mount_path: Path):
    junk = mount_path / "_Junk Metadata - Review"
    moved = 0
    for name in [".DS_Store", "._.DS_Store"]:
        src = mount_path / name
        if not src.exists():
            continue
        dst = junk / name
        n = 2
        while dst.exists():
            dst = junk / f"{name} - {n}"
            n += 1
        try:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
            moved += 1
        except Exception as exc:
            rows.append({"Step": "stage_root_metadata", "Command": str(src), "Started": time.strftime("%Y-%m-%d %H:%M:%S"), "Status": "error", "Output": str(exc)})
    rows.append({"Step": "stage_root_metadata", "Command": str(mount_path), "Started": time.strftime("%Y-%m-%d %H:%M:%S"), "Status": "ok", "Output": f"moved={moved}"})
    return moved


def main():
    rows = []
    run_step(rows, "df_before", ["df", "-h"], timeout=10)
    run_step(rows, "mount_before", ["mount"], timeout=10)
    run_step(rows, "kill_stale_checks", ["pkill", "-f", "family_hd_"], timeout=5)
    run_step(rows, "unmount_alt_old", ["umount", "-f", "/tmp/family-rescan"], timeout=8)
    run_step(rows, "unmount_alt_final_old", ["umount", "-f", str(ALT_MOUNT)], timeout=8)
    run_step(rows, "unmount_volumes_family", ["diskutil", "unmount", "force", "/Volumes/Family"], timeout=15)

    ALT_MOUNT.mkdir(parents=True, exist_ok=True)
    mount_status, _ = run_step(rows, "mount_alt_final", ["mount_smbfs", SMB_URL, str(ALT_MOUNT)], timeout=20)
    audit = quick_audit_mount(rows, ALT_MOUNT if mount_status == "ok" else Path("/Volumes/Family"))
    moved = 0
    if audit["status"] == "ok":
        moved = stage_root_metadata(rows, ALT_MOUNT if mount_status == "ok" else Path("/Volumes/Family"))
        audit = quick_audit_mount(rows, ALT_MOUNT if mount_status == "ok" else Path("/Volumes/Family"))

    run_step(rows, "df_after", ["df", "-h"], timeout=10)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    with REPORT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["Step", "Command", "Started", "Status", "Output"])
        writer.writeheader()
        writer.writerows(rows)

    final_status = "verified_top_level" if audit["status"] == "ok" else "smb_still_unresponsive"
    lines = [
        "Family HD final recovery verify summary",
        f"Final status: {final_status}",
        f"Alternate mount attempted: {ALT_MOUNT}",
        f"Root metadata moved this run: {moved}",
        f"Top-level entries seen: {', '.join(audit.get('top', [])[:50])}",
        f"Top-level audit issue count: {audit.get('issues')}",
        "Prior completed cleanup remains authoritative: reports/family-hd-broad-final-summary.txt",
        f"Recovery report: {REPORT}",
    ]
    SUMMARY.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
