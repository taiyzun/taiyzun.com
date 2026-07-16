#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const canonicalRelativePath = 'assets/images/TaiyZun-Sword-logo-2026.png';
const canonicalSha256 = 'b83614a70f801e5f0e14220a50059d34e1f4207bc5ac8e4aefe440f33bf874f7';
const canonicalPath = path.join(projectRoot, canonicalRelativePath);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

assert(fs.existsSync(canonicalPath), `Missing canonical artwork: ${canonicalRelativePath}`);

const canonicalBuffer = fs.readFileSync(canonicalPath);
const canonicalDigest = crypto.createHash('sha256').update(canonicalBuffer).digest('hex');
assert(
  canonicalDigest === canonicalSha256,
  'The final 2026 canonical logo pixels changed. Restore the approved transparent source or intentionally update this guard.'
);

const canonicalMetadata = await sharp(canonicalBuffer).metadata();
assert(canonicalMetadata.width === 13999, `Canonical width changed: ${canonicalMetadata.width}`);
assert(canonicalMetadata.height === 10000, `Canonical height changed: ${canonicalMetadata.height}`);
assert(canonicalMetadata.hasAlpha === true, 'Canonical logo transparency is missing.');

const canonicalRatio = canonicalMetadata.width / canonicalMetadata.height;
const variants = [
  { file: 'assets/images/TaiyZun-Sword-logo-2026-ui-384.png', width: 384, height: 274, preserveRatio: true, sha256: '4716aae0877027ce2d7efe9ba8038594bda0c1cd5662a7ded589b9fee0af397e' },
  { file: 'assets/images/TaiyZun-Sword-logo-2026-ui-700.png', width: 700, height: 500, preserveRatio: true, sha256: 'c314bba1b0b6ddba7b216cd5f91a74d13326c5751ae5facf3355f3f08118b9dc' },
  { file: 'assets/images/TaiyZun-Sword-logo-2026-ui-1024.png', width: 1024, height: 731, preserveRatio: true, sha256: '7e3cc6f82c767abbc463c7452aec13cdcc9dbecd62b2f700fe6d0d5116e692ea' },
  { file: 'assets/images/TaiyZun-Sword-logo-2026-social.png', width: 1200, height: 630, preserveRatio: false, sha256: 'c9964228ed898a32d9930329c78e692f654b9861157d1b2a652f23280194c3ed' },
  { file: 'assets/images/TaiyZun-Sword-logo-2026-social-square.png', width: 1200, height: 1200, preserveRatio: false, sha256: 'daed8e20b52c6106b19e97bb43ff5a7c00ef1f203e69028688d4e0cb8c1cfca7' }
];

for (const variant of variants) {
  const variantPath = path.join(projectRoot, variant.file);
  assert(fs.existsSync(variantPath), `Missing approved logo derivative: ${variant.file}`);

  const variantBuffer = fs.readFileSync(variantPath);
  const variantDigest = crypto.createHash('sha256').update(variantBuffer).digest('hex');
  assert(
    variantDigest === variant.sha256,
    `${variant.file} pixels changed. Regenerate it deterministically from the approved transparent source.`
  );

  const metadata = await sharp(variantBuffer).metadata();
  assert(metadata.width === variant.width, `${variant.file} width must be ${variant.width}, found ${metadata.width}`);
  assert(metadata.height === variant.height, `${variant.file} height must be ${variant.height}, found ${metadata.height}`);
  assert(metadata.hasAlpha === true, `${variant.file} must retain an alpha channel.`);

  if (variant.preserveRatio) {
    const ratioError = Math.abs(metadata.width / metadata.height - canonicalRatio) / canonicalRatio;
    assert(ratioError < 0.003, `${variant.file} aspect ratio changed; distortion is not allowed.`);
  }
}

const pageFiles = ['index.html', 'journey.html', 'creations.html', 'odyssey.html', 'connect.html', '404.html', '500.html'];
for (const pageFile of pageFiles) {
  const html = read(pageFile);
  assert(
    html.includes('property="fb:app_id" content="3964117170385062"'),
    `${pageFile} is missing the approved Facebook app id.`
  );
  assert(
    html.includes('property="og:image" content="https://taiyzun.com/assets/images/TaiyZun-Sword-logo-2026-social-square.png"'),
    `${pageFile} must use the uncropped square Open Graph derivative.`
  );
  assert(
    html.includes('name="twitter:image" content="https://taiyzun.com/assets/images/TaiyZun-Sword-logo-2026-social.png"'),
    `${pageFile} must use the 1200 by 630 Twitter derivative.`
  );
  assert(
    !/<(?:img|source)\b[^>]*(?:src|srcset)=["'][^"']*TaiyZun-Sword-logo-2026\.png/i.test(html),
    `${pageFile} directly loads the 3.2 MB canonical source instead of a transparent UI derivative.`
  );
}

for (const file of ['js/taiyzun-sword.js', 'js/taiyzun-sword.min.js', 'js/site-decorative-field.js', 'js/site-decorative-field.min.js']) {
  const source = read(file);
  assert(
    !source.includes('TaiyZun ~ sword ~ logO ~ 2021'),
    `${file} still references the retired 2021 sword signature.`
  );
}

console.log('Brand asset verification passed: canonical pixels, alpha, proportions and social/UI derivatives are protected.');
