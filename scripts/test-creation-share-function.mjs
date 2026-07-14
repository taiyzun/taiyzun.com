#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const shareModuleUrl = new URL('../functions/creations/image/[id].js', import.meta.url);
const { onRequestGet } = await import(shareModuleUrl);
const publicOrigin = 'https://taiyzun.com';

function decodeHtml(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'");
}

function metaContent(html, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<meta (?:name|property)="${escapedKey}" content="([^"]*)">`));
  return match ? decodeHtml(match[1]) : '';
}

function elementText(html, tag) {
  const match = html.match(new RegExp(`<${tag}>([^<]*)<\\/${tag}>`));
  return match ? decodeHtml(match[1]) : '';
}

function contextFor({ requestOrigin, id, item }) {
  return {
    request: new Request(`${requestOrigin}/creations/image/${encodeURIComponent(id)}`),
    params: { id },
    env: {
      ASSETS: {
        async fetch(request) {
          const requestUrl = request instanceof Request ? request.url : String(request);
          assert.equal(new URL(requestUrl).pathname, '/assets/space-gallery-share-index.json');
          return new Response(JSON.stringify({ items: { [id]: item } }), {
            headers: { 'content-type': 'application/json' }
          });
        }
      }
    }
  };
}

function validateSitemap() {
  const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
  const lastModifiedDates = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  const imageLocations = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((match) => match[1]);

  assert.equal(lastModifiedDates.length, 5, 'sitemap should contain one lastmod for each canonical page');
  assert(lastModifiedDates.every((date) => date === '2026-07-14'), 'all canonical pages should use the current accurate lastmod');
  assert.equal(imageLocations.length, 36, 'existing image:loc entries must be preserved');
  assert(!sitemap.includes('<changefreq>'), 'ignored changefreq fields should be absent');
  assert(!sitemap.includes('<priority>'), 'ignored priority fields should be absent');
  assert(!sitemap.includes('<image:caption>'), 'deprecated image captions should be absent');
}

async function validateLongTitleAndCanonicalOrigin() {
  const id = 'long-title-example';
  const fullTitle = '0001 ~ TimE Akbar and the Two Tailors Meet in Monochrome with Grace Where Patterned Cloth Tells the Complete Story';
  const item = {
    title: fullTitle,
    category: 'Gr@cE ~ Campaign Works',
    displayCategory: 'Gr@cE ~ Campaign Works',
    full: 'https://assets.taiyzun.com/space-gallery/images/example/long-title-example.webp'
  };
  const response = await onRequestGet(contextFor({ requestOrigin: 'https://www.taiyzun.com', id, item }));
  const html = await response.text();
  const renderedTitle = elementText(html, 'title');
  const titleBase = renderedTitle.replace(/… \| Taiyzun Creations$/, '');

  assert.equal(response.status, 200);
  assert.equal(renderedTitle.length <= 70, true, 'share title must be capped at 70 characters');
  assert(renderedTitle.endsWith('… | Taiyzun Creations'), 'truncated title should retain the branded suffix');
  assert(fullTitle.startsWith(titleBase), 'truncated share title should retain the original title prefix');
  assert.equal(fullTitle[titleBase.length], ' ', 'share title should stop at a word boundary');
  assert.equal(elementText(html, 'h1'), fullTitle, 'visible caption should retain the full title');
  assert.equal(metaContent(html, 'og:image:alt'), fullTitle, 'Open Graph image alt should retain the full title');
  assert.equal(metaContent(html, 'twitter:image:alt'), fullTitle, 'Twitter image alt should retain the full title');
  assert.equal(metaContent(html, 'og:url'), `${publicOrigin}/creations/image/${id}`);
  assert.equal(metaContent(html, 'twitter:url'), `${publicOrigin}/creations/image/${id}`);
  assert(html.includes(`<link rel="canonical" href="${publicOrigin}/creations/image/${id}">`));
  assert(html.includes(`${publicOrigin}/creations?image=${id}&amp;cat=Gr%40cE+%7E+Campaign+Works`));
  assert(!html.includes('https://www.taiyzun.com'), 'request host must not leak into public metadata or gallery links');
  assert.equal(metaContent(html, 'og:image:type'), 'image/webp');
  assert.equal(metaContent(html, 'og:image:width'), '', 'unknown image width must not be claimed');
  assert.equal(metaContent(html, 'og:image:height'), '', 'unknown image height must not be claimed');
}

async function validateAccurateImageDimensions() {
  const id = 'known-dimensions-example';
  const item = {
    title: 'Known Dimensions Example',
    category: 'Gallery',
    full: 'https://assets.taiyzun.com/space-gallery/images/example/known-dimensions-example.png',
    width: 1600,
    height: 900
  };
  const response = await onRequestGet(contextFor({ requestOrigin: 'https://preview.pages.dev', id, item }));
  const html = await response.text();

  assert.equal(metaContent(html, 'og:url'), `${publicOrigin}/creations/image/${id}`);
  assert.equal(metaContent(html, 'twitter:url'), `${publicOrigin}/creations/image/${id}`);
  assert.equal(metaContent(html, 'og:image:type'), 'image/png');
  assert.equal(metaContent(html, 'og:image:width'), '1600');
  assert.equal(metaContent(html, 'og:image:height'), '900');
  assert(!html.includes('https://preview.pages.dev'), 'preview host must not leak into public metadata or gallery links');
}

validateSitemap();
await validateLongTitleAndCanonicalOrigin();
await validateAccurateImageDimensions();

console.log('Creation share metadata and sitemap validation passed.');
