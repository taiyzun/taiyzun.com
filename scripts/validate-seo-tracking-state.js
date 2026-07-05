#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const pages = [
  { file: 'index.html', route: '/', canonical: 'https://taiyzun.com/', requiresJsonLd: true },
  { file: 'journey.html', route: '/journey', canonical: 'https://taiyzun.com/journey', requiresJsonLd: true },
  { file: 'creations.html', route: '/creations', canonical: 'https://taiyzun.com/creations', requiresJsonLd: true },
  { file: 'odyssey.html', route: '/odyssey', canonical: 'https://taiyzun.com/odyssey', requiresJsonLd: true },
  { file: 'connect.html', route: '/connect', canonical: 'https://taiyzun.com/connect', requiresJsonLd: true },
  { file: '404.html', route: '/404.html', canonical: 'https://taiyzun.com/404.html', requiresJsonLd: false },
  { file: '500.html', route: '/500.html', canonical: 'https://taiyzun.com/500.html', requiresJsonLd: false }
];

const blockedTrackingPatterns = [
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /www\.googleadservices\.com/i,
  /connect\.facebook\.net/i,
  /facebook\.com\/tr/i,
  /\bfbq\s*\(/i,
  /\bgtag\s*\(/i,
  /\bdataLayer\b/i
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countMatches(content, regex) {
  return (content.match(regex) || []).length;
}

function getTagAttribute(content, selectorRegex, attribute) {
  const match = content.match(selectorRegex);
  if (!match) return '';
  const attrMatch = match[0].match(new RegExp(`${attribute}=["']([^"']+)["']`, 'i'));
  return attrMatch ? attrMatch[1] : '';
}

function extractJsonLd(content) {
  const blocks = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(content))) {
    blocks.push(match[1].trim());
  }

  return blocks;
}

function validatePage(page) {
  const filePath = path.join(projectRoot, page.file);
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  try {
    assert(countMatches(content, /<title\b/gi) === 1, 'must have exactly 1 title.');
    assert(countMatches(content, /<link[^>]+rel=["']canonical["']/gi) === 1, 'must have exactly 1 canonical link.');
    assert(countMatches(content, /<h1\b/gi) === 1, 'must have exactly 1 h1.');

    const canonical = getTagAttribute(content, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'href');
    assert(canonical === page.canonical, `canonical must be ${page.canonical}, found ${canonical || 'missing'}.`);

    const description = getTagAttribute(content, /<meta[^>]+name=["']description["'][^>]*>/i, 'content');
    assert(description.length >= 50 && description.length <= 220, `description length should be 50-220 chars, found ${description.length}.`);

    const ogTitle = getTagAttribute(content, /<meta[^>]+property=["']og:title["'][^>]*>/i, 'content');
    const ogDescription = getTagAttribute(content, /<meta[^>]+property=["']og:description["'][^>]*>/i, 'content');
    const ogImage = getTagAttribute(content, /<meta[^>]+property=["']og:image["'][^>]*>/i, 'content');
    assert(Boolean(ogTitle), 'must have og:title.');
    assert(Boolean(ogDescription), 'must have og:description.');
    assert(/^https:\/\/taiyzun\.com\//.test(ogImage), `og:image must be absolute taiyzun.com URL, found ${ogImage || 'missing'}.`);

    const csp = getTagAttribute(content, /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/i, 'content');
    if (csp) {
      assert(!/googletagmanager|google-analytics|googleadservices|connect\.facebook|facebook\.com\/tr/i.test(csp), 'CSP must not allow inactive Google/Meta tracking domains.');
    }

    for (const pattern of blockedTrackingPatterns) {
      assert(!pattern.test(content), `inactive tracking pattern present: ${pattern}`);
    }

    const jsonLdBlocks = extractJsonLd(content);
    if (page.requiresJsonLd) {
      assert(jsonLdBlocks.length >= 1, 'must include JSON-LD.');
    }

    jsonLdBlocks.forEach((block, index) => {
      const parsed = JSON.parse(block);
      const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
      assert(graph.some((entry) => String(entry['@context'] || parsed['@context'] || '').includes('schema.org')), `JSON-LD block ${index + 1} must use schema.org context.`);
    });
  } catch (error) {
    errors.push(error.message);
  }

  return { page, errors };
}

const results = pages.map(validatePage);
const failures = results.filter((result) => result.errors.length);

results.forEach((result) => {
  if (result.errors.length) {
    console.error(`FAIL ${result.page.file}`);
    result.errors.forEach((error) => console.error(`  - ${error}`));
  } else {
    console.log(`PASS ${result.page.file}`);
  }
});

if (failures.length) {
  console.error(`\nSEO/tracking validation failed for ${failures.length} page(s).`);
  process.exit(1);
}

console.log('\nSEO/tracking validation passed. Google/Meta trackers remain inactive.');
