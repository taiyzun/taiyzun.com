# Deployment

Last verified: 2026-06-24.

## taiyzun.com

- Host: Cloudflare Pages
- Project: `taiyzun-com`
- Branch: `main`
- Build command: `npm run build:pages`
- Output directory: `dist`
- Build script: `scripts/build-cloudflare-pages.js`

The build copies only public HTML, CSS, JavaScript, selected assets, headers, redirects, sitemap, robots, manifest, and service worker files into `dist`.

## taj-mahal-movie.com

- Host: Cloudflare Pages
- Project: `taj-mahal-movie-com`
- Branch: `main`
- Build command: `exit 0`
- Output directory: repository root

Because the Taj site deploys from the repository root, keep root files minimal. Do not add private notes, working drafts, local reports, or setup guides to the root of that repository.

## Required checks before push

- `git status --short --branch`
- Tai: `npm run build`
- Tai: `node --check` for changed JavaScript and functions
- Taj: static route/header checks with `curl`
- Live verification after Cloudflare deploy completes
