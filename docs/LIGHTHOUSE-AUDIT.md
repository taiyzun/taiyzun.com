# Lighthouse Audit

Last verified: 2026-06-24 14:08 IST.

## Scope

This document covers the remaining Tai GitHub Actions `Lighthouse Audit` issue only.

- Repository: `https://github.com/taiyzun/taiyzun.com`
- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Latest inspected run: `28069081061`
- Latest inspected attempt: `3`
- Latest inspected job: `83152107333`
- Latest inspected commit: `c31f8310be856a80a4f738062a44ae248b837a4a`

## Authentication status

`gh auth status` was refreshed and confirmed valid.

Required scopes are present:

- `repo`
- `workflow`
- `read:org`
- `gist`

## Current workflow review

The workflow currently:

- Runs on push to `main` and `master`.
- Runs weekly on Monday at `02:00 UTC`.
- Supports manual `workflow_dispatch`.
- Sets permissions to `contents: read`.
- Uses `actions/checkout@v4`.
- Runs Lighthouse mobile against `https://taiyzun.com/odyssey`.
- Writes JSON output to `reports/lighthouse-odyssey.json`.
- Uploads `reports/` using `actions/upload-artifact@v4`.
- Has no required repository secrets.
- Has no PR comment/report step.
- Has no build output assumption.
- Has no GitHub Pages deployment assumption.
- Uses `ubuntu-latest`.

## Confirmed result

Authenticated inspection of attempt `3` showed:

- Job name: `lighthouse`
- Job status: `completed`
- Job conclusion: `success`
- All workflow steps passed:
  - Set up job
  - Checkout repo
  - Run Lighthouse (mobile)
  - Upload Lighthouse report
  - Print summary
  - Post Checkout repo
  - Complete job
- Artifact downloaded: `lighthouse-report`
- Report file: `lighthouse-odyssey.json`
- Target URL: `https://taiyzun.com/odyssey`
- Report fetch time: `2026-06-24T08:37:05.498Z`
- Lighthouse mode: mobile
- Lighthouse scores:
  - Performance: `52`
  - Accessibility: `98`
  - Best Practices: `81`
  - SEO: `100`
  - Agentic Browsing: `100`

Earlier failed attempts showed this GitHub check-run annotation:

```text
The job was not started because your account is locked due to a billing issue.
```

## Root cause classification

Earlier failures happened before checkout, before setup, before dependency installation, before Lighthouse, and before artifact upload.

Confirmed root cause for earlier failed attempts:

- GitHub account billing lock.

Current status:

- Billing lock is cleared for the workflow.
- GitHub-hosted runner starts.
- Lighthouse audit passes.

Not indicated as root cause:

- `gh` authentication after refresh
- GitHub token permissions
- missing repository secrets
- workflow syntax
- invalid Node version
- missing package manager
- missing build output
- bad Lighthouse config
- unavailable URL
- bad working directory
- concurrency or caching issue
- unsupported action version
- private repository permissions
- branch protection or environment protection

## Minimal fix

No repository code or workflow change was required to clear the failure.

External action completed:

1. GitHub billing/payment method was updated.
2. Failed Lighthouse job was rerun.
3. Attempt `3` passed.

Use:

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
gh run view 28069081061 --json status,conclusion,jobs
```

If a future job starts and fails during a real workflow step, inspect that new step log and fix only the next direct cause.

## Remaining warning

GitHub emitted this non-failing annotation:

```text
Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/upload-artifact@v4.
```

The workflow passed, so no workflow change was made during this closeout.

## Useful inspection commands

```bash
gh auth status
gh run list --workflow "Lighthouse Audit" --branch main --limit 5
gh run view 28069081061 --json name,workflowName,conclusion,status,url,event,headBranch,headSha,jobs
gh run view 28069081061 --log-failed
gh api repos/taiyzun/taiyzun.com/check-runs/83099643589/annotations --jq '.[] | {path,title,message,annotation_level,start_line}'
gh api repos/taiyzun/taiyzun.com/actions/runs/28069081061/timing --jq '.'
```

## Current close-out status

- Active live sites are verified.
- Cleanup/deploy mission is complete.
- `gh` authentication is valid.
- The Lighthouse workflow file was inspected.
- Earlier failures were confirmed as a GitHub account billing lock.
- Attempt `3` passed after billing/payment update.
- No workflow code change was required.
- No production settings were changed.
