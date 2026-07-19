#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { publicationBlockReason, sanitizeManifest } = require('./gallery-publication-policy');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'assets', 'space-gallery-manifest.json');
const reportPath = path.join(rootDir, 'reports', 'gallery-upload-gap-report.json');
const allowedState = 'Uploaded to R2 but not published in website manifest';

function publicCategory(category) {
  if (category === '_Temp_Review') return 'Curatorial Review';
  return category;
}

function entryExists(entries, fullUrl) {
  return entries.some(entry => entry.full === fullUrl);
}

function main() {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Missing report: ${reportPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const candidates = (report.localNotInWebsiteItems || []).filter(item => item.websiteState === allowedState);

  let added = 0;

  for (const item of candidates) {
    const category = publicCategory(item.localCategory);
    if (!category || !item.expectedFullUrl) continue;
    if (publicationBlockReason({
      full: item.expectedFullUrl,
      thumb: item.expectedFullUrl.replace('/images/', '/thumbs/'),
      name: item.title
    }, category)) continue;
    if (!manifest[category]) manifest[category] = [];
    if (entryExists(manifest[category], item.expectedFullUrl)) continue;

    manifest[category].push({
      full: item.expectedFullUrl,
      thumb: item.expectedFullUrl.replace('/images/', '/thumbs/'),
      name: item.title
    });
    added += 1;
  }

  for (const category of Object.keys(manifest)) {
    manifest[category].sort((a, b) => {
      const aName = a.name || '';
      const bName = b.name || '';
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  const orderedManifest = Object.fromEntries(
    Object.entries(manifest).sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
  );

  const publicManifest = sanitizeManifest(orderedManifest).manifest;
  fs.writeFileSync(manifestPath, JSON.stringify(publicManifest, null, 2) + '\n');
  console.log(`Added ${added} R2-ready gallery items to ${path.relative(rootDir, manifestPath)}.`);
}

main();
