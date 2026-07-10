# Taiyzun Production Re-Audit

## Verification Snapshot

Date: 10 July 2026.

Scope: the current `/Users/tai/Developer/taiyzun.com` source tree, the generated `dist/` output, local rendered routes, the supplied sword and @ assets, and the existing production boundary. Historical reports were treated as context only.

Working branch: `codex/perfected-sword-3d`.

Implementation commit: `aa5b6c959` (`feat(3d): integrate secondary at signature object`).

Production infrastructure was not changed. DNS, Cloudflare settings, hosting settings, registrar settings, accounts, analytics activation and dependency versions remain outside this pass.

## Baseline Findings

- The sword runtime was already integrated, but the supplied @ model had no production runtime, page markup or build allow-list entry.
- The @ source package contained a suitable web GLB and transparent fallback artwork. The source package was kept outside the repository unchanged.
- The home page had a responsive mobile values row that could create horizontal overflow at 390px. The mobile rule now forces single-column sizing.
- Page-level WebGL stages were correctly deferred on constrained devices, but the @ stage had no critical-CSS hide rule. That allowed a short early paint before the deferred full stylesheet arrived on `/odyssey` and `/creations`.
- The current repository contains no legacy Taiyzun object GLB or old @ runtime path. The active 3D loader is `js/taiyzun-sword.js` with its minified production counterpart.

## Implemented Changes

- Added the supplied @ web GLB as `3d/Taiyzun_At_Logo_Web.glb`.
- Added a 512px transparent @ fallback as `3d/Taiyzun_At_Fallback.png`.
- Extended the existing Three.js loader to share one lazy Three.js/GLTFLoader import between sword and @ stages.
- Kept desktop WebGL automatic after idle/visibility checks, with pointer parallax and slow breathing motion.
- Kept constrained mobile WebGL deferred until a meaningful interaction. Reduced-motion, low-memory and WebGL-unavailable paths remain static and safe.
- Positioned the @ object as a smaller supporting corner element. The sword remains the dominant upright, front-facing object.
- Added @ markup to the home, Journey, Odyssey, Creations and Connect heroes with transparent fallbacks and intrinsic dimensions.
- Added the @ assets to the Cloudflare Pages build copy allow-list.
- Added critical-CSS protection so page-level @ layers remain hidden until their full stylesheet is available on mobile.
- Bumped cache tokens for the affected page bundles.

## Automated Verification

- `npm run build`: passed; 72 public entries copied to `dist/`.
- `npm run test:safe`: passed; contact safety and SEO/tracking checks passed, with Google and Meta trackers inactive.
- `node scripts/validate-pages.js`: 140 passed, 0 warnings, 0 failures.
- `node --check js/taiyzun-sword.js`: passed.
- `node --check js/site-decorative-field.js`: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: passed before release packaging.

## Local Browser Verification

The built `dist/` site was served locally and checked at 1280x720 and 390x844.

Desktop checks:

- All 5 public routes rendered with 1 H1 and 0 horizontal overflow.
- Home and Odyssey initialised both sword and @ models as `ready`.
- The final home screenshot showed the sword centred and dominant, with the @ object smaller and offset to the right.
- No browser console errors were recorded.

Mobile checks:

- All 5 public routes had 0 horizontal overflow.
- Home retained the lightweight static sword/@ presentation.
- Page-level sword/@ stages stayed hidden before full CSS arrived.
- All 3D stages reported `status=deferred` and `performanceMode=mobile-deferred`.
- No browser console errors were recorded.

## Lighthouse Evidence

These are local built-output runs, not a claim about a new production deployment.

Mobile-mode `/odyssey` run using 390x844 emulation, 4x CPU slowdown and a throttled mobile connection:

| Performance | Accessibility | Best Practices | SEO | LCP | TBT | TTI | CLS | Transfer |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 100 | 100 | 100 | 1.8 s | 0 ms | 1.8 s | 0 | 122 KiB |

Desktop-mode `/odyssey` run at the local desktop preset:

| Performance | Accessibility | Best Practices | SEO | LCP | TBT | TTI | CLS | Transfer |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 79 | 100 | 100 | 100 | 0.7 s | 490 ms | 2.1 s | 0.01 | 2,237 KiB |

The desktop transfer includes the rich page and its deferred visual system. The 2.3 MB @ GLB is not requested during the mobile first-load audit because mobile WebGL is deferred.

## Open Risks And Follow-Up

- The @ GLB is intentionally retained at its supplied web size. A separate approved optimisation pass could evaluate mesh and embedded texture compression without changing the supplied artwork.
- Desktop TBT remains an optimisation target. The next safe investigation is render-blocking CSS and non-critical desktop JavaScript, measured separately from this asset integration.
- The current browser run was local. Production verification must happen after the release commit is pushed and the existing deployment completes.

## Deliberately Untouched

- DNS, Cloudflare, R2, hosting, registrar and production settings.
- Site copy, gallery selection, SEO metadata, tracking activation and dependency upgrades.
- The existing floating decorative field and portrait data logic, except where the new 3D stages needed shared selectors.
