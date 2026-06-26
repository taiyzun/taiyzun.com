#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'assets', 'space-gallery-manifest.json');
const outputPath = path.join(rootDir, 'assets', 'space-gallery-share-index.json');

function idFromUrl(value) {
  try {
    const parsed = new URL(value);
    return path.basename(parsed.pathname).replace(/\.(?:webp|avif|jpe?g|png)$/i, '');
  } catch {
    return String(value || '')
      .split('/')
      .pop()
      .replace(/\?.*$/, '')
      .replace(/\.(?:webp|avif|jpe?g|png)$/i, '');
  }
}

function displayCategory(category) {
  if (category === 'mEmEs') return 'Signature Notes';
  if (category === '_Temp_Review') return 'Curatorial Review';
  return category || 'Gallery';
}

function buildShareIndex() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const items = {};

  for (const [category, entries] of Object.entries(manifest)) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      const id = idFromUrl(entry.full || entry.thumb || entry.name);
      if (!id || items[id]) continue;

      items[id] = {
        id,
        title: entry.name || 'Taiyzun Creation',
        category,
        displayCategory: displayCategory(category),
        full: entry.full || entry.thumb || '',
        thumb: entry.thumb || entry.full || '',
        galleryPath: `/creations?image=${encodeURIComponent(id)}`,
        sharePath: `/creations/image/${encodeURIComponent(id)}`
      };
    }
  }

  const orderedItems = Object.fromEntries(
    Object.entries(items).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' }))
  );

  const nextPayload = {
    generatedAt: new Date().toISOString(),
    total: Object.keys(orderedItems).length,
    items: orderedItems
  };

  if (fs.existsSync(outputPath)) {
    try {
      const previousPayload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      const previousStable = JSON.stringify({
        total: previousPayload.total,
        items: previousPayload.items
      });
      const nextStable = JSON.stringify({
        total: nextPayload.total,
        items: nextPayload.items
      });
      if (previousStable === nextStable && previousPayload.generatedAt) {
        nextPayload.generatedAt = previousPayload.generatedAt;
      }
    } catch {
      // Regenerate from the manifest when an existing index cannot be parsed.
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(nextPayload, null, 2));

  console.log(`Built gallery share index with ${Object.keys(orderedItems).length} items.`);
}

buildShareIndex();
