# SEO Optimisation

## Current Baseline

- Last verified: 2026-07-05 03:51 IST.
- Site: `https://taiyzun.com`
- Latest verified commit: `38eced3b4b78ca12afd06d1f60a6672bf2c8de92`

## Current SEO Status

- GitHub Actions `/odyssey` SEO score: `100`.
- Live mobile `/odyssey` SEO score: `100`.
- Live mobile `/creations` SEO score: `100`.
- `robots.txt` returns `200`.
- `sitemap.xml` returns `200`.
- `robots.txt` has no unknown directives.
- Checked public HTML pages each have exactly 1 `h1`.
- Canonical URLs are present.
- Open Graph title and image metadata are present.

## Verified Live Routes

| Route | HTTP | Canonical | Open Graph | H1 Count |
| --- | ---: | --- | --- | ---: |
| `/` | 200 | `https://taiyzun.com/` | present | 1 |
| `/journey` | 200 | `https://taiyzun.com/journey` | present | 1 |
| `/creations` | 200 | `https://taiyzun.com/creations` | present | 1 |
| `/odyssey` | 200 | `https://taiyzun.com/odyssey` | present | 1 |
| `/connect` | 200 | `https://taiyzun.com/connect` | present | 1 |
| `/robots.txt` | 200 | not applicable | not applicable | not applicable |
| `/sitemap.xml` | 200 | not applicable | not applicable | not applicable |

## Robots Policy

The previous non-standard directive is preserved as a comment:

```txt
# Content-signal: search=yes, ai-train=no, use=reference
```

This keeps the policy note visible while keeping `robots.txt` valid for Lighthouse and crawler parsers.

## Current AI And Crawler Position

- Normal search indexing is allowed.
- Full AI-training and bulk ingestion bots remain disallowed where listed.
- `llms.txt` is allowed.
- Sitemap is allowed.
- Public CSS, JS, and public image asset paths are allowed for rendering.

## What Was Fixed

- `robots.txt` validation failure was resolved.
- Canonical and Open Graph metadata remain intact.
- Live route checks confirm the public pages are reachable.
- SEO Lighthouse checks are now `100` on the inspected routes.

## What Was Intentionally Not Changed

- DNS.
- Cloudflare settings.
- Hosting settings.
- Sitemap route structure.
- Public site copy.
- Gallery selection.
- AI crawler policy intent.
- Preview-host noindex policy.

## Monthly SEO Checklist

- Confirm `https://taiyzun.com/robots.txt` returns `200`.
- Confirm `https://taiyzun.com/sitemap.xml` returns `200`.
- Validate `robots.txt` for unknown directives.
- Confirm canonical URL on each public page.
- Confirm Open Graph title and image on each public page.
- Confirm exactly 1 `h1` on each public page.
- Run Lighthouse SEO for `/`, `/odyssey`, and `/creations`.
- Confirm no private docs, old backups, or local reports are publicly served.
- Confirm preview hosts remain noindex where configured.

## Closeout Status

SEO is currently healthy. No active SEO blocker remains.
