#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const errors = [];
let checkedReferences = 0;

const htmlFiles = ['index.html', 'journey.html', 'creations.html', 'odyssey.html', 'connect.html', '404.html', '500.html'];
const parityFiles = [
  ...htmlFiles,
  '_headers',
  '_redirects',
  'favicon.ico',
  'llms.txt',
  'manifest.json',
  'robots.txt',
  'service-worker.js',
  'sitemap.xml'
];
const requiredFiles = [
  ...parityFiles,
  '3d/Taiyzun_Sword_Web.glb',
  '3d/Taiyzun_Sword_Fallback.png',
  'assets/images/TaiyZun-Sword-logo-2026.png',
  'assets/images/TaiyZun-Sword-logo-2026-ui-384.png',
  'assets/images/TaiyZun-Sword-logo-2026-ui-700.png',
  'assets/images/TaiyZun-Sword-logo-2026-ui-1024.png',
  'assets/images/TaiyZun-Sword-logo-2026-social.png',
  'assets/images/TaiyZun-Sword-logo-2026-social-square.png',
  'assets/video/sora.mp4',
  'js/site-mobile-lite.min.js',
  'js/site-decorative-field.min.js',
  'js/taiyzun-sword.min.js'
];
const cleanRoutes = new Map([
  ['', 'index.html'],
  ['index', 'index.html'],
  ['journey', 'journey.html'],
  ['creations', 'creations.html'],
  ['odyssey', 'odyssey.html'],
  ['connect', 'connect.html'],
  ['404', '404.html'],
  ['500', '500.html']
]);

function fail(message) {
  errors.push(message);
}

function assertFile(relativePath, context = '') {
  const target = path.join(distRoot, relativePath);
  checkedReferences += 1;
  if (!target.startsWith(distRoot) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    fail(`Missing dist file ${relativePath}${context ? ` referenced by ${context}` : ''}`);
    return false;
  }
  return true;
}

function walkFiles(directory, suffix) {
  if (!fs.existsSync(directory)) return [];
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const current = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkFiles(current, suffix));
    } else if (!suffix || entry.name.endsWith(suffix)) {
      found.push(current);
    }
  }
  return found;
}

function localPathFromReference(reference, fromRelativePath) {
  const trimmed = String(reference || '').trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /^(?:data|blob|mailto|tel|javascript):/i.test(trimmed)) {
    return null;
  }
  if (/^https?:/i.test(trimmed)) {
    return null;
  }

  let withoutSuffix = trimmed.split('#')[0].split('?')[0];
  try {
    withoutSuffix = decodeURIComponent(withoutSuffix);
  } catch (_) {}
  if (!withoutSuffix) return cleanRoutes.get('') || null;

  const relative = withoutSuffix.startsWith('/')
    ? path.posix.normalize(withoutSuffix.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromRelativePath), withoutSuffix));

  if (relative === '.') {
    return cleanRoutes.get('');
  }
  if (relative.startsWith('../') || path.isAbsolute(relative)) {
    fail(`Unsafe local reference ${reference} in ${fromRelativePath}`);
    return null;
  }

  const routeKey = relative.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
  if (cleanRoutes.has(routeKey)) {
    return cleanRoutes.get(routeKey);
  }
  if (/^(?:api|cdn-cgi|creations\/image)(?:\/|$)/.test(relative)) {
    return null;
  }
  return relative;
}

if (!fs.existsSync(distRoot)) {
  throw new Error('dist/ is missing. Run npm run build before npm run test:dist.');
}

if (fs.existsSync(path.join(distRoot, 'assets', 'space-gallery-manifest.json'))) {
  fail('Raw gallery source manifest must not be published in dist/.');
}

for (const file of requiredFiles) {
  assertFile(file);
}

for (const file of parityFiles) {
  const sourcePath = path.join(projectRoot, file);
  const distPath = path.join(distRoot, file);
  if (!fs.existsSync(sourcePath) || !fs.existsSync(distPath)) continue;
  if (!fs.readFileSync(sourcePath).equals(fs.readFileSync(distPath))) {
    fail(`Built ${file} differs from its source file.`);
  }
}

const headersConfig = fs.readFileSync(path.join(distRoot, '_headers'), 'utf8');
const headerSections = new Map();
let activeHeaderTarget = '';
for (const line of headersConfig.split(/\r?\n/)) {
  if (!line.trim()) {
    activeHeaderTarget = '';
  } else if (!/^\s/.test(line)) {
    activeHeaderTarget = line.trim();
    headerSections.set(activeHeaderTarget, []);
  } else if (activeHeaderTarget) {
    headerSections.get(activeHeaderTarget).push(line.trim());
  }
}

for (const route of ['/', '/journey', '/creations', '/odyssey', '/connect', '/*.html']) {
  const directives = headerSections.get(route) || [];
  const cacheControl = directives.find((directive) => /^cache-control:/i.test(directive)) || '';
  if (!/(?:^|[,\s])no-transform(?:$|[,\s])/i.test(cacheControl)) {
    fail(`${route} must preserve Cache-Control: no-transform to prevent Cloudflare HTML script injection.`);
  }
}

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(path.join(distRoot, htmlFile), 'utf8');
  const references = [];
  const attributeRegex = /\b(?:src|href|poster|data-src)=["']([^"']+)["']/gi;
  const srcsetRegex = /\bsrcset=["']([^"']+)["']/gi;
  let match;

  while ((match = attributeRegex.exec(html))) {
    references.push(match[1]);
  }
  while ((match = srcsetRegex.exec(html))) {
    for (const candidate of match[1].split(',')) {
      references.push(candidate.trim().split(/\s+/)[0]);
    }
  }

  for (const reference of references) {
    const localPath = localPathFromReference(reference, htmlFile);
    if (localPath) assertFile(localPath, htmlFile);
  }

  if (/<(?:img|source)\b[^>]*(?:src|srcset)=["'][^"']*TaiyZun-Sword-logo-2026\.png/i.test(html)) {
    fail(`${htmlFile} directly loads the canonical 3.2 MB logo source.`);
  }
  const unversionedFallback = references.find(
    (reference) => reference.includes('Taiyzun_Sword_Fallback.png') && !reference.includes('?v=')
  );
  if (unversionedFallback) {
    fail(`${htmlFile} references an immutable 3D fallback without a version.`);
  }
  if ((html.match(/<source\b[^>]*>/gi) || []).some((tag) => /\ssrc=["'][^"']*sora\.mp4/i.test(tag))) {
    fail(`${htmlFile} eagerly assigns the ambient MP4 instead of deferring it with data-src.`);
  }
  if (/<script\b[^>]*\bsrc=["'][^"']*taiyzun-sword\.min\.js/i.test(html)) {
    fail(`${htmlFile} eagerly loads the 3D runtime instead of using TAIYZUN_load3DField.`);
  }
  if (!html.includes('TAIYZUN_load3DField')) {
    fail(`${htmlFile} is missing the interaction-aware 3D loader.`);
  }
}

for (const cssPath of walkFiles(path.join(distRoot, 'css'), '.css')) {
  const cssRelativePath = path.relative(distRoot, cssPath).split(path.sep).join('/');
  const css = fs.readFileSync(cssPath, 'utf8');
  const urlRegex = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
  let match;
  while ((match = urlRegex.exec(css))) {
    const localPath = localPathFromReference(match[1], cssRelativePath);
    if (localPath) assertFile(localPath, cssRelativePath);
  }
}

for (const jsPath of walkFiles(path.join(distRoot, 'js'), '.js')) {
  const jsRelativePath = path.relative(distRoot, jsPath).split(path.sep).join('/');
  const source = fs.readFileSync(jsPath, 'utf8');
  const importRegex = /import\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = importRegex.exec(source))) {
    const localPath = localPathFromReference(match[1], jsRelativePath);
    if (localPath) assertFile(localPath, jsRelativePath);
  }
}

const decorativeScript = fs.readFileSync(path.join(distRoot, 'js/site-decorative-field.min.js'), 'utf8');
const decorativeReferences = new Set(
  decorativeScript.match(/assets\/decorative\/optimized\/[a-z0-9._-]+/gi) || []
);
for (const reference of decorativeReferences) {
  assertFile(reference, 'js/site-decorative-field.min.js');
}

const manifest = JSON.parse(fs.readFileSync(path.join(distRoot, 'manifest.json'), 'utf8'));
for (const icon of manifest.icons || []) {
  const localPath = localPathFromReference(icon.src, 'manifest.json');
  if (localPath) assertFile(localPath, 'manifest.json');
}

const serviceWorker = fs.readFileSync(path.join(distRoot, 'service-worker.js'), 'utf8');
const precacheBlock = serviceWorker.match(/const ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\];/);
if (!precacheBlock) {
  fail('Service-worker precache list is missing.');
} else {
  const precacheReferences = [...precacheBlock[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  let precacheBytes = 0;
  for (const reference of precacheReferences) {
    const localPath = localPathFromReference(reference, 'service-worker.js');
    if (localPath && assertFile(localPath, 'service-worker.js')) {
      precacheBytes += fs.statSync(path.join(distRoot, localPath)).size;
    }
  }
  if (precacheBytes > 500000) {
    fail(`Service-worker precache is ${precacheBytes} bytes; budget is 500000 bytes.`);
  }
}

const budgets = [
  ['assets/video/sora.mp4', 6000000],
  ['assets/images/TaiyZun-Sword-logo-2026-ui-384.png', 60000],
  ['assets/images/TaiyZun-Sword-logo-2026-social.png', 250000],
  ['assets/images/TaiyZun-Sword-logo-2026-social-square.png', 250000]
];
for (const [file, maximumBytes] of budgets) {
  const size = fs.statSync(path.join(distRoot, file)).size;
  if (size > maximumBytes) {
    fail(`${file} is ${size} bytes; budget is ${maximumBytes} bytes.`);
  }
}

if (errors.length) {
  console.error('Built-output verification failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Built-output verification passed: ${requiredFiles.length} required files and ${checkedReferences} local references checked.`);
