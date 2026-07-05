# Maintenance

## Monthly Maintenance Checklist

- Run `gh auth status` before any GitHub Actions investigation.
- Review the Tai `Lighthouse Audit` workflow result.
- Download and inspect the latest `lighthouse-report` artifact.
- Confirm Tai HTML responses still include `Cache-Control: public, no-cache, must-revalidate, no-transform`.
- Confirm live HTML source does not include unwanted Cloudflare challenge or detection script injection.
- Run `npm run build` in `/Users/tai/Documents/GitHub/taiyzun.com`.
- Run JS syntax checks for `functions/`, `js/`, and `scripts/`.
- Run `git diff --check`.
- Run `node scripts/validate-pages.js`.
- Run `npm run test:safe`.
- Run `npm audit --omit=dev`.
- Run Lighthouse for:
  - `https://taiyzun.com/`
  - `https://taiyzun.com/odyssey`
  - `https://taiyzun.com/creations`
- Verify core Tai routes:
  - `https://taiyzun.com/`
  - `https://taiyzun.com/journey`
  - `https://taiyzun.com/creations`
  - `https://taiyzun.com/odyssey`
  - `https://taiyzun.com/connect`
  - `https://taiyzun.com/robots.txt`
  - `https://taiyzun.com/sitemap.xml`
- Confirm each public HTML page has exactly 1 `h1`.
- Confirm canonical URLs and Open Graph metadata.
- Confirm no relevant console errors.
- Confirm no broken loaded images.
- Confirm no horizontal overflow on mobile and desktop.
- Check homepage carousel card click and dot click.
- Check `/creations` gallery lazy-loading and `5,770 Works in View` count unless the gallery source intentionally changes.
- Check `/creations` compact/mobile first load keeps the full creations CSS bundle deferred until interaction, scroll, or idle fallback.
- Check decorative WebGL PNG fields have no visible rectangular frame around transparent artwork.
- Check `/creations` lightbox open, full image load, share URL, close button, and scroll-lock release.
- Check `/connect` form endpoint behaviour without sending real enquiries.
- Check desktop 3D sword/@ logo runtime.
- Check mobile deferred/static 3D fallback.
- Confirm no private docs, setup notes, local reports, `.env` files, `.DS_Store`, `CNAME`, or backup files are served publicly.
- Keep billing, DNS, registrar, R2, Cloudflare settings, and payment changes manual and owner-approved.

## Before Publishing Changes

- Keep public site copy verified and conservative.
- Keep documentation-only changes separate from production code changes where practical.
- Do not stage generated validation-output churn unless the file is intentionally being updated.
- Run local build and validation checks before push.
- Test rendered behaviour on mobile and desktop.
- Confirm sitemap, robots, canonical, and social preview tags.
- Recheck GitHub Actions after push.

## Current Optimisation Backlog

- P1: measurement architecture and consent-aware Google/Meta tracking plan. See `docs/FULL-STACK-OPTIMISATION-ROADMAP.md`.
- Completed: `/creations` critical CSS split and compact/mobile full-bundle deferral.
- Completed: `/creations` desktop intro CLS refinement and decorative WebGL PNG cutout-frame fix.
- P2: `/creations` gallery JavaScript is now extracted/minified; only continue into functional gallery refactors if fresh metrics justify it and full interaction QA is repeated.
- P2: `/api/contact` backend smoke tests and environment-variable checklist.
- P2: consent-approved Google/Meta tracking activation only after real IDs and privacy wording are ready.
- P2: possible future image thumbnail pipeline if gallery transfer size grows.
- P2: safe long-term 3D object maintenance, keeping desktop rich and mobile deferred.
- P2: Cloudflare/no-transform decision review only if there is a deliberate reason to allow HTML transformations.
- P3: future UI polish only if metrics or rendered QA regress.

## Current Health Targets

- Maintain `/odyssey` mobile Performance at `95+`.
- Maintain `/odyssey` Best Practices at `100`.
- Maintain `/odyssey` SEO at `100`.
- Maintain `/creations` mobile Performance at `90+`.
- Keep `/creations` desktop CLS below `0.1`.
- Keep mobile TBT near `0 ms`.
- Keep mobile CLS at or near `0`.

## Cleanup Rule

Archive uncertain working material before removal. Delete only generated, stale, duplicate, or clearly unused files with a Git rollback path and owner approval when the file was not created by the current task.
