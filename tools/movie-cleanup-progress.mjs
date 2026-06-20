import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = "/Volumes/Family/movieS";
const cleanupRoot = path.join(root, "_Cleanup Review - Check Before Delete");
const reportPath = path.resolve("reports/movie-cleanup-progress-report.csv");
const videoExts = new Set([".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"]);
const subtitleExts = new Set([".srt", ".sub", ".idx", ".ass", ".ssa"]);
const headers = ["Original Path", "New Path", "Action", "Notes"];

const rows = [];
const stats = {
  dirsIndexed: 0,
  filesIndexed: 0,
  foldersRenamed: 0,
  filesRenamed: 0,
  duplicateFilesMoved: 0,
  zeroByteFilesMoved: 0,
  noMovieFoldersMoved: 0,
  emptyDirsRemoved: 0,
  skipped: 0,
};

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

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

async function uniquePath(target) {
  if (!(await exists(target))) return target;
  const parsed = path.parse(target);
  let n = 2;
  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name} [${n}]${parsed.ext}`);
    if (!(await exists(candidate))) return candidate;
    n += 1;
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

function isCleanupPath(filePath) {
  return filePath === cleanupRoot || filePath.startsWith(`${cleanupRoot}${path.sep}`);
}

function isSidecarName(name) {
  return name === ".DS_Store" || name.startsWith("._");
}

async function renameTopLevelFolders() {
  log("Normalizing top-level folder names");
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isDirectory())) {
    const original = path.join(root, entry.name);
    if (isCleanupPath(original)) continue;
    const next = path.join(root, normalizeName(entry.name));
    if (original === next) continue;
    if (await exists(next)) {
      rows.push({ "Original Path": original, "New Path": next, Action: "Skipped", Notes: "Target folder exists; no merge or overwrite." });
      stats.skipped += 1;
      continue;
    }
    await fs.rename(original, next);
    rows.push({ "Original Path": original, "New Path": next, Action: "Renamed folder", Notes: "Top-level folder normalized to single year bracket; quality/source after dash." });
    stats.foldersRenamed += 1;
  }
}

async function indexTree() {
  log("Indexing movie folder");
  const files = [];
  const dirs = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir || isCleanupPath(dir)) continue;
    dirs.push(dir);
    stats.dirsIndexed += 1;
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      rows.push({ "Original Path": dir, "New Path": "", Action: "Skipped", Notes: `Could not read directory: ${error.message}` });
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (isCleanupPath(full)) continue;
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        try {
          const st = await fs.stat(full);
          files.push({ path: full, size: st.size, ext: path.extname(entry.name).toLowerCase(), name: entry.name });
          stats.filesIndexed += 1;
        } catch (error) {
          rows.push({ "Original Path": full, "New Path": "", Action: "Skipped", Notes: `Could not stat file: ${error.message}` });
        }
      }
    }
    if (stats.dirsIndexed % 100 === 0) log(`Indexed ${stats.dirsIndexed} folders, ${stats.filesIndexed} files`);
  }
  return { dirs, files };
}

async function renameImmediateMediaFiles() {
  log("Normalizing immediate media/subtitle filenames");
  const top = await fs.readdir(root, { withFileTypes: true });
  for (const dirEntry of top.filter((item) => item.isDirectory())) {
    let dir = path.join(root, dirEntry.name);
    if (isCleanupPath(dir)) continue;
    let children = [];
    try {
      children = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const folderBase = path.basename(dir);
    for (const child of children) {
      if (!child.isFile() || isSidecarName(child.name)) continue;
      const ext = path.extname(child.name);
      const lower = ext.toLowerCase();
      if (!videoExts.has(lower) && !subtitleExts.has(lower)) continue;
      const suffix = subtitleExts.has(lower) ? subtitleSuffix(child.name) : "";
      const target = path.join(dir, `${folderBase}${suffix}${subtitleExts.has(lower) ? lower : ext}`);
      const original = path.join(dir, child.name);
      if (original === target) continue;
      const finalTarget = await uniquePath(target);
      await fs.rename(original, finalTarget);
      rows.push({ "Original Path": original, "New Path": finalTarget, Action: "Renamed file", Notes: "Immediate media/subtitle file normalized to folder name." });
      stats.filesRenamed += 1;
    }
  }
}

function subtitleSuffix(name) {
  const lower = name.toLowerCase();
  if (/forced/.test(lower) && /eng|english/.test(lower)) return " - English Forced";
  if (/sdh|hi/.test(lower) && /eng|english/.test(lower)) return " - English SDH";
  if (/eng|english/.test(lower)) return " - English";
  return "";
}

async function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function keepScore(filePath) {
  const base = path.basename(filePath);
  let score = 0;
  if (/\[\d{4}\]( - (4K|1080p|720p|480p))?/.test(filePath)) score += 10;
  if (!/[()_]/.test(base)) score += 5;
  if (!/duplicate/i.test(filePath)) score += 3;
  if (!isSidecarName(base)) score += 2;
  return score;
}

async function moveToCleanup(filePath, reason) {
  const rel = path.relative(root, filePath);
  const target = await uniquePath(path.join(cleanupRoot, reason, rel));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rename(filePath, target);
  return target;
}

async function cleanupZeroAndDuplicates(files) {
  log("Moving zero-byte files to cleanup review");
  for (const file of files) {
    if (file.size !== 0 || isCleanupPath(file.path)) continue;
    const target = await moveToCleanup(file.path, "Zero Byte Files");
    rows.push({ "Original Path": file.path, "New Path": target, Action: "Moved to cleanup review", Notes: "Zero-byte file moved for manual delete review." });
    stats.zeroByteFilesMoved += 1;
  }

  log("Finding duplicate files by size and SHA-256");
  const bySize = new Map();
  for (const file of files) {
    if (file.size === 0 || isCleanupPath(file.path)) continue;
    if (isSidecarName(file.name)) continue;
    const arr = bySize.get(file.size) ?? [];
    arr.push(file);
    bySize.set(file.size, arr);
  }

  let hashed = 0;
  const byHash = new Map();
  for (const group of bySize.values()) {
    if (group.length < 2) continue;
    for (const file of group) {
      try {
        const hash = await sha256(file.path);
        const arr = byHash.get(hash) ?? [];
        arr.push(file);
        byHash.set(hash, arr);
        hashed += 1;
        if (hashed % 50 === 0) log(`Hashed ${hashed} duplicate-size candidates`);
      } catch (error) {
        rows.push({ "Original Path": file.path, "New Path": "", Action: "Skipped", Notes: `Could not hash file: ${error.message}` });
      }
    }
  }

  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => keepScore(b.path) - keepScore(a.path));
    const keep = group[0];
    for (const dup of group.slice(1)) {
      if (!(await exists(dup.path))) continue;
      const target = await moveToCleanup(dup.path, "Duplicate Files");
      rows.push({ "Original Path": dup.path, "New Path": target, Action: "Moved to cleanup review", Notes: `Duplicate of kept file: ${keep.path}` });
      stats.duplicateFilesMoved += 1;
    }
  }
}

async function cleanupNoMovieTopFolders() {
  log("Moving top-level folders with no movie files to cleanup review");
  const top = await fs.readdir(root, { withFileTypes: true });
  for (const entry of top.filter((item) => item.isDirectory())) {
    const dir = path.join(root, entry.name);
    if (isCleanupPath(dir)) continue;
    let hasMovie = false;
    const stack = [dir];
    while (stack.length && !hasMovie) {
      const current = stack.pop();
      let entries = [];
      try {
        entries = await fs.readdir(current, { withFileTypes: true });
      } catch {
        break;
      }
      for (const item of entries) {
        const full = path.join(current, item.name);
        if (item.isDirectory()) stack.push(full);
        else if (item.isFile() && videoExts.has(path.extname(item.name).toLowerCase())) {
          hasMovie = true;
          break;
        }
      }
    }
    if (!hasMovie) {
      const target = await uniquePath(path.join(cleanupRoot, "Top Level Folders With No Movie File", path.basename(dir)));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(dir, target);
      rows.push({ "Original Path": dir, "New Path": target, Action: "Moved to cleanup review", Notes: "Top-level folder had no video file in its subtree." });
      stats.noMovieFoldersMoved += 1;
    }
  }
}

async function removeEmptyDirs() {
  log("Removing truly empty directories");
  const { dirs } = await indexTree();
  dirs.sort((a, b) => b.length - a.length);
  for (const dir of dirs) {
    if (dir === root || isCleanupPath(dir)) continue;
    try {
      const entries = await fs.readdir(dir);
      if (entries.length === 0) {
        await fs.rmdir(dir);
        rows.push({ "Original Path": dir, "New Path": "", Action: "Removed empty folder", Notes: "Directory was empty." });
        stats.emptyDirsRemoved += 1;
      }
    } catch {
      // Directory may have moved during cleanup; skip.
    }
  }
}

await fs.mkdir(cleanupRoot, { recursive: true });
await renameTopLevelFolders();
await renameImmediateMediaFiles();
const indexed = await indexTree();
await cleanupZeroAndDuplicates(indexed.files);
await cleanupNoMovieTopFolders();
await removeEmptyDirs();

await fs.mkdir(path.dirname(reportPath), { recursive: true });
const csv = [
  headers.map(csvEscape).join(","),
  ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
].join("\n");
await fs.writeFile(reportPath, `${csv}\n`);

log("Done");
console.log(JSON.stringify({ reportPath, cleanupRoot, stats }, null, 2));
