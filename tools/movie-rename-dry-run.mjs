import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/movieS";
const outPath = path.resolve("reports/movie-rename-dry-run.csv");
const cachePath = path.resolve("reports/movie-metadata-cache.json");
const reviewRoot = path.join(root, "_Manual Review - Check Before Delete");
const applyRenames = process.argv.includes("--apply");

const csvHeaders = ["Original Path", "Proposed Path", "Confidence", "Notes"];
const mediaExts = new Set([".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv", ".srt", ".sub", ".idx", ".ass", ".ssa"]);
const videoExts = new Set([".mp4", ".mkv", ".mov", ".m4v", ".avi", ".flv"]);
const supportExts = new Set([".jpg", ".jpeg", ".png", ".txt", ".nfo", ".url"]);
const sourceWords = [
  ["uhd bluray", "UHD BluRay"],
  ["uhd blu ray", "UHD BluRay"],
  ["blu ray", "BluRay"],
  ["bluray", "BluRay"],
  ["web dl", "WEB-DL"],
  ["web-dl", "WEB-DL"],
  ["webrip", "WEBRip"],
  ["web rip", "WEBRip"],
  ["brrip", "BRRip"],
  ["hdtv", "HDTV"],
];
const releaseWords = new Set([
  "1080p",
  "720p",
  "480p",
  "2160p",
  "4k",
  "uhd",
  "bluray",
  "brrip",
  "webrip",
  "web",
  "web-dl",
  "x264",
  "x265",
  "aac",
  "aac5",
  "hevc",
  "10bit",
  "5",
  "1",
  "fhd",
  "hd",
  "sd",
  "yts",
  "bz",
  "yify",
]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
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

function isSystemSidecar(filePath) {
  const base = path.basename(filePath);
  return base === ".DS_Store" || base.startsWith("._");
}

function cleanForPath(value) {
  return value
    .replace(/[\\/]+/g, " ~ ")
    .replace(/:/g, " ~ ")
    .replace(/\(/g, "[")
    .replace(/\)/g, "]")
    .replace(/[|]/g, "~")
    .replace(/\s+/g, " ")
    .trim();
}

function stripDiacritics(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function norm(value) {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseFallback(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[ivxlcdm]+$/i.test(word)) return word.toUpperCase();
      if (/^(a|an|and|as|at|but|by|for|from|in|into|of|on|or|the|to|with)$/i.test(word)) return word.toLowerCase();
      return word.slice(0, 1).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^./, (char) => char.toUpperCase());
}

function parseCandidate(value) {
  const original = value;
  let text = path.basename(value, path.extname(value));
  text = text.replace(/[._]+/g, " ");
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return null;
  const year = yearMatch[1];
  text = text.slice(0, yearMatch.index).trim();
  text = text.replace(/\[[^\]]*\]/g, " ").replace(/\([^)]*\)/g, " ");
  text = text.replace(/[()[\]~,-]+$/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).filter((word) => !releaseWords.has(word.toLowerCase()));
  const title = words.join(" ").trim();
  if (!title || title.length < 2) return null;
  return { title, year, source: original };
}

function candidateForFile(filePath) {
  const relative = path.relative(root, filePath);
  const parts = relative.split(path.sep);
  const top = parts[0];
  return parseCandidate(top) || parseCandidate(path.basename(filePath));
}

function qualityForPath(filePath) {
  const relative = path.relative(root, filePath).toLowerCase().replace(/[._()[\]-]+/g, " ");
  let resolution = "";
  if (/\b2160p\b|\b4k\b|\buhd\b/.test(relative)) resolution = "4K";
  else if (/\b1080p\b|\bfhd\b/.test(relative)) resolution = "1080p";
  else if (/\b720p\b|\bhd\b/.test(relative)) resolution = "720p";
  else if (/\b480p\b|\bsd\b/.test(relative)) resolution = "480p";

  let source = "";
  for (const [pattern, label] of sourceWords) {
    if (relative.includes(pattern)) {
      source = label;
      break;
    }
  }
  return [resolution, source].filter(Boolean).join(" ");
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function fetchWikidata(candidate, cache) {
  const key = `${candidate.title}|||${candidate.year}`;
  if (cache[key] && !/429|rate/i.test(cache[key].note ?? "")) return cache[key];

  const query = `${candidate.title} ${candidate.year} film`;
  const url = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
  const response = await fetchWithRetry(url);
  if (!response.ok) {
    const note = `Wikidata search failed: ${response.status}`;
    if (response.status !== 429) cache[key] = { matched: false, note };
    else return { matched: false, note };
    return cache[key];
  }

  const data = await response.json();
  const search = data.query?.search ?? [];
  const hit = search.find((item) => {
    const snippet = String(item.snippet ?? "").replace(/<[^>]*>/g, " ").toLowerCase();
    return snippet.includes(candidate.year) && snippet.includes("film");
  });

  if (!hit?.title?.startsWith("Q")) {
    cache[key] = { matched: false, note: "No clear Wikidata film result for parsed title/year." };
    return cache[key];
  }

  const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(hit.title)}&props=labels|descriptions&languages=en&format=json&origin=*`;
  const entityResponse = await fetchWithRetry(entityUrl);
  if (!entityResponse.ok) {
    const note = `Wikidata entity fetch failed: ${entityResponse.status}`;
    if (entityResponse.status !== 429) cache[key] = { matched: false, note };
    else return { matched: false, note };
    return cache[key];
  }
  const entityData = await entityResponse.json();
  const entity = entityData.entities?.[hit.title];
  const label = entity?.labels?.en?.value;
  const description = entity?.descriptions?.en?.value ?? "";
  const parsedNorm = norm(candidate.title);
  const labelNorm = norm(label ?? "");
  const closeLabel =
    labelNorm === parsedNorm ||
    labelNorm.includes(parsedNorm) ||
    parsedNorm.includes(labelNorm) ||
    levenshtein(labelNorm, parsedNorm) <= 3;

  if (!label || !closeLabel || !description.toLowerCase().includes("film")) {
    cache[key] = {
      matched: false,
      note: `Wikidata result was not close enough: ${label ?? hit.title} (${description})`,
    };
    return cache[key];
  }

  cache[key] = { matched: true, title: label, year: candidate.year, id: hit.title, description };
  return cache[key];
}

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await sleep(750 * attempt);
    const response = await fetch(url, {
      headers: { "User-Agent": "Codex local movie rename planner" },
    });
    if (response.status !== 429) return response;
    await sleep(2500 * attempt);
  }
  return fetch(url, {
    headers: { "User-Agent": "Codex local movie rename planner" },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function levenshtein(a, b) {
  if (!a || !b) return Math.max(a.length, b.length);
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function confidenceLabel(score) {
  if (score >= 0.9) return "High";
  if (score >= 0.65) return "Medium";
  if (score > 0) return "Low";
  return "Manual Review";
}

async function uniqueReviewPath(filePath, reason) {
  const relative = path.relative(root, filePath);
  const safeReason = reason.replace(/[^A-Za-z0-9 -]+/g, "").replace(/\s+/g, " ").trim();
  let target = path.join(reviewRoot, safeReason, relative);
  const parsed = path.parse(target);
  let counter = 2;
  while (true) {
    try {
      await fs.access(target);
      target = path.join(parsed.dir, `${parsed.name} [${counter}]${parsed.ext}`);
      counter += 1;
    } catch (error) {
      if (error.code === "ENOENT") return target;
      throw error;
    }
  }
}

const cache = await readJsonIfExists(cachePath, {});
const files = (await walk(root))
  .filter((filePath) => !filePath.startsWith(`${reviewRoot}${path.sep}`))
  .sort((a, b) => a.localeCompare(b));
const candidates = new Map();
for (const filePath of files) {
  if (isSystemSidecar(filePath)) continue;
  const ext = path.extname(filePath).toLowerCase();
  if (!mediaExts.has(ext) && !supportExts.has(ext)) continue;
  const candidate = candidateForFile(filePath);
  if (candidate) candidates.set(`${candidate.title}|||${candidate.year}`, candidate);
}

for (const candidate of candidates.values()) {
  await fetchWikidata(candidate, cache);
}
await fs.mkdir(path.dirname(cachePath), { recursive: true });
await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);

const rows = [];
const proposedCounts = new Map();

for (const filePath of files) {
  const ext = path.extname(filePath);
  const lowerExt = ext.toLowerCase();
  const notes = [];
  let proposed = "";
  let score = 0;

  if (isSystemSidecar(filePath)) {
    notes.push("System sidecar/metadata file; no rename proposed.");
  } else if (supportExts.has(lowerExt)) {
    notes.push("Support or release-artifact file; no rename proposed.");
  } else if (!mediaExts.has(lowerExt)) {
    notes.push("Unsupported file type for movie rename; manual review required.");
  } else {
    const candidate = candidateForFile(filePath);
    if (!candidate) {
      notes.push("Could not parse a movie title and year; manual review required.");
    } else {
      const metadata = cache[`${candidate.title}|||${candidate.year}`];
      if (metadata?.matched) {
        score = 0.95;
        const title = cleanForPath(metadata.title);
        const quality = qualityForPath(filePath);
        const folder = `${title} [${metadata.year}]${quality ? ` [${quality}]` : ""}`;
        proposed = path.join(root, folder, `${folder}${ext}`);
        notes.push(`Matched Wikidata ${metadata.id}: ${metadata.description}.`);
      } else {
        const fallbackTitle = titleCaseFallback(candidate.title);
        score = 0;
        notes.push(
          `Parsed as ${fallbackTitle} [${candidate.year}], but no clear official metadata match; manual review required. ${metadata?.note ?? ""}`.trim(),
        );
      }
    }
  }

  if (proposed) proposedCounts.set(proposed, (proposedCounts.get(proposed) ?? 0) + 1);
  rows.push({
    "Original Path": filePath,
    "Proposed Path": proposed,
    Confidence: confidenceLabel(score),
    Notes: notes.join(" "),
  });
}

for (const row of rows) {
  if (row["Proposed Path"] && proposedCounts.get(row["Proposed Path"]) > 1) {
    row.Confidence = "Manual Review";
    row.Notes += " Proposed path collision detected; do not rename until resolved.";
  }
}

const applyCandidates = rows.filter(
  (row) =>
    row["Proposed Path"] &&
    row.Confidence === "High" &&
    row["Original Path"] !== row["Proposed Path"] &&
    !row.Notes.includes("Proposed path collision"),
);

if (applyRenames) {
  const targetOwners = new Map();
  for (const row of applyCandidates) {
    const owner = targetOwners.get(row["Proposed Path"]);
    if (owner) {
      row.Confidence = "Manual Review";
      row.Notes += ` Duplicate target in this pass; moved to manual review instead of overwriting ${owner}.`;
      continue;
    }
    targetOwners.set(row["Proposed Path"], row["Original Path"]);
    try {
      await fs.access(row["Proposed Path"]);
      row.Confidence = "Manual Review";
      row.Notes += " Target already exists; moved to manual review instead of overwriting.";
    } catch (error) {
      if (error.code !== "ENOENT") {
        row.Confidence = "Manual Review";
        row.Notes += ` Cannot check target (${error.message}); moved to manual review.`;
      }
    }
  }

  for (const row of rows) {
    if (!row["Proposed Path"] && row["Original Path"] && !row["Original Path"].startsWith(`${reviewRoot}${path.sep}`)) {
      if (/System sidecar|Support or release-artifact/.test(row.Notes)) {
        const target = await uniqueReviewPath(row["Original Path"], "Support Sidecars and Release Artifacts");
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.rename(row["Original Path"], target);
        row["Proposed Path"] = target;
        row.Notes += " Moved to manual review folder, not deleted.";
      }
    }
  }

  for (const row of applyCandidates) {
    if (row.Confidence === "High") {
      await fs.mkdir(path.dirname(row["Proposed Path"]), { recursive: true });
      await fs.rename(row["Original Path"], row["Proposed Path"]);
      row.Notes += " Applied rename.";
    } else {
      const target = await uniqueReviewPath(row["Original Path"], "Duplicate or Blocked Movie Targets");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(row["Original Path"], target);
      row["Proposed Path"] = target;
      row.Notes += " Moved to manual review folder, not deleted.";
    }
  }
}

const csvLines = [
  csvHeaders.map(csvEscape).join(","),
  ...rows.map((row) => csvHeaders.map((header) => csvEscape(row[header])).join(",")),
];
await fs.writeFile(outPath, `${csvLines.join("\n")}\n`);

const summary = rows.reduce(
  (acc, row) => {
    acc.total += 1;
    acc[row.Confidence] = (acc[row.Confidence] ?? 0) + 1;
    if (row["Proposed Path"]) acc.proposed += 1;
    return acc;
  },
  { total: 0, proposed: 0 },
);
console.log(JSON.stringify({ outPath, cachePath, applyRenames, applyCandidateCount: applyCandidates.length, summary }, null, 2));
