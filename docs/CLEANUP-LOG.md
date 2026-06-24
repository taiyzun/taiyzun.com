# Cleanup Log

## 2026-06-24

- Archived old Tai root-level implementation, phase, SEO, mail, and session notes under `docs/archive/legacy-site-work-2026-06/`.
- Removed Tai `CNAME` from tracked source and from the Cloudflare Pages build allow-list.
- Removed Tai stale `.htaccess` and `style.css.backup`.
- Added noindex headers for Tai Cloudflare Pages default and deployment hosts.
- Cleaned Taj root by removing public `README.md`.
- Added a real Taj `404.html` page.
- Added noindex headers for Taj Cloudflare Pages default and deployment hosts.
- Removed inactive Cloudflare zone `shahpurwala.net`; this did not change any registrar domain registration.
- Removed inactive/pending Cloudflare zone `tajmahalmovies.com`; this did not change any registrar domain registration or the external live `tajmahalmovie.com` site.

## Rollback

Use Git to restore any file from the cleanup commit, then rebuild and redeploy the affected site.
