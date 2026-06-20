import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/movieS";
const reviewRoot = path.join(root, "_Manual Review - Check Before Delete");
const reportPath = path.resolve("reports/movie-single-bracket-shallow-report.csv");
const headers = ["Original Path", "Proposed Path", "Action", "Notes"];

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function standardTag(value) {
  const lower = value.toLowerCase().replace(/\s+/g, "");
  if (lower === "2160p" || lower === "4k") return "4K";
  if (lower === "uhdbluray") return "UHD BluRay";
  if (lower === "bluray") return "BluRay";
  if (lower === "webrip") return "WEBRip";
  if (lower === "web-dl" || lower === "webdl") return "WEB-DL";
  if (lower === "brrip") return "BRRip";
  if (lower === "hdtv") return "HDTV";
  return value;
}

function normalizeName(name) {
  const ext = path.extname(name);
  const stem = ext ? name.slice(0, -ext.length) : name;
  let next = stem
    .replace(/[\\/]+/g, " ~ ")
    .replace(/:/g, " ~ ")
    .replace(/[|_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  next = next.replace(/\((19\d{2}|20\d{2})\)/g, "[$1]");
  next = next.replace(/~\s*(19\d{2}|20\d{2})\s*~/g, "[$1] -");
  next = next.replace(/\b(19\d{2}|20\d{2})\b/g, "[$1]");
  next = next.replace(/\[\s*(4K|2160p|1080p|720p|480p|UHD BluRay|BluRay|WEBRip|WEB-DL|BRRip|HDTV)\s*\]/gi, (_, tag) => ` - ${standardTag(tag)}`);
  next = next.replace(/\]\s+\[/g, "] - ");
  next = next.replace(/\s+-\s+\[/g, " - ");
  next = next.replace(/\[(?!19\d{2}\]|20\d{2}\])([^\]]+)\]/g, "$1");
  next = next.replace(/\s+-\s+-\s+/g, " - ").replace(/\s+/g, " ").replace(/\s+-\s*$/g, "").trim();
  return ext ? `${next}${ext}` : next;
}

const rows = [];
const top = await fs.readdir(root, { withFileTypes: true });
const dirs = top
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(root, entry.name))
  .filter((dir) => dir !== reviewRoot)
  .sort();

for (const originalDir of dirs) {
  let dir = originalDir;
  const dirTarget = path.join(root, normalizeName(path.basename(dir)));
  if (dir !== dirTarget) {
    if (await exists(dirTarget)) {
      rows.push({ "Original Path": dir, "Proposed Path": dirTarget, Action: "Skipped", Notes: "Target folder exists; no merge/overwrite." });
      continue;
    }
    await fs.rename(dir, dirTarget);
    rows.push({ "Original Path": dir, "Proposed Path": dirTarget, Action: "Renamed folder", Notes: "Converted to one year bracket; quality/source after dash." });
    dir = dirTarget;
  } else {
    rows.push({ "Original Path": dir, "Proposed Path": dirTarget, Action: "Already clean", Notes: "Folder already follows current convention." });
  }

  const children = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const child of children) {
    if (!child.isFile()) continue;
    if (child.name === ".DS_Store" || child.name.startsWith("._")) continue;
    const original = path.join(dir, child.name);
    const target = path.join(dir, normalizeName(child.name));
    if (original === target) {
      rows.push({ "Original Path": original, "Proposed Path": target, Action: "Already clean", Notes: "File already follows current convention." });
      continue;
    }
    if (await exists(target)) {
      rows.push({ "Original Path": original, "Proposed Path": target, Action: "Skipped", Notes: "Target file exists; no overwrite." });
      continue;
    }
    await fs.rename(original, target);
    rows.push({ "Original Path": original, "Proposed Path": target, Action: "Renamed file", Notes: "Converted to one year bracket; quality/source after dash." });
  }
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${[headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n")}\n`);
const summary = rows.reduce((acc, row) => {
  acc.total += 1;
  acc[row.Action] = (acc[row.Action] ?? 0) + 1;
  return acc;
}, { total: 0 });
console.log(JSON.stringify({ reportPath, summary }, null, 2));
