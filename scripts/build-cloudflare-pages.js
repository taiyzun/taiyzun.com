#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'dist');

const publicRootFiles = new Set([
  'CNAME',
  'favicon.ico',
  'manifest.json',
  'robots.txt',
  'service-worker.js',
  'sitemap.xml',
  '_headers',
  '_redirects'
]);

const publicHtmlFiles = new Set([
  'index.html',
  'journey.html',
  'odyssey.html',
  'creations.html',
  'connect.html',
  '404.html',
  '500.html'
]);

const publicAssetFiles = [
  'assets/favicon.svg',
  'assets/space-gallery-manifest.json',
  'js/ambient-video.min.js',
  'js/animation-controller.min.js',
  'js/facebook-pixel.min.js',
  'js/harmonic-interactions.min.js',
  'js/mobile-menu.min.js',
  'js/odyssey-portraits.js',
  'js/site-mobile-lite.min.js',
  'js/site-decorative-field.min.js',
  'js/theme-engine.min.js',
  'js/themes-config.min.js',
  'js/webgl-manager.min.js',
  'js/zepto-mail-integration.min.js'
];

const publicDirectories = [
  'assets/Art',
  'assets/Portfolio',
  'assets/Portraits/odyssey-poetic',
  'assets/Portraits/optimized',
  'assets/Space Gallery',
  'assets/decorative/optimized',
  'assets/icons',
  'assets/images',
  'assets/video',
  'css'
];
const ignoredNames = new Set(['.DS_Store']);

function shouldCopy(source) {
  const name = path.basename(source);
  return !ignoredNames.has(name);
}

function copyPath(relativePath) {
  const source = path.join(rootDir, relativePath);
  const destination = path.join(outputDir, relativePath);

  if (!fs.existsSync(source)) {
    return false;
  }

  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    filter: shouldCopy
  });

  return true;
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const copied = [];

for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
  const isPublicFile =
    entry.isFile() &&
    (publicHtmlFiles.has(entry.name) ||
      entry.name.endsWith('.css') ||
      publicRootFiles.has(entry.name));

  if (isPublicFile && copyPath(entry.name)) {
    copied.push(entry.name);
  }
}

for (const directory of publicDirectories) {
  if (copyPath(directory)) {
    copied.push(`${directory}/`);
  }
}

for (const assetFile of publicAssetFiles) {
  if (copyPath(assetFile)) {
    copied.push(assetFile);
  }
}

console.log(`Cloudflare Pages build ready: copied ${copied.length} public entries to dist/`);
