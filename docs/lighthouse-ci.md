# Lighthouse production audit

The `Lighthouse Audit` workflow checks the five canonical production pages every Monday and on manual dispatch:

- Home: `https://taiyzun.com/`
- Journey: `https://taiyzun.com/journey`
- Creations: `https://taiyzun.com/creations`
- Odyssey: `https://taiyzun.com/odyssey`
- Connect: `https://taiyzun.com/connect`

## Measurement method

- Lighthouse and its npm dependencies are locked by `package-lock.json`.
- All pages run serially on one pinned `ubuntu-24.04` runner so pages are not compared across materially different CPUs.
- Each page receives three predetermined mobile samples with simulated throttling.
- No sample is discarded and the workflow never retries only until a result passes.
- Every JSON report is uploaded in the `lighthouse-production-mobile` artifact for 14 days.
- Logs include Node, Chrome, Lighthouse and per-report runner benchmark information.

## Enforcement

Performance, Largest Contentful Paint and Total Blocking Time are naturally variable lab measurements. At least two of each page's three complete samples must jointly meet:

- Performance score: `0.60` or higher
- LCP: `6,000 ms` or lower
- TBT: `600 ms` or lower

Every sample must meet the less-variable safeguards:

- Accessibility: `0.90` or higher
- Best Practices: `0.80` or higher
- SEO: `0.90` or higher
- CLS: `0.15` or lower
- Transfer size: `2,000,000 bytes` or lower

Every sample also fails if it requests an ambient MP4, GLB model, deferred Home runtime, decorative runtime, or Cloudflare Challenge Platform JavaScript before interaction.

`scripts/assert-lighthouse.mjs --aggregate=median` prints each sample plus min, median, 75th percentile and maximum summaries. `scripts/test-lighthouse-assert.mjs` protects the aggregation and strict single-report behaviours in the deterministic release suite.

## Edge-transformation safeguard

Public HTML intentionally returns `Cache-Control: public, no-cache, must-revalidate, no-transform`. Cloudflare documents that `no-transform` prevents automatic JavaScript Detections injection. Removing it previously added `/cdn-cgi/challenge-platform/.../jsd/main.js` to all five pages and dominated TBT on slower runners.

The release pipeline now prevents recurrence in two places:

- `scripts/verify-dist.mjs` verifies `no-transform` in the deployable `_headers` file.
- `scripts/smoke-production.mjs` verifies the live header and rejects injected Challenge Platform markup.

Do not remove `no-transform` or lower the Lighthouse thresholds merely to make an audit green.

## Manual use

Run the deterministic local release gate before publishing:

```bash
npm run test:ci
npm run test:ui
```

After production deployment, verify the strengthened smoke test and dispatch Lighthouse:

```bash
npm run smoke:production
gh workflow run lighthouse.yml --ref main
```

Inspect the resulting run and download all reports before changing application code. A median failure on the same runner is stronger evidence than a single isolated sample.
