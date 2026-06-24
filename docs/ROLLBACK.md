# Rollback

## Repository rollback

1. Identify the cleanup commit with `git log --oneline`.
2. Restore a single file with `git restore --source=<commit-before-cleanup> -- <path>`.
3. Restore a group of files only when the affected site is understood.
4. Rebuild and test before pushing.

## Cloudflare Pages rollback

Use the Cloudflare Pages deployment list for the affected project and roll back to the previous successful production deployment if a live issue appears.

## DNS rollback

Do not change DNS without recording the previous record type, name, target, TTL, proxy status, and owner. DNS rollback should be done from the Cloudflare dashboard or API with a screenshot or exported record list available.
