#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'assets', 'space-gallery-manifest.json');
const indexPath = path.join(rootDir, 'assets', 'space-gallery-index.json');
const chunksDir = path.join(rootDir, 'assets', 'space-gallery-categories');

function displayCategory(category) {
  if (category === 'mEmEs') return 'Signature Notes';
  if (category === '_Temp_Review') return 'Curatorial Review';
  return category || 'Gallery';
}

function slugify(value) {
  const slug = String(value || 'gallery')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  return slug || 'gallery';
}

function hash(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const categories = [];

fs.rmSync(chunksDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 120 });
fs.mkdirSync(chunksDir, { recursive: true });

for (const [key, entries] of Object.entries(manifest)) {
  if (!Array.isArray(entries)) continue;

  const fileName = `${slugify(key)}-${hash(key)}.json`;
  const publicPath = `/assets/space-gallery-categories/${fileName}`;
  writeJson(path.join(chunksDir, fileName), entries);

  categories.push({
    key,
    displayCategory: displayCategory(key),
    count: entries.length,
    path: publicPath
  });
}

writeJson(indexPath, {
  total: categories.reduce((sum, category) => sum + category.count, 0),
  categories
});

console.log(`Built gallery chunk index with ${categories.length} categories and ${categories.reduce((sum, category) => sum + category.count, 0)} items.`);
