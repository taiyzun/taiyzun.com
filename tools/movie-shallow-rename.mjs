import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/movieS";
const reviewRoot = path.join(root, "_Manual Review - Check Before Delete");
const reportPath = path.resolve("reports/movie-shallow-rename-report.csv");
const cachePath = path.resolve("reports/movie-fast-metadata-cache.json");
const videoExts = new Set([".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"]);
const subtitleExts = new Set([".srt", ".sub", ".idx", ".ass", ".ssa"]);
const headers = ["Original Path", "Proposed Path", "Action", "Notes"];

async function exists(p) {
  try { await fs.access(p); return true; } catch (e) { if (e.code === "ENOENT") return false; throw e; }
}
async function readJsonIfExists(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return {}; }
}
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
function clean(v) {
  return v.replace(/[\\/]+/g, " ~ ").replace(/:/g, " ~ ").replace(/\(/g, "[").replace(/\)/g, "]").replace(/[|_]/g, " ").replace(/\s+/g, " ").trim();
}
function titleCase(v) {
  return clean(v).split(/\s+/).filter(Boolean).map((w) => {
    if (/^[A-Z]{2,}$/.test(w) || /^[IVXLCDM]+$/i.test(w)) return w.toUpperCase();
    if (/^(a|an|and|as|at|but|by|for|from|in|into|of|on|or|the|to|with)$/i.test(w)) return w.toLowerCase();
    return w[0].toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ").replace(/^./, (c) => c.toUpperCase()).replace(/\bQb\b/g, "QB");
}
function parseTitleYear(v) {
  let t = path.basename(v, path.extname(v)).replace(/[._]+/g, " ");
  const m = t.match(/\b(19\d{2}|20\d{2})\b/);
  if (!m) return null;
  const year = m[1];
  t = t.slice(0, m.index).replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ").replace(/[()[\]~,-]+$/g, " ").trim();
  if (!t) return null;
  return { title: titleCase(t), year };
}
function qualityFor(v) {
  const n = v.toLowerCase().replace(/[._()[\]-]+/g, " ");
  let r = "";
  if (/\b2160p\b|\b4k\b|\buhd\b/.test(n)) r = "4K";
  else if (/\b1080p\b|\bfhd\b/.test(n)) r = "1080p";
  else if (/\b720p\b|\bhd\b/.test(n)) r = "720p";
  else if (/\b480p\b|\bsd\b/.test(n)) r = "480p";
  let s = "";
  if (/\buhd\b.*\bbluray\b|\bbluray\b.*\buhd\b/.test(n)) s = "UHD BluRay";
  else if (/\bblu ray\b|\bbluray\b/.test(n)) s = "BluRay";
  else if (/\bweb ?dl\b/.test(n)) s = "WEB-DL";
  else if (/\bweb ?rip\b/.test(n)) s = "WEBRip";
  else if (/\bbrrip\b/.test(n)) s = "BRRip";
  return [r, s].filter(Boolean).join(" ");
}
function cachedTitle(parsed, cache) {
  const hit = cache[`${parsed.title}|||${parsed.year}`];
  return hit?.matched ? clean(hit.title) : parsed.title;
}
function subtitleSuffix(file) {
  const s = path.basename(file, path.extname(file)).toLowerCase();
  if (/forced/.test(s) && /eng|english/.test(s)) return " - English Forced";
  if (/sdh|hi/.test(s) && /eng|english/.test(s)) return " - English SDH";
  if (/eng|english/.test(s)) return " - English";
  return "";
}
async function uniqueTarget(p) {
  if (!(await exists(p))) return p;
  const x = path.parse(p);
  let n = 2;
  while (await exists(path.join(x.dir, `${x.name} [Duplicate ${n}]${x.ext}`))) n++;
  return path.join(x.dir, `${x.name} [Duplicate ${n}]${x.ext}`);
}

const cache = await readJsonIfExists(cachePath);
const rows = [];
const topEntries = await fs.readdir(root, { withFileTypes: true });
const dirs = topEntries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name)).filter((d) => d !== reviewRoot).sort();

for (const originalDir of dirs) {
  let dir = originalDir;
  const children = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const directFiles = children.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
  const firstMedia = directFiles.find((f) => videoExts.has(path.extname(f).toLowerCase()) || subtitleExts.has(path.extname(f).toLowerCase()));
  const parsed = parseTitleYear(dir) || (firstMedia ? parseTitleYear(firstMedia) : null);
  if (!parsed) {
    rows.push({ "Original Path": dir, "Proposed Path": "", Action: "Skipped", Notes: "Could not parse title/year." });
    continue;
  }
  const title = cachedTitle(parsed, cache);
  const q = qualityFor(`${dir} ${firstMedia ?? ""}`);
  const folderName = `${title} [${parsed.year}]${q ? ` [${q}]` : ""}`;
  const targetDir = path.join(root, folderName);
  if (dir !== targetDir) {
    if (await exists(targetDir)) {
      rows.push({ "Original Path": dir, "Proposed Path": targetDir, Action: "Skipped", Notes: "Target folder exists; no merge/overwrite." });
      continue;
    }
    await fs.rename(dir, targetDir);
    rows.push({ "Original Path": dir, "Proposed Path": targetDir, Action: "Renamed folder", Notes: "Shallow in-place folder rename." });
    dir = targetDir;
  } else {
    rows.push({ "Original Path": dir, "Proposed Path": targetDir, Action: "Already clean", Notes: "Folder already clean." });
  }
  const files = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
  for (const file of files) {
    const ext = path.extname(file);
    const lower = ext.toLowerCase();
    if (!videoExts.has(lower) && !subtitleExts.has(lower)) continue;
    const suffix = subtitleExts.has(lower) ? subtitleSuffix(file) : "";
    const intended = path.join(dir, `${folderName}${suffix}${subtitleExts.has(lower) ? lower : ext}`);
    if (file === intended) {
      rows.push({ "Original Path": file, "Proposed Path": intended, Action: "Already clean", Notes: "File already clean." });
      continue;
    }
    const target = await uniqueTarget(intended);
    await fs.rename(file, target);
    rows.push({ "Original Path": file, "Proposed Path": target, Action: "Renamed file", Notes: "Shallow in-place file rename." });
  }
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${[headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n")}\n`);
const summary = rows.reduce((a, r) => { a.total++; a[r.Action] = (a[r.Action] ?? 0) + 1; return a; }, { total: 0 });
console.log(JSON.stringify({ reportPath, summary }, null, 2));
