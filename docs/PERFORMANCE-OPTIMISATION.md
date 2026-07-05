# Performance Optimisation

## Current Baseline

- Last verified: 2026-07-05 07:50 IST.
- Site: `https://taiyzun.com`
- Latest verified implementation commit: `98f5c4a4a6ea0e787f2c004ab365ba2740d5f54e`
- Latest verified GitHub Actions run: `28726830540`

## Current Scores

| Route | Source | Performance | Accessibility | Best Practices | SEO | TBT | CLS |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| `/odyssey` | GitHub Actions mobile, run `28726830540` | 69 | 100 | 100 | 100 | 2,610 ms | 0 |
| `/odyssey` | live CLI mobile | 100 | 100 | 100 | 100 | 0 ms | 0 |
| `/odyssey` | local CLI mobile after WebGL cutout refinement | 100 | 100 | 100 | 100 | 0 ms | 0 |
| `/creations` | live CLI mobile | 95 | 100 | 100 | 100 | 0 ms | 0.01 |
| `/creations` | local CLI mobile after CLS refinement | 99 | 100 | 100 | 100 | 0 ms | 0 |
| `/creations` | local CLI desktop after CLS refinement | 100 | Not rerun | Not rerun | Not rerun | 0 ms | 0.024 |

## Confirmed Healthy Areas

- `/odyssey` mobile 3D path is protected by deferred/static behaviour.
- `/odyssey` local mobile Lighthouse remains healthy after the WebGL cutout fix, but the latest GitHub Actions production run has a remaining TBT optimisation target.
- Desktop 3D sword and @ logo remain available where appropriate.
- Homepage carousel interaction scripts are cache-busted and working.
- `/creations` gallery lazy-loads to `5,770 Works in View`.
- `/creations` gallery controller is now extracted to `js/creations-gallery.min.js`, keeping the HTML lighter while preserving the existing boot order.
- `/creations` now serves a small critical stylesheet first and defers the full `taiyzun-creations.bundle.min.css` on compact/mobile viewports until scroll, touch, keyboard, or idle fallback.
- Rendered mobile QA confirmed the full `/creations` CSS bundle is not fetched during initial mobile first load, then loads correctly after scroll.
- `/creations` desktop intro CLS has been reduced from `0.179` to `0.024` by aligning critical first-paint geometry with the final visual system.
- Rendered QA confirmed the decorative WebGL PNG field no longer exposes visible rectangular image planes during load.
- `/creations` lightbox opens high-resolution imagery on demand.
- No broken loaded images were found in live browser checks.
- No relevant browser console errors were found in live browser checks.
- No horizontal overflow was found in tested mobile or desktop viewports.

## Known Remaining Opportunities

### Completed - `/creations` Critical CSS Split

- Completed on 2026-07-05 by adding `css/creations-critical.css`, `css/creations-critical.min.css`, and a small deferred loader at `js/creations-css-loader.min.js`.
- Initial compact/mobile load keeps the full `189 KB` creations CSS bundle out of the first render path.
- Desktop still loads the full visual system immediately to preserve the rich experience.
- Build routing was updated so the new minified loader is included in the Cloudflare Pages `dist/` artefact.
- Verified behaviours: mobile first-load critical CSS only, scroll-triggered full CSS injection, gallery render, filters, lightbox open, double-tap zoom, share URL, close, desktop full CSS load, and zero horizontal overflow.

### Completed - `/creations` Desktop Intro CLS Refinement

- Completed on 2026-07-05 by aligning desktop critical nav, intro, and archive panel geometry with the final `/creations` visual system.
- The decorative WebGL shader now uses a cutout alpha ramp, avoiding the pale rectangular frames seen around transparent PNG planes in rendered screenshots.
- Local desktop Lighthouse improved from Performance `91`, CLS `0.1795` to Performance `100`, CLS `0.0235`.
- Local mobile Lighthouse remains healthy at Performance `99`, Accessibility `100`, Best Practices `100`, SEO `100`, TBT `0 ms`, CLS `0`.
- Future changes in this area should remain measured and narrow because the intro card, premium animation system, and gallery layout share CSS ownership.

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

### P2 - `/odyssey` Production CI TBT

- GitHub Actions run `28726830540` passed but reported Performance `69` with TBT `2,610 ms`.
- Local mobile Lighthouse for the same post-fix code reported Performance `100`, TBT `0 ms`, CLS `0`.
- Safe next approach: inspect the production artifact waterfall and main-thread tasks before changing code; do not weaken the desktop 3D identity or remove approved visual features speculatively.
- Risk: medium, because `/odyssey` balances live WebGL, deferred mobile protection, and public visual identity.

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
