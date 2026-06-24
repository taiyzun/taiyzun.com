const PAGES_HOST_SUFFIX = '.taiyzun-com.pages.dev';

function isPagesHost(request) {
  return new URL(request.url).hostname.endsWith(PAGES_HOST_SUFFIX);
}

function isRetiredPublicFile(request) {
  return new URL(request.url).pathname === '/CNAME';
}

export async function onRequest(context) {
  const { request } = context;

  if (isRetiredPublicFile(request)) {
    const headers = new Headers({
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex'
    });

    return new Response('Not found\n', { status: 404, headers });
  }

  const response = await context.next();

  if (!isPagesHost(request)) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
