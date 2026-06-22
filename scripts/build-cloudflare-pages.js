#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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
  'assets/space-gallery-share-index.json',
  'assets/easter-eggs/taiyzun-atme-3d-loader.avif',
  'assets/easter-eggs/taiyzun-atme-3d-loader.webp',
  'assets/easter-eggs/taiyzun-atme-3d-loader.png',
  'assets/Art/art_00001.jpg',
  'assets/Art/art_00002.jpg',
  'assets/Art/art_00003.jpg',
  'assets/Art/cd_designs_hypnotic_waveforms_front_n_back.jpg',
  'assets/Art/flyers_and_covers_00001.jpg',
  'assets/Art/misc_design_splash.jpg',
  'assets/Art/psy_art_brain_space.jpg',
  'assets/Art/psy_art_euphoria.jpg',
  'js/ambient-video.min.js',
  'js/animation-controller.min.js',
  'js/harmonic-interactions.min.js',
  'js/mobile-menu.min.js',
  'js/odyssey-portraits.js',
  'js/site-mobile-lite.min.js',
  'js/site-decorative-field.min.js',
  'js/taiyzun-3d-field.min.js',
  'js/theme-engine.min.js',
  'js/themes-config.min.js',
  'js/video-carousel.min.js',
  'js/zepto-mail-integration.min.js'
];

const publicDirectories = [
  'assets/Portraits/odyssey-poetic',
  'assets/Portraits/optimized',
  'assets/decorative/optimized',
  'assets/fonts',
  'assets/icons',
  'assets/images',
  'assets/video',
  'css'
];
const ignoredNames = new Set(['.DS_Store']);
const duplicateCopyPattern = /^(.*) \d+(\.[^.]+)$/;

const vendorAssetFiles = [
  {
    source: 'node_modules/gsap/dist/gsap.min.js',
    destination: 'js/vendor/gsap.min.js'
  },
  {
    source: 'node_modules/gsap/dist/ScrollTrigger.min.js',
    destination: 'js/vendor/ScrollTrigger.min.js'
  },
  {
    source: 'node_modules/three/build/three.core.min.js',
    destination: 'js/vendor/three.core.min.js'
  },
  {
    source: 'node_modules/three/build/three.module.min.js',
    destination: 'js/vendor/three.module.min.js'
  }
];

function shouldCopy(source) {
  const name = path.basename(source);
  if (ignoredNames.has(name)) return false;

  const duplicateMatch = name.match(duplicateCopyPattern);
  if (!duplicateMatch) return true;

  const canonicalPath = path.join(path.dirname(source), `${duplicateMatch[1]}${duplicateMatch[2]}`);
  if (!fs.existsSync(canonicalPath)) return true;

  const sourceStats = fs.statSync(source);
  const canonicalStats = fs.statSync(canonicalPath);
  if (!sourceStats.isFile() || !canonicalStats.isFile() || sourceStats.size !== canonicalStats.size) {
    return true;
  }

  return !fs.readFileSync(source).equals(fs.readFileSync(canonicalPath));
}

function copyPath(relativePath) {
  const source = path.join(rootDir, relativePath);
  const destination = path.join(outputDir, relativePath);

  if (!fs.existsSync(source)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    filter: shouldCopy
  });

  return true;
}

execFileSync(process.execPath, [path.join(rootDir, 'scripts', 'build-space-gallery-share-index.js')], {
  stdio: 'inherit'
});

fs.rmSync(outputDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 120 });
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

function syncPublicDirectory(relativePath) {
  const source = path.join(rootDir, relativePath);
  const destination = path.join(outputDir, relativePath);

  if (!fs.existsSync(source)) {
    return;
  }

  fs.rmSync(destination, { recursive: true, force: true, maxRetries: 6, retryDelay: 120 });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

syncPublicDirectory('assets/decorative/optimized');
syncPublicDirectory('assets/icons');

for (const assetFile of publicAssetFiles) {
  if (copyPath(assetFile)) {
    copied.push(assetFile);
  }
}

for (const vendorFile of vendorAssetFiles) {
  const source = path.join(rootDir, vendorFile.source);
  const destination = path.join(outputDir, vendorFile.destination);
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    copied.push(vendorFile.destination);
  }
}

console.log(`Cloudflare Pages build ready: copied ${copied.length} public entries to dist/`);
