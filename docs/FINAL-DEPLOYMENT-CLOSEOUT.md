# Final Deployment Closeout

## Verification Snapshot

- Last verified: 2026-06-24 14:08 IST.
- Scope: `taiyzun.com` and `taj-mahal-movie.com`.
- Documentation cleanup date: 2026-06-24.
- Source of CI status: authenticated GitHub CLI inspection of `taiyzun/taiyzun.com`.
- Source of Lighthouse result: downloaded `lighthouse-report` artifact from run `28069081061`, attempt `3`.

## Active Production Sites

1. `taiyzun.com`
   - Primary URL: `https://taiyzun.com/`
   - Secondary host: `https://www.taiyzun.com/`
   - Cloudflare Pages project: `taiyzun-com`
   - GitHub repository: `https://github.com/taiyzun/taiyzun.com`
   - Latest production code commit verified before documentation-only closeout: `c31f8310be856a80a4f738062a44ae248b837a4a`
   - R2 bucket: `taiyzun-gallery`
   - Asset host: `https://assets.taiyzun.com`

2. `taj-mahal-movie.com`
   - Primary URL: `https://www.taj-mahal-movie.com/`
   - Redirect host: `https://taj-mahal-movie.com/`
   - Cloudflare Pages project: `taj-mahal-movie-com`
   - GitHub repository: `https://github.com/taiyzun/taj-mahal-movie.com`
   - Latest production code commit verified before documentation-only closeout: `9d272e3e15eea8cb3119d447a717d49748212edc`
   - R2 bucket: `taj-mahal-movie-media`
   - Asset host: `https://assets.taj-mahal-movie.com`

## Cleanup Completed

- Active website cleanup/deploy mission completed before this documentation pass.
- Both active sites were cleaned, committed, pushed, deployed, and live-verified.
- Tai root deploy surface was cleaned of retired `CNAME`, `.htaccess`, `style.css.backup`, and `seo-keywords.md` public exposure.
- Taj root deploy surface was cleaned of public `README.md` exposure.
- Taj unknown routes were verified to return `404`.
- Cloudflare Pages default hosts were verified with noindex behavior where reachable.
- No code, DNS, Cloudflare, hosting, workflow, site content, or design changes were made during this documentation cleanup.

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
- Previous failed run: `28069081061`
- Latest successful attempt: `3`
- Latest successful job: `83152107333`
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
- Report fetch time: `2026-06-24T08:37:05.498Z`
- Score handling: healthy checks and optimisation targets are separated below.

## Historical Issue Resolved

- Earlier failed attempts did not start the runner.
- Earlier check-run annotation: `The job was not started because your account is locked due to a billing issue.`
- The GitHub billing/payment issue was resolved outside the repository.
- After the billing lock cleared, workflow run `28069081061` was rerun and attempt `3` passed.
- No repository code or workflow change was required to resolve the billing lock.

## Current Health Summary

- Both active sites are live.
- Tai Lighthouse Audit workflow passes.
- Healthy Lighthouse checks:
  - Accessibility: `98`
  - SEO: `100`
  - Agentic Browsing: `100`
- Live spot checks from the final CI closeout returned `200` for:
  - `https://taiyzun.com/`
  - `https://taiyzun.com/odyssey`
  - `https://taiyzun.com/creations`
- Earlier final cleanup checks returned `200` for:
  - `https://www.taj-mahal-movie.com/`
  - `https://www.taj-mahal-movie.com/robots.txt`
  - `https://www.taj-mahal-movie.com/sitemap.xml`

## Remaining Warnings

- GitHub emitted a non-failing Actions runtime warning:

```text
Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/upload-artifact@v4.
```

- This is a future maintenance item, not a current deployment blocker.

## Next Optimisation Targets

- Mobile Lighthouse Performance for `https://taiyzun.com/odyssey`: `52`.
- Lighthouse Best Practices for `https://taiyzun.com/odyssey`: `81`.
- Review performance opportunities from the Lighthouse JSON artifact before making any optimisation changes.
- Keep optimisation changes separate from deployment, DNS, or infrastructure cleanup work.

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
4. Verify `https://taiyzun.com/`, `https://taiyzun.com/creations`, `robots.txt`, and `sitemap.xml`.

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
- Review GitHub Actions runtime warnings, especially Node runtime deprecation notices.
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
