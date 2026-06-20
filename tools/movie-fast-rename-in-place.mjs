import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/movieS";
const reviewRoot = path.join(root, "_Manual Review - Check Before Delete");
const reportPath = path.resolve("reports/movie-fast-rename-in-place-report.csv");
const cachePath = path.resolve("reports/movie-fast-metadata-cache.json");

const videoExts = new Set([".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"]);
const subtitleExts = new Set([".srt", ".sub", ".idx", ".ass", ".ssa"]);
const headers = ["Original Path", "Proposed Path", "Action", "Notes"];

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
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

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function listTopDirs() {
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => dir !== reviewRoot)
    .sort((a, b) => a.localeCompare(b));
}

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

function parseTitleYear(value) {
  let text = path.basename(value, path.extname(value)).replace(/[._]+/g, " ");
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return null;
  const year = yearMatch[1];
  text = text.slice(0, yearMatch.index);
  text = text.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  text = text.replace(/[()[\]~,-]+$/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return { title: titleCase(clean(text)), year };
}

function norm(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function metadataTitle(parsed, cache) {
  const key = `${parsed.title}|||${parsed.year}`;
  if (cache[key]) return cache[key];
  return { matched: false, title: parsed.title, year: parsed.year, note: "No cached metadata; fast pass used parsed title/year." };
}

function qualityFor(text) {
  const normalized = text.toLowerCase().replace(/[._()[\]-]+/g, " ");
  let resolution = "";
  if (/\b2160p\b|\b4k\b|\buhd\b/.test(normalized)) resolution = "4K";
  else if (/\b1080p\b|\bfhd\b/.test(normalized)) resolution = "1080p";
  else if (/\b720p\b|\bhd\b/.test(normalized)) resolution = "720p";
  else if (/\b480p\b|\bsd\b/.test(normalized)) resolution = "480p";

  let source = "";
  if (/\buhd\b.*\bbluray\b|\bbluray\b.*\buhd\b/.test(normalized)) source = "UHD BluRay";
  else if (/\bblu ray\b|\bbluray\b/.test(normalized)) source = "BluRay";
  else if (/\bweb ?dl\b/.test(normalized)) source = "WEB-DL";
  else if (/\bweb ?rip\b/.test(normalized)) source = "WEBRip";
  else if (/\bbrrip\b/.test(normalized)) source = "BRRip";
  else if (/\bhdtv\b/.test(normalized)) source = "HDTV";

  return [resolution, source].filter(Boolean).join(" ");
}

async function folderNameFor(dir, files, cache) {
  const fromDir = parseTitleYear(dir);
  const firstMedia = files.find((file) => {
    const ext = path.extname(file).toLowerCase();
    return videoExts.has(ext) || subtitleExts.has(ext);
  });
  const fromFile = firstMedia ? parseTitleYear(firstMedia) : null;
  const parsed = fromDir || fromFile;
  if (!parsed) return null;
  const meta = await metadataTitle(parsed, cache);
  await writeJson(cachePath, cache);
  const finalTitle = meta.matched ? meta.title : parsed.title;
  const quality = qualityFor(`${dir} ${firstMedia ?? ""}`);
  return {
    folderName: `${finalTitle} [${parsed.year}]${quality ? ` [${quality}]` : ""}`,
    metadataNote: meta.matched ? `Metadata matched ${meta.id}: ${meta.note}` : `Metadata fallback: ${meta.note}`,
  };
}

function subtitleSuffix(filePath) {
  const ext = path.extname(filePath);
  const stem = clean(path.basename(filePath, ext).replace(/[._]+/g, " "));
  if (/forced/i.test(stem) && /eng|english/i.test(stem)) return " - English Forced";
  if (/sdh|hi/i.test(stem) && /eng|english/i.test(stem)) return " - English SDH";
  if (/eng|english/i.test(stem)) return " - English";
  if (/arabic|ara/i.test(stem)) return " - Arabic";
  if (/spanish|spa/i.test(stem)) return " - Spanish";
  if (/french|fre|fra/i.test(stem)) return " - French";
  if (/german|ger|deu/i.test(stem)) return " - German";
  return "";
}

async function uniqueSiblingPath(target) {
  if (!(await exists(target))) return target;
  const parsed = path.parse(target);
  let n = 2;
  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name} [Duplicate ${n}]${parsed.ext}`);
    if (!(await exists(candidate))) return candidate;
    n += 1;
  }
}

const rows = [];
const metadataCache = await readJsonIfExists(cachePath, {});

for (const originalDir of await listTopDirs()) {
  let dir = originalDir;
  const filesBefore = await walk(dir);
  const folderPlan = await folderNameFor(dir, filesBefore, metadataCache);
  if (!folderPlan) {
    rows.push({ "Original Path": dir, "Proposed Path": "", Action: "Skipped", Notes: "Could not parse title/year from folder or media file." });
    continue;
  }
  const { folderName: cleanFolderName, metadataNote } = folderPlan;

  const targetDir = path.join(root, cleanFolderName);
  if (dir !== targetDir) {
    if (await exists(targetDir)) {
      rows.push({ "Original Path": dir, "Proposed Path": targetDir, Action: "Skipped", Notes: "Target folder already exists; not merging or overwriting." });
      continue;
    }
    await fs.rename(dir, targetDir);
    rows.push({ "Original Path": dir, "Proposed Path": targetDir, Action: "Renamed folder", Notes: `Folder normalized in place. ${metadataNote}` });
    dir = targetDir;
  } else {
    rows.push({ "Original Path": dir, "Proposed Path": targetDir, Action: "Already clean", Notes: `Folder already clean. ${metadataNote}` });
  }

  const files = await walk(dir);
  const videosByDir = new Map();
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!videoExts.has(ext)) continue;
    const parent = path.dirname(file);
    videosByDir.set(parent, (videosByDir.get(parent) ?? 0) + 1);
  }

  for (const file of files) {
    const ext = path.extname(file);
    const lower = ext.toLowerCase();
    if (!videoExts.has(lower) && !subtitleExts.has(lower)) continue;
    const parent = path.dirname(file);
    let filename = "";
    if (videoExts.has(lower)) {
      const duplicateSuffix = (videosByDir.get(parent) ?? 0) > 1 ? ` [Duplicate ${videosByDir.get(parent)}]` : "";
      filename = `${cleanFolderName}${duplicateSuffix}${ext}`;
      if (duplicateSuffix) videosByDir.set(parent, videosByDir.get(parent) - 1);
    } else {
      filename = `${cleanFolderName}${subtitleSuffix(file)}${ext.toLowerCase()}`;
    }
    const intendedTarget = path.join(parent, filename);
    if (file === intendedTarget) {
      rows.push({ "Original Path": file, "Proposed Path": intendedTarget, Action: "Already clean", Notes: "File already clean." });
      continue;
    }
    const target = await uniqueSiblingPath(intendedTarget);
    await fs.rename(file, target);
    rows.push({ "Original Path": file, "Proposed Path": target, Action: "Renamed file", Notes: "Media/subtitle filename normalized in same folder." });
  }
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
  return acc;
}, { total: 0 });
console.log(JSON.stringify({ reportPath, summary }, null, 2));
