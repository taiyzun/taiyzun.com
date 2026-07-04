# Maintenance

## Monthly Maintenance Checklist

- Run `gh auth status` before any GitHub Actions investigation.
- Review the Tai `Lighthouse Audit` workflow result.
- Download and inspect the latest `lighthouse-report` artifact.
- Confirm Tai `/odyssey` still returns `Cache-Control: public, no-cache, must-revalidate, no-transform`.
- Confirm Tai `/odyssey` live source does not include `challenge-platform`, `__CF$cv`, or `/cdn-cgi/challenge-platform/`.
- Confirm Cloudflare Bot Fight Mode remains ON.
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
- Confirm the Tai contact form still delivers without Mailchimp configuration, and that Mailchimp opt-in failures do not block the normal contact response.
- If Mailchimp is enabled, confirm the `Taiyzun Serious Enquiry` tag or configured replacement tag still starts the intended welcome journey.
- Review GitHub branch protection and Dependabot status.
- Keep billing/payment changes manual and owner-approved.

## Before Publishing Changes

- Keep public site copy verified and conservative.
- Run local build checks before push.
- Confirm sitemap, robots, canonical, and social preview tags.
- Verify desktop and mobile rendering.
- Keep documentation-only changes separate from production code changes where practical.

## Remaining Optimisation Backlog

- Improve and stabilise Tai `/odyssey` GitHub-runner mobile Lighthouse Performance above `90`.
- Maintain Tai `/odyssey` local live Lighthouse Performance at `95+`.
- Maintain Tai `/odyssey` Best Practices at `100`.
- Review fresh Lighthouse JSON before starting any further performance work.
- Keep performance changes separate from DNS, Cloudflare, workflow, or deployment cleanup.
- Treat any future Cloudflare HTML transformation, Web Analytics auto-injection, or third-party script change as a measured performance/Best Practices risk.

## Cleanup Rule

Archive uncertain working material before removal. Delete only generated, stale, duplicate, or clearly unused files with a Git rollback path.
