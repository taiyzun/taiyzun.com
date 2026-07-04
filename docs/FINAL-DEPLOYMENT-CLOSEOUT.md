# Final Deployment Closeout

## Verification Snapshot

- Last verified: 2026-07-05 03:51 IST.
- Current closeout scope: `taiyzun.com`.
- Related active website retained from earlier closeout: `taj-mahal-movie.com`.
- Repository: `https://github.com/taiyzun/taiyzun.com`.
- Branch: `main`.
- Latest verified commit: `38eced3b4b78ca12afd06d1f60a6672bf2c8de92`.
- Latest verified GitHub Actions run: `28717350186`.
- Latest verified GitHub Actions job: `85160999063`.
- Production verification method: live HTTP checks, live browser checks, local build checks, current Lighthouse CLI runs, and downloaded GitHub Actions artifact.

## Active Production Sites

1. `taiyzun.com`
   - Primary URL: `https://taiyzun.com/`
   - Secondary host: `https://www.taiyzun.com/`
   - Cloudflare Pages project: `taiyzun-com`
   - GitHub repository: `https://github.com/taiyzun/taiyzun.com`
   - Media storage: Cloudflare R2, `taiyzun-gallery`
   - Asset host: `https://assets.taiyzun.com`
   - Current live status: verified in this pass.

2. `taj-mahal-movie.com`
   - Primary URL: `https://www.taj-mahal-movie.com/`
   - Redirect host: `https://taj-mahal-movie.com/`
   - Cloudflare Pages project: `taj-mahal-movie-com`
   - GitHub repository: `https://github.com/taiyzun/taj-mahal-movie.com`
   - Media storage: Cloudflare R2, `taj-mahal-movie-media`
   - Asset host: `https://assets.taj-mahal-movie.com`
   - Current live status: retained from earlier closeout; not reverified in this Tai-only pass.

## Cleanup Completed

- Tai homepage carousel tap and click behaviour was previously fixed and is still verified.
- Live homepage serves the cache-busted carousel assets:
  - `/css/taiyzun-index.bundle.min.css?v=20260704p`
  - `/js/video-carousel.min.js?v=20260704d`
- `robots.txt` now validates because the non-standard content-signal line is a comment.
- Creations @ logo fallback uses responsive `srcset` and `sizes`.
- Tai `/odyssey` and `/creations` performance is currently healthy.
- GitHub Actions Lighthouse Audit passes.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- No DNS, Cloudflare settings, hosting settings, no-transform headers, dependencies, gallery selection, design direction, or production infrastructure were changed in this closeout pass.

## Cloudflare / DNS Status

- `taiyzun.com` is served through Cloudflare Pages and Cloudflare edge headers.
- Current live HTML responses return `Cache-Control: public, no-cache, must-revalidate, no-transform`.
- The `no-transform` HTML cache directive is intentionally preserved because it prevents unwanted Cloudflare HTML/script transformation and protects Lighthouse Best Practices.
- Active Cloudflare R2 bucket for Tai media: `taiyzun-gallery`.
- Old Cloudflare zones removed during the earlier deployment cleanup:
  - `shahpurwala.net`
  - `tajmahalmovies.com`
- No Cloudflare dashboard, DNS, registrar, hosting, Bot Fight Mode, or production setting was changed in this pass.

## GitHub Actions Status

- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Latest inspected run: `28717350186`
- Latest inspected job: `85160999063`
- Workflow conclusion: `success`
- Head SHA: `38eced3b4b78ca12afd06d1f60a6672bf2c8de92`
- Passed steps:
  - Set up job
  - Checkout repo
  - Run Lighthouse (mobile)
  - Upload Lighthouse report
  - Print summary
  - Post Checkout repo
  - Complete job

## Lighthouse Audit Result

GitHub Actions artifact, `lighthouse-report`, `lighthouse-odyssey.json`:

- Target URL: `https://taiyzun.com/odyssey`
- Mode: mobile
- Fetch time: `2026-07-04T19:35:32.761Z`
- Performance: `96`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- Agentic Browsing: `100`
- First Contentful Paint: `1.1 s`
- Largest Contentful Paint: `1.6 s`
- Speed Index: `3.8 s`
- Total Blocking Time: `160 ms`
- Time to Interactive: `1.6 s`
- Cumulative Layout Shift: `0`
- Total size: `127 KiB`

Fresh live Lighthouse CLI, mobile:

- `https://taiyzun.com/odyssey`: Performance `100`, Accessibility `100`, Best Practices `100`, SEO `100`, CLS `0`, TBT `0 ms`.
- `https://taiyzun.com/creations`: Performance `95`, Accessibility `100`, Best Practices `100`, SEO `100`, CLS `0.01`, TBT `0 ms`.

## Historical Issue Resolved

- Earlier Lighthouse Audit failures did not start the runner because the GitHub account was locked by a billing issue.
- The billing issue was resolved outside the repository.
- No workflow code change was required for that billing lock.
- A later Best Practices drop was caused by Cloudflare JavaScript being injected at the edge.
- The current `no-transform` HTML header prevents that edge script injection and the audit now passes.

## Current Health Summary

- Production deployment closeout for Tai is complete.
- `taiyzun.com` live routes checked in this pass returned `200`:
  - `/`
  - `/journey`
  - `/creations`
  - `/odyssey`
  - `/connect`
  - `/robots.txt`
  - `/sitemap.xml`
- Each HTML page checked has exactly 1 `h1`.
- Canonical URLs are present on all checked HTML pages.
- Open Graph title and image metadata are present on all checked HTML pages.
- Live browser checks found no relevant console errors.
- Live browser checks found no broken loaded images.
- Live browser checks found no horizontal overflow.
- Homepage carousel card click and dot click work and load the selected YouTube iframe with `autoplay=1`.
- Creations gallery lazy-loads and reports `5,770 Works in View`.
- Creations lightbox opens a full 1920 px image, preserves the share URL, and closes without leaving scroll lock.
- Desktop home and creations 3D sword/@ logo runtimes reach `ready`.
- Mobile heavier 3D remains deferred or static as intended.
- `robots.txt` has no unknown live directives.

## Remaining Warnings

- `/creations` still has optional Lighthouse opportunities for unused CSS, unused JavaScript, unminified inline JavaScript, and render-blocking CSS.
- A desktop-only `/odyssey` Lighthouse run reported CLS `0.339` from the premium hero surface. The mobile production audit is clean with CLS `0`, and browser desktop checks showed no visible overflow, broken images, or console errors. Treat this as a monitoring item if desktop Lighthouse becomes a formal gate.
- The untracked local `audits/` folder and duplicate `docs/* 2.md` files were inspected only for classification. They were not deleted, merged, staged, or committed.

## Next Optimisation Targets

- P2: `/creations` large CSS bundle, estimated Lighthouse savings `23 KiB`.
- P2: `/creations` inline/gallery JavaScript, estimated savings `34 KiB` unused JavaScript and `9 KiB` unminified JavaScript.
- P2: future image thumbnail pipeline if gallery transfer size grows.
- P2: long-term 3D asset maintenance, keeping desktop rich and mobile deferred.
- P2: formal Cloudflare/no-transform decision review only if the site deliberately wants Cloudflare HTML transformations.
- P3: future UI polish only if rendered QA or metrics regress.

## Rollback Method

For a code or documentation issue in this repository:

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
git log --oneline -10
git revert <bad-commit>
npm run build
node scripts/validate-pages.js
git push origin main
```

For a Cloudflare Pages deployment issue:

- Prefer Cloudflare Pages rollback to the previous successful deployment when available.
- Do not change DNS, registrar, R2, or Cloudflare zone settings unless the issue is confirmed to be infrastructure-level.

## Monthly Maintenance Checklist

- Run `gh auth status`.
- Review the latest `Lighthouse Audit` workflow.
- Download and inspect the latest `lighthouse-report` artifact.
- Run `npm run build`.
- Run JS syntax checks for `functions/`, `js/`, and `scripts/`.
- Run `git diff --check`.
- Run `node scripts/validate-pages.js`.
- Run `npm audit --omit=dev`.
- Run Lighthouse for `/`, `/odyssey`, and `/creations`.
- Check live routes `/`, `/journey`, `/creations`, `/odyssey`, `/connect`, `/robots.txt`, and `/sitemap.xml`.
- Check canonical URLs and Open Graph metadata.
- Check console errors, broken images, and horizontal overflow on mobile and desktop.
- Check homepage carousel card and dot interactions.
- Check `/creations` gallery lazy-loading, lightbox, share URL, and close behaviour.
- Check `/connect` form endpoint behaviour without sending real enquiries.
- Check desktop 3D sword/@ logo and mobile deferred/static fallback.
- Preserve `no-transform` unless Cloudflare HTML transformation is deliberately approved.

## Final Status

Production deployment closeout is complete.
`taiyzun.com` is live.
The Tai Lighthouse Audit workflow passes.
No active deployment blocker remains.
