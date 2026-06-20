import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/movieS";
const reviewRoot = path.join(root, "_Manual Review - Check Before Delete");
const reportPath = path.resolve("reports/movie-local-apply-report.csv");

const mediaExts = new Set([".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"]);
const subtitleExts = new Set([".srt", ".sub", ".idx", ".ass", ".ssa"]);
const reviewExts = new Set([".jpg", ".jpeg", ".png", ".txt", ".nfo", ".url"]);
const headers = ["Original Path", "Proposed Path", "Action", "Confidence", "Notes"];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (full === reviewRoot || full.startsWith(`${reviewRoot}${path.sep}`)) continue;
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function clean(value) {
  return value
    .replace(/[\\/]+/g, " ~ ")
    .replace(/:/g, " ~ ")
    .replace(/\(/g, "[")
    .replace(/\)/g, "]")
    .replace(/[|]/g, "~")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z]{2,}$/.test(word) || /^[IVXLCDM]+$/i.test(word)) return word.toUpperCase();
      if (/^(a|an|and|as|at|but|by|for|from|in|into|of|on|or|the|to|with)$/i.test(word)) return word.toLowerCase();
      if (/^[A-Za-z]'[A-Za-z]+$/.test(word)) return word[0].toUpperCase() + word.slice(1);
      return word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^./, (char) => char.toUpperCase())
    .replace(/\bQb\b/g, "QB")
    .replace(/\bDc\b/g, "DC")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III")
    .replace(/\bIv\b/g, "IV");
}

function parseTitleYear(filePath) {
  const relative = path.relative(root, filePath);
  const parts = relative.split(path.sep);
  const top = parts[0];
  return parseFromText(top) || parseFromText(path.basename(filePath, path.extname(filePath)));
}

function parseFromText(input) {
  let text = input.replace(/[._]+/g, " ");
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return null;
  const year = yearMatch[1];
  text = text.slice(0, yearMatch.index);
  text = text.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  text = text.replace(/[()[\]~,-]+$/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return { title: titleCase(clean(text)), year };
}

function qualityFor(filePath) {
  const relative = path.relative(root, filePath).toLowerCase().replace(/[._()[\]-]+/g, " ");
  let resolution = "";
  if (/\b2160p\b|\b4k\b|\buhd\b/.test(relative)) resolution = "4K";
  else if (/\b1080p\b|\bfhd\b/.test(relative)) resolution = "1080p";
  else if (/\b720p\b|\bhd\b/.test(relative)) resolution = "720p";
  else if (/\b480p\b|\bsd\b/.test(relative)) resolution = "480p";

  let source = "";
  if (/\buhd\b.*\bbluray\b|\bbluray\b.*\buhd\b/.test(relative)) source = "UHD BluRay";
  else if (/\bblu ray\b|\bbluray\b/.test(relative)) source = "BluRay";
  else if (/\bweb ?dl\b/.test(relative)) source = "WEB-DL";
  else if (/\bweb ?rip\b/.test(relative)) source = "WEBRip";
  else if (/\bbrrip\b/.test(relative)) source = "BRRip";
  else if (/\bhdtv\b/.test(relative)) source = "HDTV";

  return [resolution, source].filter(Boolean).join(" ");
}

function subtitleSuffix(filePath, baseName) {
  const ext = path.extname(filePath);
  let stem = path.basename(filePath, ext);
  stem = stem.replace(/[._]+/g, " ");
  stem = stem.replace(/\b(19\d{2}|20\d{2}|480p|720p|1080p|2160p|4k|fhd|hd|sd|bluray|webrip|web dl|web-dl|x264|x265|aac5?|yts|bz)\b/gi, " ");
  stem = stem.replace(baseName.replace(/\[[^\]]+\]/g, " "), " ");
  stem = clean(stem);
  if (!stem || /^srt$/i.test(stem)) return "";
  if (/english/i.test(stem) || /\beng\b/i.test(stem)) return " - English";
  return ` - ${titleCase(stem)}`;
}

function isSidecar(filePath) {
  const base = path.basename(filePath);
  return base === ".DS_Store" || base.startsWith("._");
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

async function uniqueReviewPath(filePath, reason) {
  const relative = path.relative(root, filePath);
  let target = path.join(reviewRoot, reason, relative);
  const parsed = path.parse(target);
  let n = 2;
  while (await exists(target)) {
    target = path.join(parsed.dir, `${parsed.name} [${n}]${parsed.ext}`);
    n += 1;
  }
  return target;
}

const files = (await walk(root)).sort((a, b) => a.localeCompare(b));
const rows = [];
const plannedTargets = new Map();

for (const filePath of files) {
  const ext = path.extname(filePath);
  const lowerExt = ext.toLowerCase();
  let target = "";
  let action = "Manual Review";
  let confidence = "Manual Review";
  const notes = [];

  if (isSidecar(filePath) || reviewExts.has(lowerExt)) {
    target = await uniqueReviewPath(filePath, "Support Sidecars and Release Artifacts");
    action = "Move to review";
    notes.push("Support, sidecar, or release-artifact file; moved to review instead of deleting.");
  } else if (!mediaExts.has(lowerExt) && !subtitleExts.has(lowerExt)) {
    notes.push("Unsupported file type; left in place for manual review.");
  } else {
    const parsed = parseTitleYear(filePath);
    if (!parsed) {
      notes.push("Could not parse title/year; left in place for manual review.");
    } else {
      const quality = qualityFor(filePath);
      const folderName = `${parsed.title} [${parsed.year}]${quality ? ` [${quality}]` : ""}`;
      const suffix = subtitleExts.has(lowerExt) ? subtitleSuffix(filePath, folderName) : "";
      target = path.join(root, folderName, `${folderName}${suffix}${ext}`);
      confidence = "High";
      action = "Rename";
      notes.push("Parsed title/year from existing movie folder or filename; quality/source retained cleanly.");
    }
  }

  if (target && plannedTargets.has(target)) {
    target = await uniqueReviewPath(filePath, "Duplicate or Blocked Movie Targets");
    action = "Move to review";
    confidence = "Manual Review";
    notes.push(`Duplicate target matched ${plannedTargets.get(target)}; moved to review instead of overwriting.`);
  } else if (target) {
    plannedTargets.set(target, filePath);
  }

  rows.push({ "Original Path": filePath, "Proposed Path": target, Action: action, Confidence: confidence, Notes: notes.join(" ") });
}

for (const row of rows) {
  if (!row["Proposed Path"]) continue;
  if (row["Original Path"] === row["Proposed Path"]) {
    row.Action = "Already clean";
    row.Notes += " Already at target path.";
    continue;
  }
  if (await exists(row["Proposed Path"])) {
    row["Proposed Path"] = await uniqueReviewPath(row["Original Path"], "Duplicate or Blocked Movie Targets");
    row.Action = "Move to review";
    row.Confidence = "Manual Review";
    row.Notes += " Target already exists; moved to review instead of overwriting.";
  }
}

for (const row of rows) {
  if (!row["Proposed Path"] || row.Action === "Manual Review" || row.Action === "Already clean") continue;
  await fs.mkdir(path.dirname(row["Proposed Path"]), { recursive: true });
  await fs.rename(row["Original Path"], row["Proposed Path"]);
}

await fs.mkdir(path.dirname(reportPath), { recursive: true });
const csvLines = [
  headers.map(csvEscape).join(","),
  ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
];
await fs.writeFile(reportPath, `${csvLines.join("\n")}\n`);

const summary = rows.reduce((acc, row) => {
  acc.total += 1;
  acc[row.Action] = (acc[row.Action] ?? 0) + 1;
  acc[row.Confidence] = (acc[row.Confidence] ?? 0) + 1;
  return acc;
}, { total: 0 });

console.log(JSON.stringify({ reportPath, reviewRoot, summary }, null, 2));
