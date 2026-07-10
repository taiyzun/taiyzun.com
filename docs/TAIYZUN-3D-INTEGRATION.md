# Taiyzun 3D Integration Handover

## Production Assets

| Role | File | Size | SHA-256 |
| --- | --- | ---: | --- |
| Dominant sword model | `3d/Taiyzun_Sword_Web.glb` | 766,128 bytes | `a3be0deec2053f748714a98f86dd0b8ad5854fa03d48fe2365cb2621a4746728` |
| Sword static fallback | `3d/Taiyzun_Sword_Fallback.png` | 59,201 bytes | `30776b823170b8834eed49c773436ea63713f94fad29696a915b90215a9a972e` |
| Supporting @ model | `3d/Taiyzun_At_Logo_Web.glb` | 2,306,876 bytes | `b57bc1c2e10405c2c372e1d0f852a78c79011d8f7775324a4766b5882f92cf13` |
| @ static fallback | `3d/Taiyzun_At_Fallback.png` | 186,453 bytes | `ee8fd5fa874458e472d525b5f539fb55f9ad1cf9a7ce38af95090430d35eea80` |

The sword fallback is 608x1600. The @ fallback is 512x512. The original @ package remains outside the repository and was not modified.

## Runtime Contract

The shared runtime is `js/taiyzun-sword.js` with the minified production entry `js/taiyzun-sword.min.js`. It uses the local vendored Three.js and GLTFLoader modules, loaded once per page when a stage is permitted to initialise.

The runtime supports:

- `data-taiyzun-sword` for the upright dominant sword.
- `data-taiyzun-at` for the secondary @ mark.
- `data-taiyzun-3d-canvas` and `data-taiyzun-3d-fallback` for shared stage markup.
- `status=ready`, `status=deferred`, `status=static` and `status=loading` diagnostics.
- `performanceMode=mobile-deferred`, `mobile-static` and `reduced-motion` diagnostics.

## Placement And Motion

- Sword: centred, Y-up, front-facing, scale `1.08`, maximum yaw `10 degrees`, maximum pitch about `2 degrees`.
- @ mark: smaller right-side supporting position, scale `0.45`, maximum yaw `6 degrees`, maximum pitch `4 degrees`.
- Both objects remain z-contained, use transparent renderer backgrounds, and use soft ambient, key, rim and lower fill lights.
- Neither object performs a full spin. Both use a slow breathing motion and pointer parallax only.

## Fallback And Performance Behaviour

- Desktop stages initialise after visibility and idle checks.
- Mobile, coarse-pointer, save-data and low-memory paths defer WebGL until interaction or remain static where appropriate.
- Reduced-motion and WebGL-unavailable paths keep the supplied fallback visible.
- Page-level @ stages are hidden by critical CSS until the full stylesheet is ready, preventing an early layout or paint flash.
- The build allow-list copies both @ assets to `dist/`.

## Verification

- Local desktop browser check: sword and @ both `ready`, no console errors, no horizontal overflow.
- Local mobile browser check: 5 public routes, no horizontal overflow, page stages `deferred` and hidden before full CSS.
- Local mobile Lighthouse `/odyssey`: Performance 100, LCP 1.8 s, TBT 0 ms, CLS 0.
- Local desktop Lighthouse `/odyssey`: Performance 79, LCP 0.7 s, TBT 490 ms, CLS 0.01.
