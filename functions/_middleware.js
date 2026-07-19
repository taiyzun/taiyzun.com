const PAGES_HOST = 'taiyzun-com.pages.dev';
const PUBLIC_HOST = 'taiyzun.com';
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  'Strict-Transport-Security': 'max-age=31536000',
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://assets.taiyzun.com https://i.ytimg.com; media-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com; connect-src 'self' blob: https://assets.taiyzun.com https://cloudflareinsights.com"
};

function isPagesHost(request) {
  const hostname = new URL(request.url).hostname;
  return hostname === PAGES_HOST || hostname.endsWith(`.${PAGES_HOST}`);
}

function isRetiredPublicFile(request) {
  return new URL(request.url).pathname === '/CNAME';
}

function withSecurityHeaders(response, noindex = false) {
  const headers = new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([name, value]) => headers.set(name, value));
  if (noindex) headers.set('X-Robots-Tag', 'noindex');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function onRequest(context) {
  const { request } = context;
  const requestUrl = new URL(request.url);

  if (requestUrl.hostname === `www.${PUBLIC_HOST}`) {
    requestUrl.hostname = PUBLIC_HOST;
    requestUrl.protocol = 'https:';
    return new Response(null, {
      status: 308,
      headers: {
        Location: requestUrl.toString(),
        ...SECURITY_HEADERS
      }
    });
  }

  if (isRetiredPublicFile(request)) {
    const headers = new Headers({
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex'
    });

    return withSecurityHeaders(new Response('Not found\n', { status: 404, headers }), true);
  }

  const response = await context.next();

  return withSecurityHeaders(response, isPagesHost(request));
}
