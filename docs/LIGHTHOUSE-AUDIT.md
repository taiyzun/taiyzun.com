# Lighthouse Audit

Last verified: 2026-06-24 13:51 IST.

## Scope

This document covers the remaining Tai GitHub Actions `Lighthouse Audit` issue only.

- Repository: `https://github.com/taiyzun/taiyzun.com`
- Workflow file: `.github/workflows/lighthouse.yml`
- Workflow name: `Lighthouse Audit`
- Branch: `main`
- Latest inspected run: `28069081061`
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

## Confirmed failure

Authenticated inspection showed:

- Job name: `lighthouse`
- Job status: `completed`
- Job conclusion: `failure`
- Recorded steps: none
- `gh run view 28069081061 --log-failed`: `log not found`
- GitHub timing API: `0 ms` billable runtime
- GitHub check-run annotation:

```text
The job was not started because your account is locked due to a billing issue.
```

## Root cause classification

The failure happens before checkout, before setup, before dependency installation, before Lighthouse, and before artifact upload.

Confirmed root cause:

- GitHub account billing lock.

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

No repository code or workflow change is the correct fix for the current failure.

Required external action:

1. Resolve the GitHub account billing lock in GitHub billing settings.
2. Re-run the failed Lighthouse job.

Use:

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
gh run rerun 28069081061 --failed
gh run view 28069081061 --json status,conclusion,jobs
```

If the job then starts and fails during a real workflow step, inspect that new step log and fix only the next direct cause.

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
- The failure is confirmed as a GitHub account billing lock.
- No workflow code change was made because the runner never starts.
- No production settings were changed.
