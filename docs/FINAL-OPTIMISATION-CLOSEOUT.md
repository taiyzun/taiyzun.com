# Final Optimisation Closeout

## Verification Snapshot

- Last verified: 2026-07-05 07:50 IST.
- Site: `https://taiyzun.com`
- Repository: `https://github.com/taiyzun/taiyzun.com`
- Branch: `main`
- Latest verified implementation commit: `98f5c4a4a6ea0e787f2c004ab365ba2740d5f54e`
- Latest verified GitHub Actions run: `28726830540`

## Production Status

- `taiyzun.com` is live.
- Core routes return `200`.
- GitHub Actions Lighthouse Audit passes.
- `npm run build` passes.
- JS syntax checks pass.
- `git diff --check` passes.
- `node scripts/validate-pages.js` passes with 0 failures.
- `npm audit --omit=dev` reports 0 vulnerabilities.
- No active production blocker remains.

## Current Lighthouse Summary

GitHub Actions mobile `/odyssey`:

- Performance: `69`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- CLS: `0`
- TBT: `2,610 ms`

Fresh live mobile CLI:

- `/odyssey`: Performance `100`, Accessibility `100`, Best Practices `100`, SEO `100`, TBT `0 ms`, CLS `0`.
- `/creations`: Performance `95`, Accessibility `100`, Best Practices `100`, SEO `100`, TBT `0 ms`, CLS `0.01`.

Local `/odyssey` after the WebGL cutout refinement:

- Mobile: Performance `100`, Accessibility `100`, Best Practices `100`, SEO `100`, LCP `1.7 s`, TBT `0 ms`, CLS `0`.

Local `/creations` after the critical CSS and CLS refinement:

- Mobile: Performance `99`, Accessibility `100`, Best Practices `100`, SEO `100`, LCP `2.2 s`, TBT `0 ms`, CLS `0`.
- Desktop: Performance `100`, LCP `0.8 s`, TBT `0 ms`, CLS `0.024`.

## Fixes Already Completed

- Homepage carousel card and dot interactions were fixed and reverified.
- Homepage carousel CSS/JS is cache-busted.
- Mobile `/odyssey` heavy 3D remains deferred/static.
- Desktop 3D sword and @ logo runtimes reach `ready`.
- `/creations` gallery lazy-loads successfully.
- `/creations` lightbox opens full-size imagery and preserves share URLs.
- `/creations` now uses a critical first stylesheet plus a deferred full CSS loader on compact/mobile first load.
- `/creations` rendered QA confirms the full CSS bundle is skipped during initial mobile load and loaded correctly after scroll.
- `/creations` desktop first-paint geometry is now aligned with the final visual system, reducing desktop CLS from `0.1795` to `0.0235`.
- The decorative WebGL PNG field now uses a cutout alpha ramp, so transparent PNG areas no longer render as pale rectangular planes.
- `robots.txt` validates with no unknown directives.
- Creations @ logo fallback uses responsive image candidates.
- Cloudflare edge-script injection is controlled by preserving `no-transform` on HTML responses.

## What Was Intentionally Not Touched

- DNS.
- Cloudflare dashboard settings.
- Hosting settings.
- R2 bucket settings.
- `no-transform` HTML headers.
- Gallery image selection.
- Site content and design direction.
- Broad CSS bundle refactor beyond the narrow `/creations` critical path split.
- Functional gallery JavaScript refactor.
- Dependency upgrades.
- 3D object behaviour.

## Current Risk Assessment

- `/odyssey` local mobile performance is excellent; the latest GitHub Actions production run passes but leaves a TBT optimisation target.
- `/creations` mobile performance is strong after the critical CSS split.
- `/creations` desktop CLS is now under the usual `0.1` good threshold in local Lighthouse after the targeted refinement.
- Further CSS or functional gallery JavaScript refactors are optional and higher-risk because they touch shared layout, gallery loading, lightbox, share, and gesture behaviour.
- HTML compression remains a possible Lighthouse observation, but `no-transform` is intentionally preserved because it prevents unwanted Cloudflare edge-script injection.
- No active production blocker remains.

## Optional Future Targets

| Target | Priority | Reason | Risk |
| --- | --- | --- | --- |
| `/creations` functional gallery JS refactor | P2 optional optimisation | Only if fresh metrics show a remaining bottleneck after extraction/minification | Medium-high |
| Gallery thumbnail pipeline | P2 optional optimisation | Useful if gallery transfer grows | Medium |
| `/odyssey` production CI TBT review | P2 optional optimisation | Latest passing GitHub Actions run reports TBT `2,610 ms` | Medium |
| Long-term 3D asset maintenance | P2 optional optimisation | Preserve desktop richness while keeping mobile light | Medium |
| Cloudflare/no-transform decision review | P2 optional optimisation | Only if HTML transformation is deliberately wanted | Medium-high |
| UI polish if metrics regress | P3 polish | Keep visual quality stable | Low-medium |

## Closeout Status

The performance and optimisation closeout is complete for the current production state. Future work should be measured, narrow, and committed separately.
