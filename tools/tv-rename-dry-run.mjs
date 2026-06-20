import fs from "node:fs/promises";
import path from "node:path";

const root = "/Volumes/Family/Tv";
const outPath = path.resolve("reports/tv-serials-rename-dry-run.csv");
const applyRenames = process.argv.includes("--apply");
const excludeFragments = [];

const knownShows = {
  supergirl: {
    query: "Supergirl",
    folderName: "Supergirl",
    showName: "Supergirl",
  },
  billions: {
    query: "Billions",
    folderName: "Billions",
    showName: "Billions",
  },
};

const extAllowlist = new Set([".mkv", ".mp4", ".srt", ".avi", ".mov", ".m4v"]);
const csvHeaders = ["Original Path", "Proposed Path", "Confidence", "Notes"];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function cleanTitleForFilename(value) {
  return value
    .replace(/[\\/]+/g, " ~ ")
    .replace(/:/g, " ~ ")
    .replace(/\(/g, "[")
    .replace(/\)/g, "]")
    .replace(/[|]/g, "~")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEpisode(filePath) {
  const base = path.basename(filePath);
  const ext = path.extname(base);
  const stem = base.slice(0, -ext.length);
  const normalized = stem.replace(/[._-]+/g, " ");
  const match = normalized.match(/\bS(\d{1,2})\s*E(\d{1,2})\b/i);
  if (!match) return null;

  const season = Number(match[1]);
  const episode = Number(match[2]);
  return {
    season,
    episode,
  };
}

async function fetchEpisodes({ query }) {
  const response = await fetch(
    `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}&embed=episodes`,
  );
  if (!response.ok) {
    throw new Error(`TVMaze lookup failed for ${query}: ${response.status}`);
  }
  const show = await response.json();
  const year = show.premiered ? show.premiered.slice(0, 4) : "";
  const episodes = new Map();
  for (const episode of show._embedded?.episodes ?? []) {
    episodes.set(`${episode.season}-${episode.number}`, episode.name);
  }
  return { showName: show.name, year, episodes };
}

function detectShow(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes("/supergirl/") || lower.includes("supergirl")) return "supergirl";
  if (lower.includes("/billions/") || lower.includes("billion")) return "billions";
  return null;
}

function isSystemSidecar(filePath) {
  const base = path.basename(filePath);
  return base === ".DS_Store" || base.startsWith("._");
}

function confidenceLabel(score) {
  if (score >= 0.9) return "High";
  if (score >= 0.65) return "Medium";
  if (score > 0) return "Low";
  return "Manual Review";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function isExcluded(filePath) {
  return excludeFragments.some((fragment) => filePath.includes(fragment));
}

const metadata = {};
for (const [key, show] of Object.entries(knownShows)) {
  metadata[key] = await fetchEpisodes(show);
}

const files = (await walk(root)).sort((a, b) => a.localeCompare(b));
const rows = [];
const proposedCounts = new Map();

for (const filePath of files) {
  const ext = path.extname(filePath);
  const lowerExt = ext.toLowerCase();
  const showKey = detectShow(filePath);
  const episode = parseEpisode(filePath);
  let proposed = "";
  let score = 0;
  const notes = [];

  if (isSystemSidecar(filePath)) {
    notes.push("System sidecar/metadata file; no episode rename proposed.");
  } else if (!extAllowlist.has(lowerExt)) {
    notes.push("Non-media/support file; no episode rename proposed.");
  } else if (!showKey || !episode) {
    notes.push("Could not identify a TV show plus SxxEyy pattern; manual review required.");
  } else {
    const showMeta = metadata[showKey];
    const knownTitle = showMeta.episodes.get(`${episode.season}-${episode.episode}`);
    if (knownTitle) {
      score = 0.95;
      notes.push("Episode matched against TVMaze metadata; release tags stripped from proposed name.");
    } else {
      score = 0;
      notes.push("Episode number parsed, but no official metadata title was found; manual review required.");
    }

    if (knownTitle) {
      const showDir = `${showMeta.showName} [${showMeta.year || "Year Unknown"}]`;
      const seasonDir = `Season ${String(episode.season).padStart(2, "0")}`;
      const episodeCode = `S${String(episode.season).padStart(2, "0")}E${String(episode.episode).padStart(2, "0")}`;
      const filename = `${showMeta.showName} - ${episodeCode} - ${cleanTitleForFilename(knownTitle)}${ext}`;
      proposed = path.join(root, showDir, seasonDir, filename);
    }
  }

  if (proposed && isExcluded(filePath)) {
    notes.push("Excluded from apply pass because this source is inside the still-transferring 1080p folder.");
  }

  if (proposed) {
    proposedCounts.set(proposed, (proposedCounts.get(proposed) ?? 0) + 1);
  }

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
    !isExcluded(row["Original Path"]) &&
    !row.Notes.includes("Proposed path collision"),
);

if (applyRenames) {
  const problems = [];
  for (const row of applyCandidates) {
    if (row["Original Path"] === row["Proposed Path"]) continue;
    try {
      await fs.access(row["Proposed Path"]);
      problems.push(`Target already exists: ${row["Proposed Path"]}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        problems.push(`Cannot check target: ${row["Proposed Path"]} (${error.message})`);
      }
    }
  }

  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  } else {
    for (const row of applyCandidates) {
      if (row["Original Path"] === row["Proposed Path"]) continue;
      await fs.mkdir(path.dirname(row["Proposed Path"]), { recursive: true });
      await fs.rename(row["Original Path"], row["Proposed Path"]);
      row.Notes += " Applied rename.";
    }
  }
}

await fs.mkdir(path.dirname(outPath), { recursive: true });
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
console.log(JSON.stringify({ outPath, applyRenames, applyCandidateCount: applyCandidates.length, summary }, null, 2));
