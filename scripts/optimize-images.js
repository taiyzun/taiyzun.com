/*
Image optimization script for Taiyzun portraits
- Requires: Node.js and `sharp` (npm i sharp)
- Generates AVIF and WebP versions at widths [400,800,1200]
- Writes mapping to `assets/Portraits/gallery-images.json`

Usage:
  npm install sharp
  node scripts/optimize-images.js
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_DIR = path.join(__dirname, '..', 'assets', 'Portraits');
const OUT_DIR = path.join(SOURCE_DIR, 'optimized');
const WIDTHS = [400, 800, 1200];
const FORMATS = ['avif', 'webp'];

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function processImage(file) {
  const ext = path.extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null;

  const basename = path.basename(file, ext);
  const safeBase = basename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_.]/g, '');

  const relSrc = `assets/Portraits/${file}`;
  const entry = { src: relSrc, sizes: WIDTHS, srcset: {} };

  for (const fmt of FORMATS) {
    const parts = [];
    for (const w of WIDTHS) {
      const outName = `${safeBase}-w${w}.${fmt}`;
      const outPath = path.join(OUT_DIR, outName);
      try {
        await sharp(path.join(SOURCE_DIR, file))
          .resize(w)
          .toFormat(fmt, { quality: 80 })
          .toFile(outPath);
        parts.push(`assets/Portraits/optimized/${outName} ${w}w`);
      } catch (err) {
        console.error('Failed to write', outPath, err);
      }
    }
    entry.srcset[fmt] = parts.join(', ');
  }

  // For fallback, provide the original source at largest width
  entry.fallback = relSrc;

  return { key: relSrc, value: entry };
}

(async () => {
  const files = fs.readdirSync(SOURCE_DIR).sort();
  const mapping = {};
  for (const file of files) {
    const processed = await processImage(file);
    if (processed) {
      mapping[processed.key] = processed.value;
      console.log('[optimize] processed', processed.key);
    }
  }

  const outFile = path.join(SOURCE_DIR, 'gallery-images.json');
  fs.writeFileSync(outFile, JSON.stringify(mapping, null, 2));
  console.log('[optimize] mapping written to', outFile);
})();
