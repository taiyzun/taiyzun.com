# Lighthouse Audit

## Verification Snapshot

- Last verified: 2026-07-05 03:51 IST.
- Repository: `https://github.com/taiyzun/taiyzun.com`
- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Latest inspected run: `28717350186`
- Latest inspected job: `85160999063`
- Latest inspected commit: `38eced3b4b78ca12afd06d1f60a6672bf2c8de92`
- Artifact downloaded: `lighthouse-report`
- Report file: `lighthouse-odyssey.json`

## Workflow Configuration

- Trigger: push to `main` and `master`.
- Scheduled trigger: Monday at `02:00 UTC`.
- Manual trigger: `workflow_dispatch`.
- Permissions: `contents: read`.
- Runner: `ubuntu-latest`.
- Checkout action: `actions/checkout@v4`.
- Lighthouse target: `https://taiyzun.com/odyssey`.
- Lighthouse mode: mobile.
- Report output: `reports/lighthouse-odyssey.json`.
- Artifact upload: `actions/upload-artifact@v4`, artifact name `lighthouse-report`.
- Required repository secrets: none.
- PR comment/report step: none.
- GitHub Pages deployment assumption: none.

## Latest Workflow Result

- Status: `completed`
- Conclusion: `success`
- Job name: `lighthouse`
- Job conclusion: `success`
- Report fetch time: `2026-07-04T19:35:32.761Z`
- GitHub Actions URL: `https://github.com/taiyzun/taiyzun.com/actions/runs/28717350186`

Passed steps:

- Set up job
- Checkout repo
- Run Lighthouse (mobile)
- Upload Lighthouse report
- Print summary
- Post Checkout repo
- Complete job

## Lighthouse Result

GitHub Actions mobile `/odyssey` artifact:

- Performance: `96`
- Accessibility: `100`
- Best Practices: `100`
- SEO: `100`
- Agentic Browsing: `100`
- First Contentful Paint: `1.1 s`
- Largest Contentful Paint: `1.6 s`
- Speed Index: `3.8 s`
- Total Blocking Time: `160 ms`
- Time to Interactive: `1.6 s`
- Cumulative Layout Shift: `0`
- Total size: `127 KiB`

Fresh live mobile CLI checks:

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | Speed Index | TBT | TTI | CLS | Size |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- | --- | --- |
| `/odyssey` | 100 | 100 | 100 | 100 | 1.1 s | 1.7 s | 1.1 s | 0 ms | 1.7 s | 0 | 127 KiB |
| `/creations` | 95 | 100 | 100 | 100 | 1.8 s | 2.7 s | 2.1 s | 0 ms | 2.7 s | 0.01 | 211 KiB |

## Historical Issue Resolved

Earlier failed attempts showed this GitHub check-run annotation:

```text
The job was not started because your account is locked due to a billing issue.
```

The failure happened before checkout, setup, dependency installation, Lighthouse, and artifact upload.

The billing/payment issue was resolved outside the repository. No workflow code change was required for that billing lock.

## Cloudflare Edge Issue Resolved

A later Best Practices drop was caused by Cloudflare-injected JavaScript Detections:

```text
https://taiyzun.com/cdn-cgi/challenge-platform/scripts/jsd/main.js
```

The site code did not contain that script. Cloudflare injected it at the edge.

The current HTML cache policy intentionally includes:

```text
Cache-Control: public, no-cache, must-revalidate, no-transform
```

Current verification confirmed:

- `/odyssey` live HTML uses `no-transform`.
- Best Practices is `100`.
- The GitHub Actions Lighthouse workflow passes.

## Healthy Checks

- GitHub-hosted runner starts.
- Lighthouse mobile audit completes.
- Artifact upload completes.
- Accessibility is `100`.
- Best Practices is `100`.
- SEO is `100`.
- Agentic Browsing is `100`.
- Live mobile `/odyssey` TBT is `0 ms`.
- Live mobile `/odyssey` CLS is `0`.

## Remaining Warning

- `/creations` has optional optimisation opportunities in CSS and inline/gallery JavaScript.
- A desktop-only `/odyssey` Lighthouse run reported CLS `0.339` from the premium hero surface. This is not affecting the mobile CI gate, which reports CLS `0`.
- Keep `no-transform` on HTML responses unless there is a deliberate decision to allow Cloudflare HTML transformations or automatic edge script injection.

## Useful Inspection Commands

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
gh auth status
gh run list --workflow "Lighthouse Audit" --branch main --limit 5
gh run view 28717350186 --json status,conclusion,jobs,url,headSha,workflowName
gh run download 28717350186 --name lighthouse-report --dir /tmp/taiyzun-lighthouse
```

## Closeout Status

- GitHub CLI auth is valid.
- Latest Lighthouse Audit run passes.
- Latest CI `/odyssey` mobile score is healthy.
- No active CI blocker remains.
