# Maintenance

## Monthly Maintenance Checklist

- Run `gh auth status` before any GitHub Actions investigation.
- Review the Tai `Lighthouse Audit` workflow result.
- Review GitHub Actions runtime warnings, especially Node runtime deprecation notices.
- Run `npm audit --omit=dev` in `/Users/tai/Documents/GitHub/taiyzun.com`.
- Run `npm run build` in `/Users/tai/Documents/GitHub/taiyzun.com`.
- Verify core Tai routes:
  - `https://taiyzun.com/`
  - `https://taiyzun.com/odyssey`
  - `https://taiyzun.com/creations`
  - `https://taiyzun.com/robots.txt`
  - `https://taiyzun.com/sitemap.xml`
- Verify core Taj routes:
  - `https://www.taj-mahal-movie.com/`
  - `https://www.taj-mahal-movie.com/robots.txt`
  - `https://www.taj-mahal-movie.com/sitemap.xml`
  - an unknown route returns `404`
- Confirm Cloudflare Pages still lists only the active site projects:
  - `taiyzun-com`
  - `taj-mahal-movie-com`
- Confirm R2 still lists only the active media buckets:
  - `taiyzun-gallery`
  - `taj-mahal-movie-media`
- Confirm no private docs, setup notes, local reports, `.env` files, `.DS_Store`, `CNAME`, or backup files are served publicly.
- Review GitHub branch protection and Dependabot status.
- Keep billing/payment changes manual and owner-approved.

## Before Publishing Changes

- Keep public site copy verified and conservative.
- Run local build checks before push.
- Confirm sitemap, robots, canonical, and social preview tags.
- Verify desktop and mobile rendering.
- Keep documentation-only changes separate from production code changes where practical.

## Remaining Optimisation Backlog

- Tai Odyssey mobile Lighthouse Performance: `52`.
- Tai Odyssey Lighthouse Best Practices: `81`.
- Review GitHub Actions Node runtime warning for `actions/checkout@v4` and `actions/upload-artifact@v4`.
- Review the downloaded Lighthouse JSON before starting performance work.
- Keep performance changes separate from DNS, Cloudflare, workflow, or deployment cleanup.

## Cleanup Rule

Archive uncertain working material before removal. Delete only generated, stale, duplicate, or clearly unused files with a Git rollback path.
