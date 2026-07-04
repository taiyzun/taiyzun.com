# Final Deployment Closeout

## Verification Snapshot

- Last verified: 2026-07-04 20:02 IST.
- Scope: `taiyzun.com` and `taj-mahal-movie.com`.
- Source of CI status: authenticated GitHub CLI inspection of `taiyzun/taiyzun.com`.
- Source of Lighthouse result: downloaded `lighthouse-report` artifact from run `28709254967`.
- Latest Tai production deployment checked: Cloudflare Pages deployment `c4a1bd02-695f-4e4a-afab-241fe49d3508`.
- Latest Tai production commit verified: `2153015b3f1457662c35364fd16d3153a4b811b8`.

## Active Production Sites

1. `taiyzun.com`
   - Primary URL: `https://taiyzun.com/`
   - Secondary host: `https://www.taiyzun.com/`
   - Cloudflare Pages project: `taiyzun-com`
   - GitHub repository: `https://github.com/taiyzun/taiyzun.com`
   - Latest production commit verified: `2153015b3f1457662c35364fd16d3153a4b811b8`
   - R2 bucket: `taiyzun-gallery`
   - Asset host: `https://assets.taiyzun.com`

2. `taj-mahal-movie.com`
   - Primary URL: `https://www.taj-mahal-movie.com/`
   - Redirect host: `https://taj-mahal-movie.com/`
   - Cloudflare Pages project: `taj-mahal-movie-com`
   - GitHub repository: `https://github.com/taiyzun/taj-mahal-movie.com`
   - Latest production code commit verified during earlier closeout: `9d272e3e15eea8cb3119d447a717d49748212edc`
   - R2 bucket: `taj-mahal-movie-media`
   - Asset host: `https://assets.taj-mahal-movie.com`

## Cleanup Completed

- Active website cleanup/deploy mission completed before this final verification pass.
- Both active sites were cleaned, committed, pushed, deployed, and live-verified.
- Tai root deploy surface was cleaned of retired public artifacts.
- Taj root deploy surface was cleaned of public `README.md` exposure.
- Taj unknown routes were verified to return `404` during earlier closeout.
- Cloudflare Pages default hosts were verified with noindex behavior where reachable during earlier closeout.
- Final Tai pass added a narrow HTML header hardening fix only.

## Cloudflare / DNS Status

- `taiyzun.com` uses Cloudflare nameservers and resolves through Cloudflare.
- `taj-mahal-movie.com` uses Cloudflare nameservers and resolves through Cloudflare.
- Active Cloudflare Pages projects:
  - `taiyzun-com`
  - `taj-mahal-movie-com`
- Active Cloudflare R2 buckets:
  - `taiyzun-gallery`
  - `taj-mahal-movie-media`
- Old Cloudflare zones removed before this documentation pass:
  - `shahpurwala.net`
  - `tajmahalmovies.com`
- Historical DNS notes from final cleanup:
  - `shahpurwala.net` did not resolve during DNS spot-check.
  - `tajmahalmovies.com` resolved through GoDaddy parking/external DNS, not Cloudflare.
  - `ep0ch.org` resolved outside the active Cloudflare stack.

## GitHub Actions Status

- Repository: `taiyzun/taiyzun.com`
- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Latest successful run: `28709254967`
- Latest successful job: `85139941282`
- Latest successful commit: `2153015b3f1457662c35364fd16d3153a4b811b8`
- Final workflow status: passed.
- Workflow steps passed:
  - Set up job
  - Checkout repo
  - Run Lighthouse (mobile)
  - Upload Lighthouse report
  - Print summary
  - Post Checkout repo
  - Complete job

## Lighthouse Audit Result

- Artifact downloaded: `lighthouse-report`
- Report file: `lighthouse-odyssey.json`
- Target URL: `https://taiyzun.com/odyssey`
- Mode: mobile
- Report fetch time: `2026-07-04T14:28:55.302Z`
- Performance: `98`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- Agentic Browsing: `100`
- First Contentful Paint: `1.2 s`
- Largest Contentful Paint: `2.4 s`
- Speed Index: `1.2 s`
- Total Blocking Time: `0 ms`
- Cumulative Layout Shift: `0`

## Historical Issue Resolved

- Earlier failed attempts did not start the runner.
- Earlier check-run annotation: `The job was not started because your account is locked due to a billing issue.`
- The GitHub billing/payment issue was resolved outside the repository.
- After the billing lock cleared, workflow run `28069081061` was rerun and attempt `3` passed.
- A later Best Practices `81` result was caused by Cloudflare JavaScript Detections being injected at the edge.
- The Cloudflare edge-script issue was resolved by adding `no-transform` to public HTML `Cache-Control`.

## Current Health Summary

- Both active sites are live.
- Tai Lighthouse Audit workflow passes.
- Tai `/odyssey` mobile Lighthouse scores are healthy.
- Fresh live Tai `/odyssey` HTML no longer contains `challenge-platform`, `__CF$cv`, or `/cdn-cgi/challenge-platform/`.
- Tai `/odyssey` returns `Cache-Control: public, no-cache, must-revalidate, no-transform`.
- Cloudflare Bot Fight Mode was restored to ON after the header fix was verified.

## Remaining Warnings

- No active deployment blocker remains.
- Keep `no-transform` on Tai HTML pages unless Cloudflare HTML transformations or automatic Web Analytics script injection are deliberately approved.
- The existing untracked local `audits/` folder is not part of this deployed production state.

## Next Optimisation Targets

- Maintain Tai `/odyssey` mobile Performance at `95+`.
- Keep Best Practices at `100` by avoiding automatic third-party script injection on page HTML.
- Future optional performance work should focus only on measured issues from a fresh Lighthouse artifact.
- Keep future visual, SEO, Cloudflare, dependency, and DNS changes separate from this closeout.

## Rollback Method

### taiyzun.com

1. Identify the target rollback commit:

```bash
git -C /Users/tai/Documents/GitHub/taiyzun.com log --oneline -10
```

2. Revert the bad commit, rebuild, and push:

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
git revert <commit>
npm run build
git push origin main
```

3. Wait for Cloudflare Pages project `taiyzun-com` to deploy.
4. Verify `https://taiyzun.com/`, `https://taiyzun.com/odyssey`, `https://taiyzun.com/creations`, `robots.txt`, and `sitemap.xml`.

### taj-mahal-movie.com

1. Identify the target rollback commit:

```bash
git -C /Users/tai/Documents/GitHub/taj-mahal-movie.com log --oneline -10
```

2. Revert the bad commit and push:

```bash
cd /Users/tai/Documents/GitHub/taj-mahal-movie.com
git revert <commit>
git push origin main
```

3. Wait for Cloudflare Pages project `taj-mahal-movie-com` to deploy.
4. Verify `https://www.taj-mahal-movie.com/`, apex redirect, `robots.txt`, `sitemap.xml`, and unknown-route `404`.

## Monthly Maintenance Checklist

- Run `gh auth status` before any GitHub Actions investigation.
- Review the Tai `Lighthouse Audit` workflow result.
- Download and inspect the latest `lighthouse-report` artifact.
- Confirm Tai `/odyssey` still returns `Cache-Control: public, no-cache, must-revalidate, no-transform`.
- Confirm Tai `/odyssey` live source does not include `challenge-platform`, `__CF$cv`, or `/cdn-cgi/challenge-platform/`.
- Confirm Cloudflare Bot Fight Mode remains ON.
- Run `npm audit --omit=dev` in `/Users/tai/Documents/GitHub/taiyzun.com`.
- Run `npm run build` in `/Users/tai/Documents/GitHub/taiyzun.com`.
- Verify core Tai routes: `/`, `/odyssey`, `/creations`, `/robots.txt`, `/sitemap.xml`.
- Verify core Taj routes: `/`, `/robots.txt`, `/sitemap.xml`, unknown-route `404`.
- Confirm Cloudflare Pages still lists only `taiyzun-com` and `taj-mahal-movie-com` for active site hosting.
- Confirm R2 still lists only `taiyzun-gallery` and `taj-mahal-movie-media` for active media storage.
- Confirm no private docs, setup notes, local reports, `.env` files, `.DS_Store`, `CNAME`, or backup files are served publicly.
- Review GitHub branch protection and Dependabot status.
- Keep billing/payment changes manual and owner-approved.

## Final Status

Production deployment closeout is complete.

Both active sites are live.

The Tai Lighthouse Audit workflow passes.

No active deployment blocker remains.
