#!/usr/bin/env node

const apex = (process.env.SITE_URL || 'https://taiyzun.com').replace(/\/$/, '');
const pagesHost = process.env.PAGES_URL || 'https://taiyzun-com.pages.dev';
const expectedFacebookAppId = '3964117170385062';
const expectedOpenGraphImage = `${apex}/assets/images/TaiyZun-Sword-logo-2026-social-square.png`;
const expectedTwitterImage = `${apex}/assets/images/TaiyZun-Sword-logo-2026-social.png`;
const routes = [
  ['/', `${apex}/`],
  ['/journey', `${apex}/journey`],
  ['/creations', `${apex}/creations`],
  ['/odyssey', `${apex}/odyssey`],
  ['/connect', `${apex}/connect`]
];
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function attributes(tag) {
  const values = new Map();
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*["']([^"']*)["']/g)) {
    values.set(match[1].toLowerCase(), match[2]);
  }
  return values;
}

function findTag(html, tagName, predicate) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
  for (const tag of tags) {
    const attrs = attributes(tag);
    if (predicate(attrs)) return attrs;
  }
  return new Map();
}

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'user-agent': 'Taiyzun production smoke/1.0',
          ...(options.headers || {})
        },
        signal: AbortSignal.timeout(20000)
      });
      const isCloudflareResponse =
        Boolean(response.headers.get('cf-ray')) ||
        (response.headers.get('server') || '').toLowerCase().includes('cloudflare');
      const isTransientEdgeStatus = [403, 408, 429].includes(response.status);
      const shouldRetry = response.status >= 500 || (isCloudflareResponse && isTransientEdgeStatus);

      if (!shouldRetry || attempt === 3) return response;
      lastError = new Error(`${url} returned ${response.status}`);
      await response.body?.cancel();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
  }
  throw lastError;
}

for (const [route, canonicalUrl] of routes) {
  const failureCountBeforeRoute = failures.length;
  const response = await fetchWithRetry(`${apex}${route}`);
  const html = await response.text();
  assert(response.status === 200, `${route} returned ${response.status}`);
  assert((response.headers.get('content-type') || '').includes('text/html'), `${route} has the wrong content type`);
  assert((response.headers.get('strict-transport-security') || '').includes('max-age='), `${route} is missing HSTS`);
  assert((response.headers.get('x-content-type-options') || '').toLowerCase() === 'nosniff', `${route} is missing nosniff`);
  assert((response.headers.get('x-frame-options') || '').toUpperCase() === 'DENY', `${route} is missing clickjacking protection`);
  assert(Boolean(response.headers.get('permissions-policy')), `${route} is missing Permissions-Policy`);
  assert(Boolean(response.headers.get('content-security-policy')), `${route} is missing enforced CSP`);

  const canonical = findTag(html, 'link', (attrs) => attrs.get('rel') === 'canonical').get('href');
  const fbAppId = findTag(html, 'meta', (attrs) => attrs.get('property') === 'fb:app_id').get('content');
  const ogImage = findTag(html, 'meta', (attrs) => attrs.get('property') === 'og:image').get('content');
  const twitterImage = findTag(html, 'meta', (attrs) => attrs.get('name') === 'twitter:image').get('content');
  assert(canonical === canonicalUrl, `${route} canonical is ${canonical || 'missing'}`);
  assert(fbAppId === expectedFacebookAppId, `${route} fb:app_id is missing or incorrect`);
  assert(ogImage === expectedOpenGraphImage, `${route} Open Graph image is incorrect`);
  assert(twitterImage === expectedTwitterImage, `${route} Twitter image is incorrect`);
  assert(!/<(?:img|source)\b[^>]*(?:src|srcset)=["'][^"']*TaiyZun-Sword-logo-2026\.png/i.test(html), `${route} loads the full canonical logo`);

  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert(jsonLdBlocks.length > 0, `${route} is missing JSON-LD`);
  for (const [, block] of jsonLdBlocks) {
    try {
      JSON.parse(block);
    } catch (error) {
      failures.push(`${route} has invalid JSON-LD: ${error.message}`);
    }
  }
  if (failures.length === failureCountBeforeRoute) console.log(`PASS ${route}`);
}

for (const imageUrl of [expectedOpenGraphImage, expectedTwitterImage]) {
  const response = await fetchWithRetry(imageUrl, { method: 'HEAD' });
  assert(response.status === 200, `${imageUrl} returned ${response.status}`);
  assert((response.headers.get('content-type') || '').startsWith('image/png'), `${imageUrl} is not served as PNG`);
}

const sitemapResponse = await fetchWithRetry(`${apex}/sitemap.xml`);
const sitemap = await sitemapResponse.text();
assert(sitemapResponse.status === 200, `sitemap.xml returned ${sitemapResponse.status}`);
for (const [, canonicalUrl] of routes) {
  assert(sitemap.includes(`<loc>${canonicalUrl}</loc>`), `sitemap.xml is missing ${canonicalUrl}`);
}

const robotsResponse = await fetchWithRetry(`${apex}/robots.txt`);
const robots = await robotsResponse.text();
assert(robotsResponse.status === 200, `robots.txt returned ${robotsResponse.status}`);
assert(robots.includes(`Sitemap: ${apex}/sitemap.xml`), 'robots.txt is missing the canonical sitemap URL');
assert(robots.includes('# Content-signal: search=yes, ai-input=yes, ai-train=no, use=reference'), 'robots.txt content policy note changed');
assert(!robots.split('\n').some((line) => /^Content-signal:/i.test(line.trim())), 'robots.txt exposes a non-standard live Content-signal directive');

const serviceWorkerResponse = await fetchWithRetry(`${apex}/service-worker.js`);
assert(serviceWorkerResponse.status === 200, `service-worker.js returned ${serviceWorkerResponse.status}`);
assert((serviceWorkerResponse.headers.get('cache-control') || '').includes('no-store'), 'service-worker.js must not be stored');

const wwwResponse = await fetchWithRetry('https://www.taiyzun.com/journey?production-smoke=1', { redirect: 'manual' });
assert([301, 308].includes(wwwResponse.status), `www redirect returned ${wwwResponse.status}`);
assert(
  wwwResponse.headers.get('location') === `${apex}/journey?production-smoke=1`,
  `www redirect did not preserve path and query: ${wwwResponse.headers.get('location') || 'missing'}`
);

const pagesResponse = await fetchWithRetry(`${pagesHost}/`, { redirect: 'manual' });
assert(pagesResponse.status === 200, `Pages preview returned ${pagesResponse.status}`);
assert((pagesResponse.headers.get('x-robots-tag') || '').toLowerCase().includes('noindex'), 'Pages preview is indexable');

const creationId = '0001-time-akbar-two-tailors-meet-in-monochrome-with-grce-where-patterned-cloth-tells-the-story-c0231be8';
const creationResponse = await fetchWithRetry(`${apex}/creations/image/${creationId}`);
const creationHtml = await creationResponse.text();
assert(creationResponse.status === 200, `Dynamic Creation share returned ${creationResponse.status}`);
assert(creationHtml.includes('property="og:image"'), 'Dynamic Creation share is missing og:image');
assert(creationHtml.includes('rel="canonical"'), 'Dynamic Creation share is missing a canonical URL');

if (failures.length) {
  console.error('\nProduction smoke failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`\nProduction smoke passed: ${routes.length} pages, social assets, sitemap, robots, redirects, preview noindex and dynamic sharing.`);
