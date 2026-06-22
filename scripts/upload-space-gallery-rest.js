#!/usr/bin/env node
/**
 * Upload the local Space Gallery to Cloudflare R2 via the REST object API.
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/upload-space-gallery-rest.js "/Users/tai/Pictures/Space Gallery"
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { readdir } = require('fs/promises');

const ACCOUNT_ID = '45c2547d0e32e249912336f66a9c5c01';
const BUCKET = 'taiyzun-gallery';
const PUBLIC_URL = 'https://assets.taiyzun.com';
const PREFIX = process.env.SPACE_GALLERY_PREFIX || 'space-gallery';
const MANIFEST_KEY = process.env.SPACE_GALLERY_MANIFEST_KEY || `${PREFIX}/manifest.json`;
const LOCAL_MANIFEST_PATH = process.env.SPACE_GALLERY_LOCAL_MANIFEST_PATH || path.join(process.cwd(), 'assets', 'space-gallery-manifest.json');
const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.avif', '.tiff', '.bmp', '.gif']);
const FULL_MAX = 1920;
const THUMB_MAX = 480;
const CONCURRENCY = 4;
const MAX_RETRIES = 4;
const LIMIT = Number(process.env.SPACE_GALLERY_LIMIT || '0');
const CATEGORY_FILTER = new Set(
  (process.env.SPACE_GALLERY_CATEGORY_FILTER || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);
const MERGE_EXISTING_MANIFEST = /^(1|true|yes)$/i.test(process.env.SPACE_GALLERY_MERGE_EXISTING_MANIFEST || '');
const PLACEHOLDER_FULL_SIZE = 1600;
const PLACEHOLDER_THUMB_SIZE = 480;

const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const sourceRoot = process.argv[2];

if (!token) {
  console.error('Missing CLOUDFLARE_API_TOKEN or CF_API_TOKEN.');
  process.exit(1);
}

if (!sourceRoot || !fs.existsSync(sourceRoot)) {
  console.error('Pass the Space Gallery folder as the first argument.');
  process.exit(1);
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function objectPath(key) {
  return key.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function fileHash(rel) {
  return crypto.createHash('sha1').update(rel).digest('hex').slice(0, 8);
}

function categoryFromRel(rel) {
  const parts = normalizePath(rel).split('/');
  return parts.length > 1 ? parts[0].trim() : 'Gallery';
}

function titleFromRel(rel) {
  return path.basename(rel, path.extname(rel)).trim();
}

function buildKeys(rel) {
  const category = categoryFromRel(rel);
  const title = titleFromRel(rel);
  const hash = fileHash(normalizePath(rel));
  const categorySlug = slugify(category) || 'gallery';
  const titleSlug = slugify(title) || `image-${hash}`;
  return {
    category,
    title,
    fullKey: `${PREFIX}/images/${categorySlug}/${titleSlug}-${hash}.webp`,
    thumbKey: `${PREFIX}/thumbs/${categorySlug}/${titleSlug}-${hash}.webp`,
  };
}

async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full, base));
      continue;
    }

    if (!IMG_EXTS.has(path.extname(entry.name).toLowerCase())) continue;
    files.push({ full, rel: path.relative(base, full) });
  }

  return files.sort((a, b) => a.rel.localeCompare(b.rel, undefined, { numeric: true, sensitivity: 'base' }));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) {
    throw new Error(`GET ${url} failed with ${res.status}`);
  }
  return res.json();
}

function writeLocalManifest(manifestJson) {
  const outputDir = path.dirname(LOCAL_MANIFEST_PATH);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(LOCAL_MANIFEST_PATH, manifestJson);
}

async function request(method, key, body, contentType, cacheControl) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${objectPath(key)}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
      },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${key} failed with ${res.status}: ${text.slice(0, 240)}`);
  }

  return res;
}

async function uploadWithRetry(key, body, contentType, cacheControl) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await request('PUT', key, body, contentType, cacheControl);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 800));
    }
  }
  throw lastError;
}

async function renderVariants(filePath) {
  const full = await sharp(filePath, { failOn: 'none' })
    .rotate()
    .resize({ width: FULL_MAX, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const thumb = await sharp(filePath, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_MAX, withoutEnlargement: true })
    .webp({ quality: 72, effort: 3 })
    .toBuffer();

  return { full, thumb };
}

async function renderPlaceholder() {
  const full = await sharp({
    create: {
      width: PLACEHOLDER_FULL_SIZE,
      height: PLACEHOLDER_FULL_SIZE,
      channels: 3,
      background: { r: 248, g: 246, b: 241 },
    },
  })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const thumb = await sharp({
    create: {
      width: PLACEHOLDER_THUMB_SIZE,
      height: PLACEHOLDER_THUMB_SIZE,
      channels: 3,
      background: { r: 248, g: 246, b: 241 },
    },
  })
    .webp({ quality: 72, effort: 3 })
    .toBuffer();

  return { full, thumb };
}

async function processFile(file, index, total, manifest) {
  const { category, title, fullKey, thumbKey } = buildKeys(file.rel);
  const label = `[${String(index).padStart(String(total).length, '0')}/${total}]`;

  try {
    const size = fs.statSync(file.full).size;
    const emptySource = size === 0;
    const { full, thumb } = emptySource
      ? await renderPlaceholder()
      : await renderVariants(file.full);
    await uploadWithRetry(fullKey, full, 'image/webp', 'public, max-age=31536000, immutable');
    await uploadWithRetry(thumbKey, thumb, 'image/webp', 'public, max-age=31536000, immutable');

    if (!manifest[category]) manifest[category] = [];
    manifest[category].push({
      full: `${PUBLIC_URL}/${fullKey}`,
      thumb: `${PUBLIC_URL}/${thumbKey}`,
      name: title,
    });

    process.stdout.write(`${label} ${emptySource ? 'placeholder' : 'uploaded'} ${title}\n`);
  } catch (error) {
    process.stdout.write(`${label} failed ${title}: ${error.message}\n`);
  }
}

async function main() {
  console.log(`Source: ${sourceRoot}`);
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Manifest: ${PUBLIC_URL}/${MANIFEST_KEY}`);
  console.log(`Local manifest: ${LOCAL_MANIFEST_PATH}`);

  const discoveredFiles = await walk(sourceRoot);
  const categoryFilteredFiles = CATEGORY_FILTER.size
    ? discoveredFiles.filter(file => CATEGORY_FILTER.has(categoryFromRel(file.rel)))
    : discoveredFiles;
  const files = LIMIT > 0 ? categoryFilteredFiles.slice(0, LIMIT) : categoryFilteredFiles;
  console.log(`Found ${files.length} images`);

  if (!files.length) {
    console.log('No images found.');
    return;
  }

  const manifest = {};
  let cursor = 0;

  async function worker() {
    while (cursor < files.length) {
      const current = cursor++;
      await processFile(files[current], current + 1, files.length, manifest);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  for (const category of Object.keys(manifest)) {
    manifest[category].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }

  let mergedManifest = manifest;

  if (MERGE_EXISTING_MANIFEST) {
    const existingManifest = await fetchJson(`${PUBLIC_URL}/${MANIFEST_KEY}`);
    const processedCategories = new Set(Object.keys(manifest));
    mergedManifest = { ...existingManifest };
    for (const category of processedCategories) {
      mergedManifest[category] = manifest[category];
    }
  }

  const orderedManifest = Object.fromEntries(
    Object.entries(mergedManifest).sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
  );

  const manifestJson = JSON.stringify(orderedManifest, null, 2);
  writeLocalManifest(manifestJson);
  await uploadWithRetry(
    MANIFEST_KEY,
    Buffer.from(manifestJson),
    'application/json',
    'public, max-age=300, must-revalidate'
  );

  const totalImages = Object.values(orderedManifest).reduce((sum, items) => sum + items.length, 0);
  console.log(`Uploaded ${totalImages} images across ${Object.keys(orderedManifest).length} categories.`);
  console.log(`Manifest URL: ${PUBLIC_URL}/${MANIFEST_KEY}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
