# Taiyzun Production Re-Audit

## Baseline Snapshot

Date: 10 July 2026.

Scope: current repository source, generated Cloudflare Pages output, local rendered behaviour and live `https://taiyzun.com` route health. Historical reports were treated as context only.

Repository baseline:

- Branch: `main`.
- Remote baseline: `origin/main` at `23455a6f9`.
- Local baseline: 1 unpushed commit ahead at `384c6b3b3`.
- The local-only commit adds 28 Finder-style duplicate Odyssey chunk files. The official build deletes these files and regenerates 7 canonical chunks. This commit must be resolved before any production push.
- Build output is ignored and regenerated through `npm run build`.

Automated baseline:

- `npm run build`: passed.
- `npm run test:safe`: passed.
- `node scripts/validate-pages.js`: 140 passed, 0 warnings, 0 failures.
- JavaScript syntax checks: passed after the build completed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- High-confidence secret-pattern scan: no exposed secret found in public source paths.
- Every public page has exactly 1 H1 and no duplicate HTML ids.

Rendered baseline:

- 45 built-page checks across small phone, large phone, phone landscape, tablet, tablet landscape, desktop, large desktop and ultrawide viewports.
- 0 broken rendered images across the tested routes and sizes.
- Mobile menu open, Escape close, body scroll restoration, ARIA state and focus restoration passed.
- YouTube carousel cards and dots both selected the correct video and updated the player with autoplay enabled.
- Creations lightbox open, image navigation, 2.6x zoom, pan, zoom reset, share control and body scroll lock passed.
- Mobile Odyssey first view loaded no Three.js, sword, @ logo or field runtime.
- Desktop Odyssey loaded the field, sword and @ logo as ready with 3 canvases and no broken images.

## Lighthouse Baseline

Local built output, mobile mode:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 90 | 100 | 100 | 100 | 3.2 s | 0 ms | 0.01 |
| Work | 93 | 100 | 100 | 100 | 2.9 s | 0 ms | 0 |
| Odyssey | 100 | 100 | 100 | 100 | 1.8 s | 0 ms | 0 |
| Creations | 98 | 100 | 100 | 100 | 2.3 s | 0 ms | 0 |
| Connect | 91 | 100 | 100 | 100 | 3.2 s | 0 ms | 0 |

## Reproduced Findings

1. Shared ambient, premium-experience and 3D content-layer selectors changed the fixed desktop navigation to `position: relative`, causing right-edge clipping around the 1024px desktop breakpoint.
2. Home, Work, Creations and Connect exposed skip-link targets without native `main` landmarks.
3. Creations artwork cards used clickable `div` elements, preventing keyboard activation.
4. The Creations lightbox did not move focus into the dialog, trap Tab navigation or restore focus to the originating artwork card.
5. Compact-device timers could start the full Creations stylesheet and Three.js field without interaction, producing an intermittent 15.2 s mobile LCP.
6. The WebGL renderer's premultiplied-alpha mode did not match the custom cutout shader, rendering transparent texture planes as black rectangles.
7. Primary text panels were included in pointer and scroll-linked 3D transforms, allowing archive headings and copy to rotate with the decorative field.

## Applied Repairs

- Preserved the fixed navigation stacking context at every tested desktop width.
- Converted existing skip targets into native `main` landmarks without changing page composition.
- Converted Creations artwork cards to keyboard-operable buttons and added valid pressed-state semantics to category filters.
- Added lightbox focus entry, focus containment, Escape close and opener focus restoration.
- Made compact-device WebGL and the full Creations stylesheet interaction-triggered enhancements; desktop enrichment remains automatic.
- Corrected WebGL alpha compositing and retained transparent decorative cutouts without rectangular planes.
- Removed primary reading surfaces from pointer and scroll-linked 3D transforms while preserving decorative field motion and card-level depth.
- Protected archive heading panels from moving artwork and removed per-word compositing from archive headings.
- Updated source, minified counterparts, generated CSS bundles and cache tokens together.

## Final Verification

Final local built output, Lighthouse mobile mode:

| Route | Performance | Accessibility | Best Practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 90 | 100 | 100 | 100 | 2.9 s | 0 ms | 0.01 |
| Work | 87 | 100 | 100 | 100 | 3.4 s | 0 ms | 0 |
| Odyssey | 99 | 100 | 100 | 100 | 1.6 s | 0 ms | 0 |
| Creations | 99 | 100 | 100 | 100 | 1.6 s | 0 ms | 0.012 |
| Connect | 93 | 100 | 100 | 100 | 2.6 s | 0 ms | 0 |

Additional final checks:

- `npm run build`: passed; 83 public entries generated.
- `npm run test:safe`: passed; Google and Meta trackers remain inactive.
- `node scripts/validate-pages.js`: 140 passed, 0 warnings, 0 failures.
- JavaScript and service-worker syntax checks: passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Built-page mobile and desktop interaction checks: passed for navigation, gallery loading, viewer focus, close and share controls.
- Existing production routes returned 200; an unknown production route returned 404.
- GitHub CLI authentication is valid and the latest listed `main` Lighthouse workflow is successful.

## Release State

- Verified branch: `codex/taiyzun-production-reaudit`, based directly on `origin/main` at `23455a6f9`.
- The pre-existing local `main` commit `384c6b3b3` was preserved and not rewritten. It contains 28 Finder-style duplicate Odyssey chunks that the official build removes.
- The verified branch has not been pushed or deployed. Production therefore does not yet include these repairs.

## Deliberately Untouched

- DNS, Cloudflare dashboard settings, hosting settings and registrar settings.
- Analytics, Google tags and Meta Pixel activation.
- Public biography, gallery selection, brand language and visual design direction.
- Dependency versions and production infrastructure.
