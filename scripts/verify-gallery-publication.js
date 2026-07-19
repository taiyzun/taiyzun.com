#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {
  APPROVED_FINGERPRINTS,
  KNOWN_WITHHELD_FINGERPRINTS,
  entryFingerprint,
  publicationBlockReason
} = require('./gallery-publication-policy');

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'assets', 'space-gallery-manifest.json');
const shareIndexPath = path.join(rootDir, 'assets', 'space-gallery-share-index.json');
const galleryIndexPath = path.join(rootDir, 'assets', 'space-gallery-index.json');
const chunksDir = path.join(rootDir, 'assets', 'space-gallery-categories');
const errors = [];
const allowedHost = 'assets.taiyzun.com';

function idFromUrl(value) {
  try {
    return path.basename(new URL(value).pathname).replace(/\.(?:webp|avif|jpe?g|png)$/i, '');
  } catch {
    return '';
  }
}

function entryKey(category, entry) {
  return JSON.stringify([category, entry.full || '', entry.thumb || '', entry.name || '']);
}

function inspectAssetUrl(value, kind, source) {
  try {
    const url = new URL(value);
    const expectedPrefix = kind === 'full' ? '/space-gallery/images/' : '/space-gallery/thumbs/';
    if (url.protocol !== 'https:' || url.hostname !== allowedHost || !url.pathname.startsWith(expectedPrefix)) {
      errors.push(`${source} contains a disallowed ${kind} asset route.`);
    }
  } catch {
    errors.push(`${source} contains an invalid ${kind} asset URL.`);
  }
}

function inspectEntries(entries, category, source) {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    const reason = publicationBlockReason(entry, category);
    if (reason) errors.push(`${source} contains a withheld ${reason} item.`);
    inspectAssetUrl(entry.full, 'full', source);
    inspectAssetUrl(entry.thumb, 'thumb', source);
  }
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestKeys = new Set();
const manifestIds = new Map();
const manifestFingerprints = new Set();
const fullUrls = new Set();
let manifestTotal = 0;

for (const [category, entries] of Object.entries(manifest)) {
  inspectEntries(entries, category, 'source manifest');
  manifestTotal += entries.length;
  for (const entry of entries) {
    const key = entryKey(category, entry);
    if (manifestKeys.has(key)) errors.push('Source manifest contains a duplicate gallery entry.');
    manifestKeys.add(key);
    manifestFingerprints.add(entryFingerprint(entry));
    if (fullUrls.has(entry.full)) errors.push('Source manifest contains a duplicate full-image URL.');
    fullUrls.add(entry.full);
    const id = idFromUrl(entry.full || entry.thumb);
    if (!id) errors.push('Source manifest contains an entry without a valid public ID.');
    else if (manifestIds.has(id)) errors.push('Source manifest contains a duplicate public ID.');
    else manifestIds.set(id, { category, entry });
  }
}

if (APPROVED_FINGERPRINTS.size !== manifestTotal || manifestFingerprints.size !== manifestTotal) {
  errors.push('The fail-closed publication allowlist does not exactly match the public manifest.');
}
if ([...manifestFingerprints].some((fingerprint) => !APPROVED_FINGERPRINTS.has(fingerprint))) {
  errors.push('The public manifest contains an item outside the sealed publication allowlist.');
}
if ([...KNOWN_WITHHELD_FINGERPRINTS].some((fingerprint) => manifestFingerprints.has(fingerprint))) {
  errors.push('A known sensitive item remains in the public manifest.');
}

const unapprovedSentinel = {
  full: 'https://assets.taiyzun.com/space-gallery/images/review/unapproved-policy-sentinel.webp',
  thumb: 'https://assets.taiyzun.com/space-gallery/thumbs/review/unapproved-policy-sentinel.webp',
  name: 'Unapproved policy sentinel'
};
if (publicationBlockReason(unapprovedSentinel, 'Gallery') !== 'not-approved-for-publication') {
  errors.push('The gallery publication policy no longer fails closed for unapproved items.');
}

if (fs.existsSync(shareIndexPath)) {
  const shareIndex = JSON.parse(fs.readFileSync(shareIndexPath, 'utf8'));
  const shareItems = shareIndex.items || {};
  if (shareIndex.total !== Object.keys(shareItems).length || shareIndex.total !== manifestTotal) {
    errors.push('Share-index totals do not match the public manifest.');
  }
  for (const [id, entry] of Object.entries(shareItems)) {
    inspectEntries([entry], entry.category, 'share index');
    const expected = manifestIds.get(id);
    if (!expected || expected.category !== entry.category || expected.entry.full !== entry.full || expected.entry.thumb !== entry.thumb) {
      errors.push('Share index does not match the public manifest.');
    }
  }
} else {
  errors.push('Public gallery share index is missing.');
}

if (fs.existsSync(chunksDir) && fs.existsSync(galleryIndexPath)) {
  const galleryIndex = JSON.parse(fs.readFileSync(galleryIndexPath, 'utf8'));
  const chunkKeys = new Set();
  let chunkTotal = 0;
  for (const categoryInfo of galleryIndex.categories || []) {
    const file = path.basename(categoryInfo.path || '');
    const chunkPath = path.join(chunksDir, file);
    if (!file.endsWith('.json') || !fs.existsSync(chunkPath)) {
      errors.push('Gallery index references a missing category chunk.');
      continue;
    }
    const entries = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    inspectEntries(entries, categoryInfo.key, `gallery chunk ${file}`);
    if (categoryInfo.count !== entries.length) errors.push('Gallery category count does not match its chunk.');
    chunkTotal += entries.length;
    for (const entry of entries) chunkKeys.add(entryKey(categoryInfo.key, entry));
  }
  if (galleryIndex.total !== chunkTotal || chunkTotal !== manifestTotal) errors.push('Gallery index totals do not match the public manifest.');
  if (chunkKeys.size !== manifestKeys.size || [...manifestKeys].some((key) => !chunkKeys.has(key))) {
    errors.push('Gallery chunks do not contain exactly the public manifest entries.');
  }
} else {
  errors.push('Public gallery index or category chunks are missing.');
}

if (errors.length) {
  console.error(errors.slice(0, 20).join('\n'));
  console.error(`Gallery publication policy failed with ${errors.length} finding(s).`);
  process.exit(1);
}

console.log(`Gallery publication policy passed: ${manifestTotal} allowlisted items; unknown and withheld items fail closed.`);
