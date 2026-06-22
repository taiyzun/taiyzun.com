const INDEX_PATH = '/assets/space-gallery-share-index.json';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'public, max-age=300, must-revalidate'
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

function renderSharePage({ item, canonicalUrl, galleryUrl, siteUrl }) {
  const title = `${item.title || 'Taiyzun Creation'} | Taiyzun Creations`;
  const description = `${item.displayCategory || item.category || 'Creations'} from the Taiyzun creations archive.`;
  const image = item.full || item.thumb || absoluteUrl(siteUrl, '/assets/images/taiyzun-t1000-profile-og-20260530-fresh.jpg');
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeGallery = escapeHtml(galleryUrl);

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
<meta property="og:site_name" content="Taiyzun Shabbir Shahpurwala">
<meta property="og:url" content="${safeCanonical}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImage}">
<meta property="og:image:secure_url" content="${safeImage}">
<meta property="og:image:alt" content="${escapeHtml(item.title || 'Taiyzun Creation')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImage}">
<meta http-equiv="refresh" content="0;url=${safeGallery}">
<script>window.location.replace(${JSON.stringify(galleryUrl)});</script>
</head>
<body>
<main>
<h1>${safeTitle}</h1>
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
      return htmlResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Creation not found</title><meta name="robots" content="noindex"></head><body><main><h1>Creation not found</h1><p><a href="/creations">Open Creations</a></p></main></body></html>`, 404);
    }

    const requestUrl = new URL(context.request.url);
    const canonicalUrl = absoluteUrl(requestUrl.origin, `/creations/image/${encodeURIComponent(id)}`);
    const galleryUrl = absoluteUrl(requestUrl.origin, `/creations?image=${encodeURIComponent(id)}`);
    return htmlResponse(renderSharePage({ item, canonicalUrl, galleryUrl, siteUrl: requestUrl.origin }));
  } catch (error) {
    return htmlResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Creations</title><meta name="robots" content="noindex"></head><body><main><h1>Creations</h1><p><a href="/creations">Open Creations</a></p></main></body></html>`, 502);
  }
}

export const onRequestHead = onRequestGet;
