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

const publicDirectories = ['assets', 'css', 'js'];
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

console.log(`Cloudflare Pages build ready: copied ${copied.length} public entries to dist/`);
