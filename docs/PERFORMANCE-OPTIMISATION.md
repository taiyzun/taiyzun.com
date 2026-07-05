# Performance Optimisation

## Current Baseline

- Last verified: 2026-07-05 03:51 IST.
- Site: `https://taiyzun.com`
- Latest verified commit: `38eced3b4b78ca12afd06d1f60a6672bf2c8de92`

## Current Scores

| Route | Source | Performance | Accessibility | Best Practices | SEO | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `/odyssey` | GitHub Actions mobile | 96 | 100 | 100 | 100 | 160 ms | 0 |
| `/odyssey` | live CLI mobile | 100 | 100 | 100 | 100 | 0 ms | 0 |
| `/creations` | live CLI mobile | 95 | 100 | 100 | 100 | 0 ms | 0.01 |

## Confirmed Healthy Areas

- `/odyssey` mobile 3D path is protected by deferred/static behaviour.
- Desktop 3D sword and @ logo remain available where appropriate.
- Homepage carousel interaction scripts are cache-busted and working.
- `/creations` gallery lazy-loads to `5,770 Works in View`.
- `/creations` gallery controller is now extracted to `js/creations-gallery.min.js`, keeping the HTML lighter while preserving the existing boot order.
- `/creations` lightbox opens high-resolution imagery on demand.
- No broken loaded images were found in live browser checks.
- No relevant browser console errors were found in live browser checks.
- No horizontal overflow was found in tested mobile or desktop viewports.

## Known Remaining Opportunities

### P2 - `/creations` CSS Bundle

- Lighthouse currently estimates `23 KiB` unused CSS on `/creations`.
- Safe approach: audit bundle ownership before splitting.
- Risk: medium, because CSS is shared across premium UI, gallery, lightbox, navigation, and responsive polish.
- Do not split CSS without rendered QA on mobile and desktop.

### Completed - `/creations` Gallery JavaScript Extraction

- Completed on 2026-07-05 by moving the former inline gallery controller into `js/creations-gallery.js` and serving the minified runtime at `js/creations-gallery.min.js`.
- The footer script order is intentionally preserved; the script is not deferred because follow-on inline runtime scheduling must not be reordered speculatively.
- Verified behaviours: mobile lazy boot, filters, lightbox open, full image load, double-tap zoom, pan after zoom, next image, close, scroll-lock release, share URL, desktop gallery boot, no horizontal overflow, and no console warnings.
- Future gallery JavaScript work should be treated as a functional refactor and must repeat full interaction QA.

### P2 - Image Thumbnail Pipeline

- The gallery is healthy now.
- Future optimisation may be useful if transfer size or gallery item count increases.
- Safe approach: add measured responsive thumbnails without changing selected gallery imagery.
- Risk: medium.

### P2 - 3D Asset Maintenance

- Desktop rich 3D is working.
- Mobile remains protected by deferred/static fallbacks.
- Safe approach: keep the desktop runtime rich and ensure mobile never starts heavy WebGL during first load.
- Risk: medium.

### P3 - UI Polish

- Only polish if a rendered QA issue or metric regression appears.
- Avoid visual redesign during performance-only work.

## Do Not Touch Without Approval

- DNS.
- Cloudflare settings.
- Hosting settings.
- R2 bucket settings.
- `no-transform` HTML cache directive.
- Gallery selection.
- Dependency upgrades.
- Broad CSS restructuring.
- Broad JavaScript restructuring.
- 3D design direction.

## Test Method

Before committing performance changes:

```bash
npm run build
find functions js scripts -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) | sort | while read -r file; do node --check "$file"; done
git diff --check
node scripts/validate-pages.js
npm audit --omit=dev
```

Rendered checks:

- Mobile 390 x 844.
- Desktop 1440 x 900.
- Homepage carousel card and dot click.
- `/creations` gallery lazy-load.
- `/creations` lightbox open, share URL, next/previous, close, and scroll-lock release.
- `/odyssey` mobile deferred/static 3D.
- Desktop 3D sword and @ logo.

Lighthouse checks:

- `/odyssey` mobile.
- `/creations` mobile.
- Optional desktop `/odyssey` if desktop CLS becomes a formal gate.

## Rollback

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
git log --oneline -10
git revert <bad-commit>
npm run build
node scripts/validate-pages.js
git push origin main
```
