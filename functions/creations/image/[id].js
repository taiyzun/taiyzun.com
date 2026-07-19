const INDEX_PATH = '/assets/space-gallery-share-index.json';
const PUBLIC_ORIGIN = 'https://taiyzun.com';
const SHARE_TITLE_SUFFIX = ' | Taiyzun Creations';
const MAX_SHARE_TITLE_LENGTH = 70;
const FALLBACK_IMAGE_PATH = '/assets/images/TaiyZun-Sword-logo-2026-social-square.png';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex, nofollow, noarchive, noimageindex'
};

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cleanId(value) {
  return String(value || '')
    .trim()
    .replace(/\.html?$/i, '')
    .replace(/[^a-zA-Z0-9._~-]/g, '');
}

function absoluteUrl(origin, path) {
  return new URL(path, origin).toString();
}

function truncateAtWordBoundary(value, maxLength) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;

  const prefix = normalized.slice(0, Math.max(1, maxLength - 1));
  const boundary = prefix.lastIndexOf(' ');
  const truncated = boundary > 0 ? prefix.slice(0, boundary) : prefix;
  return `${truncated.trimEnd()}…`;
}

function shareTitle(value) {
  const baseTitle = String(value || '').trim() || 'Taiyzun Creation';
  const baseBudget = MAX_SHARE_TITLE_LENGTH - SHARE_TITLE_SUFFIX.length;
  return `${truncateAtWordBoundary(baseTitle, baseBudget)}${SHARE_TITLE_SUFFIX}`;
}

function imageContentType(value) {
  let pathname = '';
  try {
    pathname = new URL(value, PUBLIC_ORIGIN).pathname.toLowerCase();
  } catch {
    return '';
  }

  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.avif')) return 'image/avif';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  if (pathname.endsWith('.gif')) return 'image/gif';
  return '';
}

function accurateImageDimensions(item, usesFallbackImage) {
  if (usesFallbackImage) return { width: 1200, height: 1200 };

  const width = Number(item.width);
  const height = Number(item.height);
  if (
    Number.isInteger(width) && width > 0 && width <= 100000 &&
    Number.isInteger(height) && height > 0 && height <= 100000
  ) {
    return { width, height };
  }
  return null;
}

async function loadShareIndex(context) {
  const assetUrl = new URL(INDEX_PATH, context.request.url);
  const response = await context.env.ASSETS.fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Unable to read ${INDEX_PATH}: ${response.status}`);
  }
  return response.json();
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=300, must-revalidate'
    }
  });
}

function revokedResponse() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Creation unavailable</title><meta name="robots" content="noindex, nofollow, noarchive, noimageindex"></head><body><main><h1>Creation unavailable</h1><p><a href="/creations">Open Creations</a></p></main></body></html>`, {
    status: 410,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive, noimageindex'
    }
  });
}

function renderSharePage({ item, canonicalUrl, galleryUrl }) {
  const fullTitle = String(item.title || '').trim() || 'Taiyzun Creation';
  const title = shareTitle(fullTitle);
  const description = `${item.displayCategory || item.category || 'Creations'} from the Taiyzun creations archive.`;
  const usesFallbackImage = !item.full && !item.thumb;
  const image = item.full || item.thumb || absoluteUrl(PUBLIC_ORIGIN, FALLBACK_IMAGE_PATH);
  const imageType = imageContentType(image);
  const imageDimensions = accurateImageDimensions(item, usesFallbackImage);
  const safeTitle = escapeHtml(title);
  const safeFullTitle = escapeHtml(fullTitle);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeGallery = escapeHtml(galleryUrl);
  const imageTypeMeta = imageType
    ? `\n<meta property="og:image:type" content="${escapeHtml(imageType)}">`
    : '';
  const imageDimensionMeta = imageDimensions
    ? `\n<meta property="og:image:width" content="${imageDimensions.width}">\n<meta property="og:image:height" content="${imageDimensions.height}">`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<link rel="canonical" href="${safeCanonical}">
<meta name="description" content="${safeDescription}">
<meta name="robots" content="noindex, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="fb:app_id" content="3964117170385062">
<meta property="og:site_name" content="Taiyzun Shabbir Shahpurwala">
<meta property="og:url" content="${safeCanonical}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImage}">
<meta property="og:image:secure_url" content="${safeImage}">${imageTypeMeta}${imageDimensionMeta}
<meta property="og:image:alt" content="${safeFullTitle}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="${safeCanonical}">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImage}">
<meta name="twitter:image:alt" content="${safeFullTitle}">
<meta http-equiv="refresh" content="0;url=${safeGallery}">
<script>window.location.replace(${JSON.stringify(galleryUrl)});</script>
</head>
<body>
<main>
<h1>${safeFullTitle}</h1>
<p>${safeDescription}</p>
<p><a href="${safeGallery}">Open this creation</a></p>
</main>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const id = cleanId(context.params.id);
  if (!id) {
    return new Response(JSON.stringify({ ok: false, message: 'Missing image id.' }), {
      status: 400,
      headers: JSON_HEADERS
    });
  }

  try {
    const index = await loadShareIndex(context);
    const item = index.items && index.items[id];
    if (!item) {
      return revokedResponse();
    }

    const canonicalUrl = absoluteUrl(PUBLIC_ORIGIN, `/creations/image/${encodeURIComponent(id)}`);
    const galleryParams = new URLSearchParams({ image: id });
    if (item.category) galleryParams.set('cat', item.category);
    const galleryUrl = absoluteUrl(PUBLIC_ORIGIN, `/creations?${galleryParams.toString()}`);
    return htmlResponse(renderSharePage({ item, canonicalUrl, galleryUrl }));
  } catch (error) {
    return htmlResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Creations</title><meta name="robots" content="noindex"></head><body><main><h1>Creations</h1><p><a href="/creations">Open Creations</a></p></main></body></html>`, 502);
  }
}

export const onRequestHead = onRequestGet;
