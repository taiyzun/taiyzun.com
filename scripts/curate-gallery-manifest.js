#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { sanitizeManifest } = require('./gallery-publication-policy');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'assets', 'space-gallery-manifest.json');
const reviewDir = path.join(rootDir, 'privacy-review');
const privateBackupPath = path.join(reviewDir, 'withheld-gallery-items.json');

const source = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const result = sanitizeManifest(source);

fs.mkdirSync(reviewDir, { recursive: true });

let previous = [];
if (fs.existsSync(privateBackupPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(privateBackupPath, 'utf8'));
    previous = Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    previous = [];
  }
}

const byFingerprint = new Map(previous.map((item) => [item.fingerprint, item]));
for (const item of result.excluded) byFingerprint.set(item.fingerprint, item);

fs.writeFileSync(privateBackupPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  note: 'Local, gitignored review backup. These items are withheld from public manifests and sharing indexes.',
  total: byFingerprint.size,
  items: [...byFingerprint.values()]
}, null, 2) + '\n');

fs.writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2) + '\n');

console.log(`Curated gallery manifest: ${result.totalBefore} -> ${result.totalAfter} public items.`);
console.log(`Withheld this run: ${result.excluded.length}. Corrected titles: ${result.corrected}.`);
console.log('Private review backup saved locally under privacy-review/.');
