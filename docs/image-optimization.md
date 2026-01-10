Image optimization guide

What this does
- Generates AVIF and WebP variants at widths 400/800/1200 for images in `assets/Portraits/`
- Outputs to `assets/Portraits/optimized/`
- Writes `assets/Portraits/gallery-images.json` that maps original images to generated `srcset` strings
- `assets/js/gallery.js` will load this mapping at runtime (if present) and replace thumbnails with `<picture>` elements

How to run
1. Install dependencies: `npm install`
2. Run: `npm run optimize-images`
3. Commit `assets/Portraits/optimized/` and `assets/Portraits/gallery-images.json` (or store them in your build artifacts)

Notes
- The script uses `sharp` which includes native binaries; install may require build tools on some systems.
- If you prefer a Dockerized or CI-based approach, run the script as part of your build pipeline and upload the optimized assets to the static host.
