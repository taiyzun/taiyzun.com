#!/usr/bin/env node
/**
 * upload-to-r2.js
 * ───────────────
 * Uploads a local image folder to Cloudflare R2 (taiyzun-gallery bucket).
 * • Converts every image to WebP
 * • Resizes originals to max 1920px wide
 * • Generates 480px thumbnails
 * • Skips files already uploaded (resumable)
 * • Writes a local, gitignored pending manifest for review; never exposes a raw R2 manifest
 *
 * Usage:
 *   export R2_ACCESS_KEY_ID=your_key
 *   export R2_SECRET_ACCESS_KEY=your_secret
 *   node scripts/upload-to-r2.js /path/to/your/images/folder
 */

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const sharp  = require('sharp');
const fs     = require('fs');
const path   = require('path');
const { readdir } = require('fs/promises');
const { publicationBlockReason, sanitizeManifest } = require('./gallery-publication-policy');

/* ── Config ────────────────────────────────────────────── */
const ACCOUNT_ID  = '45c2547d0e32e249912336f66a9c5c01';
const BUCKET      = 'taiyzun-gallery';
const PUBLIC_URL  = 'https://assets.taiyzun.com';
const MAX_FULL    = 1920;   // max width for full image (px)
const THUMB_W     = 480;    // thumbnail width (px)
const CONCURRENCY = 4;      // parallel uploads
const IMG_EXTS    = new Set(['.jpg','.jpeg','.png','.webp','.heic','.avif','.tiff','.bmp','.gif']);

/* ── Validate env ──────────────────────────────────────── */
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('\n❌  Missing credentials.\n');
  console.error('    Run:');
  console.error('    export R2_ACCESS_KEY_ID=your_key');
  console.error('    export R2_SECRET_ACCESS_KEY=your_secret\n');
  process.exit(1);
}

const localFolder = process.argv[2];
if (!localFolder || !fs.existsSync(localFolder)) {
  console.error('\n❌  Pass your image folder as the first argument.');
  console.error('    node scripts/upload-to-r2.js /path/to/images\n');
  process.exit(1);
}

/* ── R2 client ─────────────────────────────────────────── */
const s3 = new S3Client({
  region:   'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

/* ── Helpers ───────────────────────────────────────────── */
async function walk(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue; // skip hidden
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...await walk(full, base));
    } else if (IMG_EXTS.has(path.extname(e.name).toLowerCase())) {
      files.push({ full, rel: path.relative(base, full) });
    }
  }
  return files;
}

async function keyExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function upload(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket:       BUCKET,
    Key:          key,
    Body:         buffer,
    ContentType:  contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

function categoryFromPath(rel) {
  const parts = rel.replace(/\\/g, '/').split('/');
  // If file is in a subfolder, use that folder name as category
  // Otherwise use 'gallery'
  if (parts.length > 1) {
    return parts[0]
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }
  return 'Gallery';
}

function slugFromPath(rel) {
  const ext  = path.extname(rel);
  const base = rel.replace(/\\/g, '/').replace(ext, '');
  const parts = base.split('/');
  return parts[parts.length - 1]
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

/* ── Process one image ─────────────────────────────────── */
async function processImage(file, idx, total, manifest) {
  const cat      = categoryFromPath(file.rel);
  const slug     = slugFromPath(file.rel);
  const catSlug  = cat.toLowerCase().replace(/\s+/g, '_');
  const fullKey  = `images/${catSlug}/${slug}.webp`;
  const thumbKey = `thumbs/${catSlug}/${slug}.webp`;
  const label    = `[${String(idx).padStart(4)}/${total}]`;
  const sourceCategory = file.rel.replace(/\\/g, '/').split('/')[0].trim();
  const candidate = {
    full: `${PUBLIC_URL}/${fullKey}`,
    thumb: `${PUBLIC_URL}/${thumbKey}`,
    name: path.basename(file.rel, path.extname(file.rel)),
    title: file.rel,
  };
  const blockedBy = publicationBlockReason(candidate, sourceCategory || cat);

  // Publication policy must run before even checking or writing an R2 object.
  if (blockedBy) {
    process.stdout.write(`${label} ⛔  withheld (${blockedBy})\n`);
    return;
  }

  // Skip if already uploaded
  if (await keyExists(fullKey)) {
    process.stdout.write(`${label} ⏭  ${slug}\n`);
    if (!manifest[cat]) manifest[cat] = [];
    manifest[cat].push({ full: `${PUBLIC_URL}/${fullKey}`, thumb: `${PUBLIC_URL}/${thumbKey}`, name: slug });
    return;
  }

  let img;
  try {
    img = sharp(file.full, { failOn: 'none' });
    const meta = await img.metadata();
    const origSize = fs.statSync(file.full).size;

    // Full image
    const w = (meta.width || MAX_FULL) > MAX_FULL ? MAX_FULL : (meta.width || MAX_FULL);
    const fullBuf = await sharp(file.full, { failOn: 'none' })
      .rotate()
      .resize(w, null, { withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    // Thumbnail
    const thumbBuf = await sharp(file.full, { failOn: 'none' })
      .rotate()
      .resize(THUMB_W, null, { withoutEnlargement: true })
      .webp({ quality: 72, effort: 3 })
      .toBuffer();

    await upload(fullKey,  fullBuf,  'image/webp');
    await upload(thumbKey, thumbBuf, 'image/webp');

    const saved = Math.round((origSize - fullBuf.length) / 1024);
    process.stdout.write(`${label} ✅  ${slug}  (saved ~${saved}KB)\n`);

    if (!manifest[cat]) manifest[cat] = [];
    manifest[cat].push({ full: `${PUBLIC_URL}/${fullKey}`, thumb: `${PUBLIC_URL}/${thumbKey}`, name: slug });

  } catch (e) {
    process.stdout.write(`${label} ⚠️  ${slug} — ${e.message}\n`);
  }
}

/* ── Main ──────────────────────────────────────────────── */
async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   taiyzun-gallery R2 uploader        ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`  Folder : ${localFolder}`);
  console.log(`  Bucket : ${BUCKET}`);
  console.log(`  Public : ${PUBLIC_URL}\n`);

  const files = await walk(localFolder);
  console.log(`  Found ${files.length} images\n`);

  if (files.length === 0) {
    console.log('  No images found. Check the folder path.\n');
    process.exit(0);
  }

  const manifest = {};
  let done = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(f => processImage(f, i + batch.indexOf(f) + 1, files.length, manifest)));
    done += batch.length;
  }

  // Keep publication metadata local until it has passed the fail-closed review gate.
  console.log('\n  Writing local pending manifest...');
  const publication = sanitizeManifest(manifest);
  const json = JSON.stringify(publication.manifest, null, 2);
  const pendingPath = path.join(process.cwd(), 'privacy-review', 'pending-r2-upload-manifest.json');
  fs.mkdirSync(path.dirname(pendingPath), { recursive: true });
  fs.writeFileSync(pendingPath, `${json}\n`);

  const totalImages = Object.values(publication.manifest).reduce((s, a) => s + a.length, 0);
  const categories  = Object.keys(publication.manifest);
  if (publication.excluded.length) {
    console.log(`  Withheld  : ${publication.excluded.length} sensitive item(s)`);
  }

  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   Done!                              ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`  Images    : ${totalImages}`);
  console.log(`  Categories: ${categories.join(', ')}`);
  console.log(`  Pending   : ${pendingPath}`);
  console.log('  Publication metadata was not uploaded to the public R2 domain.\n');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
