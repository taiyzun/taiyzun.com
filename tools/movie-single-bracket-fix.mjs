import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/movieS";
const reviewRoot = path.join(root, "_Manual Review - Check Before Delete");
const reportPath = path.resolve("reports/movie-single-bracket-fix-report.csv");
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

async function collectDepthFirst(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (full === reviewRoot || full.startsWith(`${reviewRoot}${path.sep}`)) continue;
    if (entry.isDirectory()) await collectDepthFirst(full, out);
    out.push(full);
  }
  return out;
}

function normalizeName(name) {
  const ext = path.extname(name);
  const hasExt = ext && !name.endsWith(ext) ? false : Boolean(ext);
  const stem = hasExt ? name.slice(0, -ext.length) : name;
  let next = stem;

  next = next
    .replace(/[\\/]+/g, " ~ ")
    .replace(/:/g, " ~ ")
    .replace(/[|_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  next = next.replace(/\((19\d{2}|20\d{2})\)/g, "[$1]");
  next = next.replace(/~\s*(19\d{2}|20\d{2})\s*~/g, "[$1] -");
  next = next.replace(/\b(19\d{2}|20\d{2})\b/g, "[$1]");

  next = next.replace(/\[\s*(4K|2160p|1080p|720p|480p|UHD BluRay|BluRay|WEBRip|WEB-DL|BRRip|HDTV)\s*\]/gi, (_, tag) => ` - ${standardTag(tag)}`);
  next = next.replace(/\s+-\s+\[/g, " - ");
  next = next.replace(/\]\s+\[/g, "] - ");
  next = next.replace(/\s+-\s+-\s+/g, " - ");
  next = next.replace(/\s+/g, " ").trim();

  // Keep square brackets only for the year. Other accidental brackets become plain text.
  next = next.replace(/\[(?!19\d{2}\]|20\d{2}\])([^\]]+)\]/g, "$1");
  next = next.replace(/\s+-\s*$/g, "").trim();

  return hasExt ? `${next}${ext}` : next;
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

const rows = [];
const items = await collectDepthFirst(root);
items.sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

for (const originalPath of items) {
  const parent = path.dirname(originalPath);
  const base = path.basename(originalPath);
  const nextBase = normalizeName(base);
  const proposedPath = path.join(parent, nextBase);

  if (base === nextBase) {
    rows.push({ "Original Path": originalPath, "Proposed Path": proposedPath, Action: "Already clean", Notes: "Name already follows single-bracket convention." });
    continue;
  }
  if (await exists(proposedPath)) {
    rows.push({ "Original Path": originalPath, "Proposed Path": proposedPath, Action: "Skipped", Notes: "Target exists; no merge or overwrite." });
    continue;
  }
  await fs.rename(originalPath, proposedPath);
  rows.push({ "Original Path": originalPath, "Proposed Path": proposedPath, Action: "Renamed", Notes: "Converted to single-bracket year with quality/source after dash." });
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
const csv = [
  headers.map(csvEscape).join(","),
  ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
].join("\n");
await fs.writeFile(reportPath, `${csv}\n`);

const summary = rows.reduce((acc, row) => {
  acc.total += 1;
  acc[row.Action] = (acc[row.Action] ?? 0) + 1;
  return acc;
}, { total: 0 });
console.log(JSON.stringify({ reportPath, summary }, null, 2));
