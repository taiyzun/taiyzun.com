# Deployment

Last verified: 2026-06-24.

For runtime secrets and future analytics setup, also use `docs/ENVIRONMENT-AND-TRACKING-CHECKLIST.md`.

## taiyzun.com

- Host: Cloudflare Pages
- Project: `taiyzun-com`
- Branch: `main`
- Build command: `npm run build:pages`
- Output directory: `dist`
- Build script: `scripts/build-cloudflare-pages.js`

The build copies only public HTML, CSS, JavaScript, selected assets, headers, redirects, sitemap, robots, manifest, and service worker files into `dist`.

### Contact form integrations

The public form in `connect.html` posts to `functions/api/contact.js`. Normal contact delivery remains Zepto Mail first, then Formspree fallback.

Required Cloudflare Pages production secrets for Zepto delivery:

- `ZEPTO_MAIL_API_KEY`
- `ZEPTO_MAIL_SENDER`: use the real domain sender `taiyzun@taiyzun.com`, not `noreply@taiyzun.com`.
- `ZEPTO_MAIL_RECIPIENT`

Optional fallback:

- `FORMSPREE_ENDPOINT`: full active Formspree endpoint. Do not rely on a hardcoded fallback id.

Optional Mailchimp opt-in is queued only after a contact message has already been delivered. On Cloudflare it uses `waitUntil` when available, so Mailchimp latency or failure should not block the normal contact response. Configure these Cloudflare Pages environment variables when the welcome path is ready:

- `MAILCHIMP_API_KEY`: Marketing API key.
- `MAILCHIMP_AUDIENCE_ID`: Audience/list id.
- `MAILCHIMP_SERVER_PREFIX`: API data center such as `us21`. Optional when the API key includes the `-us21` suffix.
- `MAILCHIMP_SUBSCRIBE_STATUS`: `pending` by default for double opt-in. Use `subscribed` only when single opt-in is approved.
- `MAILCHIMP_OPT_IN_TAGS`: comma-separated tags for segmentation and automation. Default: `Taiyzun Serious Enquiry,taiyzun.com`.
- `MAILCHIMP_MARKETING_PERMISSION_ID`: optional GDPR marketing permission id when the audience requires it.

In Mailchimp, create the welcome journey from the audience signup event or from the configured serious-enquiry tag. With `pending`, the journey should begin after the contact confirms the Mailchimp opt-in.

## taj-mahal-movie.com

- Host: Cloudflare Pages
- Project: `taj-mahal-movie-com`
- Branch: `main`
- Build command: `exit 0`
- Output directory: repository root

Because the Taj site deploys from the repository root, keep root files minimal. Do not add private notes, working drafts, local reports, or setup guides to the root of that repository.

## Required checks before push

- `git status --short --branch`
- Tai: `npm run build`
- Tai: `npm run test:safe`
- Tai: `node --check` for changed JavaScript and functions
- Tai: `node scripts/validate-pages.js`
- Taj: static route/header checks with `curl`
- Live verification after Cloudflare deploy completes
