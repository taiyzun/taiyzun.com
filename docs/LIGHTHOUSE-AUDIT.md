# Lighthouse Audit

## Verification Snapshot

- Last verified: 2026-07-04 20:09 IST.
- Repository: `https://github.com/taiyzun/taiyzun.com`
- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Latest successful run: `28709437174`
- Latest inspected attempt: `2`
- Latest successful job: `85140595090`
- Latest inspected commit: `bd01659e86dc6f941c78d740ae83b4453946e0c7`
- Artifact downloaded: `lighthouse-report`
- Report file: `lighthouse-odyssey.json`
- Target URL: `https://taiyzun.com/odyssey`
- Mode: mobile

## Workflow Configuration

- Trigger: push to `main` and `master`.
- Scheduled trigger: Monday at `02:00 UTC`.
- Manual trigger: `workflow_dispatch`.
- Permissions: `contents: read`.
- Runner: `ubuntu-latest`.
- Checkout action: `actions/checkout@v7`.
- Lighthouse target: `https://taiyzun.com/odyssey`.
- Lighthouse mode: mobile.
- Report output: `reports/lighthouse-odyssey.json`.
- Artifact upload: `actions/upload-artifact@v7`, artifact name `lighthouse-report`.
- Required repository secrets: none.
- PR comment/report step: none.
- Build-output assumption: none.
- GitHub Pages deployment assumption: none.

## Latest Workflow Result

- Status: passed.
- Job name: `lighthouse`.
- Job status: `completed`.
- Job conclusion: `success`.
- Report fetch time: `2026-07-04T14:38:16.654Z`.
- Passed steps:
  - Set up job
  - Checkout repo
  - Run Lighthouse (mobile)
  - Upload Lighthouse report
  - Print summary
  - Post Checkout repo
  - Complete job

## Lighthouse Result

- Performance: `74`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- Agentic Browsing: `100`
- First Contentful Paint: `1.4 s`
- Largest Contentful Paint: `2.2 s`
- Speed Index: `2.8 s`
- Total Blocking Time: `1,180 ms`
- Cumulative Layout Shift: `0`
- Deprecated API warnings: none.

Local live Lighthouse after the same deploy measured Performance `95`, Best Practices `100`, and Total Blocking Time `0 ms`. The GitHub runner still shows Performance variance, so CI Performance remains a monitoring target even though the Best Practices blocker is resolved.

## Historical Issue Resolved

Earlier failed attempts showed this GitHub check-run annotation:

```text
The job was not started because your account is locked due to a billing issue.
```

The failure happened before checkout, before setup, before dependency installation, before Lighthouse, and before artifact upload.

The billing/payment issue was resolved outside the repository. After that, run `28069081061` was rerun and attempt `3` passed.

No repository code or workflow change was required to resolve the billing lock.

## Cloudflare Edge Issue Resolved

The later Best Practices `81` result was caused by Cloudflare-injected JavaScript Detections:

```text
https://taiyzun.com/cdn-cgi/challenge-platform/scripts/jsd/main.js
```

The site code did not contain that script. Cloudflare injected it at the edge.

The fix was to add `no-transform` to public HTML responses so Cloudflare serves page HTML without injecting edge scripts:

```text
Cache-Control: public, no-cache, must-revalidate, no-transform
```

Final live verification confirmed:

- `https://taiyzun.com/odyssey` returns `Cache-Control: public, no-cache, must-revalidate, no-transform`.
- Fresh HTML source no longer contains `challenge-platform`, `__CF$cv`, or `/cdn-cgi/challenge-platform/`.
- Cloudflare Bot Fight Mode was restored to ON after verification.

## Healthy Checks

- GitHub-hosted runner starts.
- Lighthouse mobile audit completes.
- Artifact upload completes.
- Accessibility is healthy.
- Best Practices is healthy.
- SEO is healthy.
- Agentic Browsing is healthy.

## Remaining Warning

- No active Best Practices, CI, or deployment blocker remains.
- GitHub-runner mobile Performance still varies; the latest inspected rerun is `74`, with TBT `1,180 ms`.

Keep `no-transform` on HTML responses unless there is a deliberate decision to allow Cloudflare HTML transformations or automatic Web Analytics script injection.

## Useful Inspection Commands

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
gh auth status
gh run list --workflow "Lighthouse Audit" --branch main --limit 5
gh run view 28709254967 --json status,conclusion,jobs,url,headSha
gh run download 28709254967 -n lighthouse-report -D /tmp/tai-lighthouse-report
curl -fsSI https://taiyzun.com/odyssey | grep -i cache-control
curl -fsSL https://taiyzun.com/odyssey | grep -E "challenge-platform|__CF|cdn-cgi" || true
```

If a future run fails during a real workflow step, inspect only that step log and fix only the direct cause.

## Closeout Status

- Cleanup/deploy mission is complete.
- `gh` authentication is valid.
- Earlier failures were confirmed as a GitHub account billing lock.
- Billing lock is cleared.
- The Cloudflare JavaScript Detections Lighthouse blocker is resolved.
- Latest Lighthouse Audit workflow passes.
- No active deployment blocker remains.
