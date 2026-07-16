#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const facebookAppId = '3964117170385062';
const openGraphImage = 'https://taiyzun.com/assets/images/TaiyZun-Sword-logo-2026-social-square.png';
const twitterImage = 'https://taiyzun.com/assets/images/TaiyZun-Sword-logo-2026-social.png';
const pages = [
  { file: 'index.html', route: '/', canonical: 'https://taiyzun.com/', requiresJsonLd: true },
  { file: 'journey.html', route: '/journey', canonical: 'https://taiyzun.com/journey', requiresJsonLd: true },
  { file: 'creations.html', route: '/creations', canonical: 'https://taiyzun.com/creations', requiresJsonLd: true },
  { file: 'odyssey.html', route: '/odyssey', canonical: 'https://taiyzun.com/odyssey', requiresJsonLd: true },
  { file: 'connect.html', route: '/connect', canonical: 'https://taiyzun.com/connect', requiresJsonLd: true },
  { file: '404.html', route: '/404', canonical: 'https://taiyzun.com/404', requiresJsonLd: false },
  { file: '500.html', route: '/500', canonical: 'https://taiyzun.com/500', requiresJsonLd: false }
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
    const fbAppId = getTagAttribute(content, /<meta[^>]+property=["']fb:app_id["'][^>]*>/i, 'content');
    const twitterCardImage = getTagAttribute(content, /<meta[^>]+name=["']twitter:image["'][^>]*>/i, 'content');
    assert(Boolean(ogTitle), 'must have og:title.');
    assert(Boolean(ogDescription), 'must have og:description.');
    assert(ogImage === openGraphImage, `og:image must be ${openGraphImage}, found ${ogImage || 'missing'}.`);
    assert(twitterCardImage === twitterImage, `twitter:image must be ${twitterImage}, found ${twitterCardImage || 'missing'}.`);
    assert(fbAppId === facebookAppId, `fb:app_id must be ${facebookAppId}, found ${fbAppId || 'missing'}.`);

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

    const parsedJsonLd = jsonLdBlocks.map((block, index) => {
      const parsed = JSON.parse(block);
      const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
      assert(graph.some((entry) => String(entry['@context'] || parsed['@context'] || '').includes('schema.org')), `JSON-LD block ${index + 1} must use schema.org context.`);
      return parsed;
    });

    if (page.file === 'index.html') {
      const graph = parsedJsonLd.flatMap((block) => Array.isArray(block['@graph']) ? block['@graph'] : [block]);
      const byId = new Map(graph.filter((entry) => entry['@id']).map((entry) => [entry['@id'], entry]));
      const profile = byId.get('https://taiyzun.com/#profile');
      const person = byId.get('https://taiyzun.com/#person');
      const website = byId.get('https://taiyzun.com/#website');

      assert(profile && profile['@type'] === 'ProfilePage', 'home graph must include the stable ProfilePage entity.');
      assert(person && person['@type'] === 'Person', 'home graph must include the stable Person entity.');
      assert(website && website['@type'] === 'WebSite', 'home graph must include the stable WebSite entity.');
      assert(profile.mainEntity && profile.mainEntity['@id'] === person['@id'], 'ProfilePage mainEntity must reference the Person.');
      assert(person.mainEntityOfPage && person.mainEntityOfPage['@id'] === profile['@id'], 'Person must reference the ProfilePage.');
      assert(profile.isPartOf && profile.isPartOf['@id'] === website['@id'], 'ProfilePage must reference the WebSite.');
      assert(Array.isArray(person.sameAs) && person.sameAs.length >= 6, 'Person should retain authoritative social profile links.');
      assert(
        profile.primaryImageOfPage &&
          profile.primaryImageOfPage.url === openGraphImage &&
          profile.primaryImageOfPage.width === 1200 &&
          profile.primaryImageOfPage.height === 1200,
        'ProfilePage primary image must describe the approved square preview.'
      );
    }
  } catch (error) {
    errors.push(error.message);
  }

  return { page, errors };
}

function validateDiscoveryFiles() {
  const errors = [];
  try {
    const robots = fs.readFileSync(path.join(projectRoot, 'robots.txt'), 'utf8');
    const sitemap = fs.readFileSync(path.join(projectRoot, 'sitemap.xml'), 'utf8');
    const expectedLocations = pages
      .filter((page) => !['404.html', '500.html'].includes(page.file))
      .map((page) => page.canonical);
    const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const lastModifiedDates = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);

    assert(robots.includes('User-agent: *'), 'robots.txt must define the general crawler group.');
    assert(robots.includes('Allow: /'), 'robots.txt must allow normal search crawling.');
    assert(robots.includes('Sitemap: https://taiyzun.com/sitemap.xml'), 'robots.txt must reference the canonical sitemap.');
    assert(robots.includes('# Content-signal: search=yes, ai-input=yes, ai-train=no, use=reference'), 'robots.txt content policy note changed.');
    assert(!robots.split('\n').some((line) => /^Content-signal:/i.test(line.trim())), 'robots.txt must not expose the non-standard Content-signal directive.');
    assert(/User-agent: Google-Extended\s+Disallow: \//.test(robots), 'Google-Extended training access must remain blocked.');
    assert(/User-agent: GPTBot\s+Disallow: \//.test(robots), 'GPTBot training access must remain blocked.');
    assert(
      expectedLocations.every((location) => sitemapLocations.includes(location)),
      'sitemap.xml is missing one or more canonical pages.'
    );
    assert(
      sitemapLocations.filter((location) => expectedLocations.includes(location)).length === expectedLocations.length,
      'sitemap.xml has duplicate or missing canonical page entries.'
    );
    assert(lastModifiedDates.length === expectedLocations.length, 'sitemap.xml must have one lastmod per canonical page.');
    assert(lastModifiedDates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)), 'sitemap lastmod values must use YYYY-MM-DD.');
    assert(!sitemap.includes('https://www.taiyzun.com'), 'sitemap.xml must not mix the www host into canonical URLs.');
  } catch (error) {
    errors.push(error.message);
  }

  return { page: { file: 'robots.txt + sitemap.xml' }, errors };
}

const results = [...pages.map(validatePage), validateDiscoveryFiles()];
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
