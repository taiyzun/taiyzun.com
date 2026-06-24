# SEO

Last verified: 2026-06-24.

## taiyzun.com

- Canonical host: `https://taiyzun.com/`
- `www.taiyzun.com` serves `200` with apex canonical.
- Sitemap and robots are live.
- Cloudflare Pages default hosts should emit `X-Robots-Tag: noindex`.

## taj-mahal-movie.com

- Canonical host: `https://www.taj-mahal-movie.com/`
- Apex redirects to `www`.
- Sitemap and robots are live.
- A custom `404.html` is present so unknown routes should not index as homepage duplicates.
- Cloudflare Pages default hosts should emit `X-Robots-Tag: noindex`.

## Search surface rule

Only the active canonical domains should be submitted or promoted. Pages default domains, preview deployment URLs, R2 asset hosts, and old domains should not be treated as primary search surfaces.
