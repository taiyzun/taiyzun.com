# Lighthouse Audit

## Verification Snapshot

- Last verified: 2026-06-24 14:08 IST.
- Repository: `https://github.com/taiyzun/taiyzun.com`
- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Previous failed run: `28069081061`
- Latest successful attempt: `3`
- Latest successful job: `83152107333`
- Latest inspected commit: `c31f8310be856a80a4f738062a44ae248b837a4a`

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
- Build-output assumption: none.
- GitHub Pages deployment assumption: none.

## Final Workflow Result

- Status: passed.
- Job name: `lighthouse`.
- Job status: `completed`.
- Job conclusion: `success`.
- Passed steps:
  - Set up job
  - Checkout repo
  - Run Lighthouse (mobile)
  - Upload Lighthouse report
  - Print summary
  - Post Checkout repo
  - Complete job

## Lighthouse Result

- Artifact downloaded: `lighthouse-report`.
- Report file: `lighthouse-odyssey.json`.
- Target URL: `https://taiyzun.com/odyssey`.
- Mode: mobile.
- Report fetch time: `2026-06-24T08:37:05.498Z`.
- Score handling: healthy checks and optimisation targets are separated below.

## Historical Issue Resolved

Earlier failed attempts showed this GitHub check-run annotation:

```text
The job was not started because your account is locked due to a billing issue.
```

The failure happened before checkout, before setup, before dependency installation, before Lighthouse, and before artifact upload.

The billing/payment issue was resolved outside the repository. After that, run `28069081061` was rerun and attempt `3` passed.

No repository code or workflow change was required to resolve the billing lock.

## Healthy Checks

- Accessibility: `98`
- SEO: `100`
- Agentic Browsing: `100`
- GitHub-hosted runner starts.
- Lighthouse mobile audit completes.
- Artifact upload completes.

## Next Optimisation Target

- Mobile Performance: `52`.
- Best Practices review: `81`.
- Review the downloaded Lighthouse JSON before changing performance-related code.
- Keep future performance work separate from deployment cleanup and infrastructure work.

## Remaining Warning

GitHub emitted this non-failing annotation:

```text
Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/upload-artifact@v4.
```

This is a future maintenance item, not a current failure.

## Useful Inspection Commands

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
gh auth status
gh run list --workflow "Lighthouse Audit" --branch main --limit 5
gh run view 28069081061 --json status,conclusion,attempt,jobs,url
gh run view 28069081061 --log-failed
```

If a future run fails during a real workflow step, inspect only that step log and fix only the direct cause.

## Closeout Status

- Cleanup/deploy mission is complete.
- `gh` authentication is valid.
- Earlier failures were confirmed as a GitHub account billing lock.
- Billing lock is cleared.
- Attempt `3` passed.
- No workflow code change was required.
- No production settings were changed.
