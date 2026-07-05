# Final Optimisation Closeout

## Verification Snapshot

- Last verified: 2026-07-05 06:52 IST.
- Site: `https://taiyzun.com`
- Repository: `https://github.com/taiyzun/taiyzun.com`
- Branch: `main`
- Latest verified baseline before this update: `c2e45e90c414b8bc672e71c86851274f9ce88200`
- Latest verified GitHub Actions run before this update: `28724924812`

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

- Performance: `96`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- Agentic Browsing: `100`
- CLS: `0`
- TBT: `160 ms`

Fresh live mobile CLI:

- `/odyssey`: Performance `100`, Accessibility `100`, Best Practices `100`, SEO `100`, TBT `0 ms`, CLS `0`.
- `/creations`: Performance `95`, Accessibility `100`, Best Practices `100`, SEO `100`, TBT `0 ms`, CLS `0.01`.

Local `/creations` after the critical CSS split:

- Mobile: Performance `99`, Accessibility `94`, Best Practices `96`, SEO `100`, LCP `2.1 s`, TBT `0 ms`, CLS `0.021`.
- Desktop: Performance `92`, Accessibility `94`, Best Practices `96`, SEO `100`, LCP `0.7 s`, TBT `0 ms`, CLS `0.179`.

## Fixes Already Completed

- Homepage carousel card and dot interactions were fixed and reverified.
- Homepage carousel CSS/JS is cache-busted.
- Mobile `/odyssey` heavy 3D remains deferred/static.
- Desktop 3D sword and @ logo runtimes reach `ready`.
- `/creations` gallery lazy-loads successfully.
- `/creations` lightbox opens full-size imagery and preserves share URLs.
- `/creations` now uses a critical first stylesheet plus a deferred full CSS loader on compact/mobile first load.
- `/creations` rendered QA confirms the full CSS bundle is skipped during initial mobile load and loaded correctly after scroll.
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

- `/odyssey` mobile performance is excellent.
- `/creations` mobile performance is strong after the critical CSS split.
- Further CSS or functional gallery JavaScript refactors are optional and higher-risk because they touch shared layout, gallery loading, lightbox, share, and gesture behaviour.
- Desktop `/creations` CLS remains a future optimisation target, not an active deployment blocker.
- HTML compression remains a possible Lighthouse observation, but `no-transform` is intentionally preserved because it prevents unwanted Cloudflare edge-script injection.
- No active production blocker remains.

## Optional Future Targets

| Target | Priority | Reason | Risk |
| --- | --- | --- | --- |
| `/creations` desktop intro CLS refinement | P2 optional optimisation | Local desktop CLS is still around `0.179` | Medium |
| `/creations` functional gallery JS refactor | P2 optional optimisation | Only if fresh metrics show a remaining bottleneck after extraction/minification | Medium-high |
| Gallery thumbnail pipeline | P2 optional optimisation | Useful if gallery transfer grows | Medium |
| Long-term 3D asset maintenance | P2 optional optimisation | Preserve desktop richness while keeping mobile light | Medium |
| Cloudflare/no-transform decision review | P2 optional optimisation | Only if HTML transformation is deliberately wanted | Medium-high |
| UI polish if metrics regress | P3 polish | Keep visual quality stable | Low-medium |

## Closeout Status

The performance and optimisation closeout is complete for the current production state. Future work should be measured, narrow, and committed separately.
