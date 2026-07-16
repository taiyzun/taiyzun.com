#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.join(projectRoot, 'dist');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4176);

const routeFiles = new Map([
  ['/', 'index.html'],
  ['/index', 'index.html'],
  ['/journey', 'journey.html'],
  ['/creations', 'creations.html'],
  ['/odyssey', 'odyssey.html'],
  ['/connect', 'connect.html'],
  ['/404', '404.html'],
  ['/500', '500.html']
]);
const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.xml', 'application/xml; charset=utf-8']
]);

if (!fs.existsSync(distRoot)) {
  throw new Error('dist/ is missing. Run npm run build before starting the preview server.');
}

function safeFileForPathname(pathname) {
  if (routeFiles.has(pathname)) return routeFiles.get(pathname);
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (_) {
    return null;
  }
  const relative = path.posix.normalize(decoded.replace(/^\/+/, ''));
  if (!relative || relative.startsWith('../')) return null;
  return relative;
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
  const relativeFile = safeFileForPathname(requestUrl.pathname);
  let target = relativeFile ? path.join(distRoot, relativeFile) : '';
  let status = 200;

  if (!target.startsWith(distRoot) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    target = path.join(distRoot, '404.html');
    status = 404;
  }

  const extension = path.extname(target).toLowerCase();
  const body = fs.readFileSync(target);
  response.writeHead(status, {
    'Content-Type': mimeTypes.get(extension) || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  if (request.method === 'HEAD') {
    response.end();
  } else {
    response.end(body);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Taiyzun dist preview listening on http://127.0.0.1:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
