#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const portraitManifestPath = path.join(rootDir, 'js', 'odyssey-portraits.js');
const outputRelativeDir = 'assets/Portraits/odyssey-optimized';
const outputDir = path.join(rootDir, outputRelativeDir);
const widthCandidates = [360, 720];
const formats = [
  { ext: 'avif', options: { quality: 52, effort: 4 } },
  { ext: 'webp', options: { quality: 78, effort: 4 } }
];

function loadPortraits() {
  const code = fs.readFileSync(portraitManifestPath, 'utf8');
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: portraitManifestPath });
  if (!Array.isArray(context.window.odysseyPortraits)) {
    throw new Error('window.odysseyPortraits was not found in js/odyssey-portraits.js');
  }
  return context.window.odysseyPortraits;
}

function sourcePathFor(entry) {
  if (!entry.src || !entry.src.startsWith('assets/Portraits/odyssey-poetic/')) {
    return null;
  }
  return path.join(rootDir, decodeURIComponent(entry.src));
}

function widthsFor(sourceWidth) {
  const widths = widthCandidates.filter((width) => width < sourceWidth);
  if ((!widths.length || sourceWidth < widthCandidates[widthCandidates.length - 1]) && widths[widths.length - 1] !== sourceWidth) {
    widths.push(sourceWidth);
  }
  return [...new Set(widths)].sort((a, b) => a - b);
}

async function writeVariant(sourcePath, outputBase, width, format) {
  const outputPath = `${outputBase}-w${width}.${format.ext}`;
  if (fs.existsSync(outputPath)) {
    return false;
  }

  await sharp(sourcePath)
    .rotate()
    .resize({
      width,
      withoutEnlargement: true
    })
    .toFormat(format.ext, format.options)
    .toFile(outputPath);

  return true;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const portraits = loadPortraits();
  let responsiveCount = 0;
  let writtenCount = 0;

  for (let index = 0; index < portraits.length; index += 1) {
    const entry = portraits[index];
    const sourcePath = sourcePathFor(entry);
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      continue;
    }

    const metadata = await sharp(sourcePath).metadata();
    if (!metadata.width || !metadata.height) {
      continue;
    }

    const manifestIndex = String(responsiveCount + 1).padStart(3, '0');
    const baseRelative = `${outputRelativeDir}/odyssey-poetic-${manifestIndex}`;
    const outputBase = path.join(rootDir, baseRelative);
    const widths = widthsFor(metadata.width);

    for (const width of widths) {
      for (const format of formats) {
        if (await writeVariant(sourcePath, outputBase, width, format)) {
          writtenCount += 1;
        }
      }
    }

    const thumbWidth = widths[Math.min(1, widths.length - 1)];
    Object.assign(entry, {
      base: baseRelative,
      widths,
      width: metadata.width,
      height: metadata.height,
      thumb: `${baseRelative}-w${thumbWidth}.webp`,
      full: entry.full || entry.src,
      kind: 'responsive'
    });

    responsiveCount += 1;
  }

  fs.writeFileSync(
    portraitManifestPath,
    `window.odysseyPortraits = ${JSON.stringify(portraits, null, 2)};\n`
  );

  console.log(`Optimized ${responsiveCount} Odyssey portraits; wrote ${writtenCount} new files.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
