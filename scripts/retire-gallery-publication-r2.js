#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ACCOUNT_ID = '45c2547d0e32e249912336f66a9c5c01';
const BUCKET = 'taiyzun-gallery';
const PUBLIC_HOST = 'assets.taiyzun.com';
const PUBLIC_MANIFEST_KEY = 'space-gallery/manifest.json';
const reviewPath = path.resolve(__dirname, '..', 'privacy-review', 'withheld-gallery-items.json');
const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN;
const dryRun = process.argv.includes('--dry-run');

function objectPath(key) {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function loadWithheldKeys() {
  if (!fs.existsSync(reviewPath)) return [];
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  const keys = new Set();

  for (const item of Array.isArray(review.items) ? review.items : []) {
    for (const value of [item && item.entry && item.entry.full, item && item.entry && item.entry.thumb]) {
      if (!value) continue;
      let url;
      try {
        url = new URL(value);
      } catch {
        continue;
      }
      if (url.hostname !== PUBLIC_HOST) continue;
      const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      if (/^space-gallery\/(?:images|thumbs)\//.test(key)) keys.add(key);
    }
  }

  return [...keys].sort();
}

async function deleteObject(key) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${objectPath(key)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 deletion failed with status ${response.status}.`);
  }
}

async function verifyGone(key) {
  const response = await fetch(`https://${PUBLIC_HOST}/${objectPath(key)}?retired=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' },
    redirect: 'manual'
  });
  return response.status === 404 || response.status === 410;
}

async function runPool(items, worker, concurrency = 4) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, run));
}

async function main() {
  const withheldKeys = loadWithheldKeys();
  const keys = [PUBLIC_MANIFEST_KEY, ...withheldKeys];

  if (dryRun) {
    console.log(`R2 retirement dry run: remove 1 public manifest and ${withheldKeys.length} withheld image objects.`);
    return;
  }
  if (!token) throw new Error('Missing CLOUDFLARE_API_TOKEN or CF_API_TOKEN.');

  await runPool(keys, deleteObject);

  const failed = [];
  await runPool(keys, async (key) => {
    if (!(await verifyGone(key))) failed.push(key);
  });
  if (failed.length) {
    throw new Error(`${failed.length} retired R2 object(s) remain publicly reachable; purge the CDN cache and rerun verification.`);
  }

  console.log(`Retired the public gallery manifest and ${withheldKeys.length} withheld image objects from R2.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
