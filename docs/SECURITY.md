# Security

Last verified: 2026-06-24.

## Current posture

- Tai production dependency audit with `npm audit --omit=dev`: 0 vulnerabilities.
- Tai contact function expects mail credentials from environment variables, not committed source.
- R2 bucket CORS is read-only with GET and HEAD for matching site origins.
- Both active domains use Cloudflare nameservers from GoDaddy.

## Known follow-up

- Refresh GitHub CLI authentication before certifying private GitHub repository settings.
- Review GitHub branch protection for `main`.
- Keep root deployment folders free of private reports, setup notes, and local generated files.
- Do not commit `.env`, API tokens, R2 keys, Zepto keys, Cloudflare tokens, or contact exports.
