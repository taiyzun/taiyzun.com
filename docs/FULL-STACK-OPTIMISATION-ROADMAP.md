# Full Stack Optimisation Roadmap

## Verification Snapshot

- Date: 2026-07-05.
- Repository: `/Users/tai/Documents/GitHub/taiyzun.com`
- Active site: `https://taiyzun.com`
- Current branch: `main`
- Latest local commit at scan time: `f1989a605 docs: update final optimisation closeout`
- Current stack: Cloudflare Pages, Cloudflare Pages Functions, Cloudflare R2/custom asset domain for gallery media.
- Current build path: `npm run build`, using `scripts/build-cloudflare-pages.js`.
- Current public tracking state: Meta domain verification is present, but Google/Meta tracking scripts are not active on public pages.

This roadmap is intentionally a planning and sequencing document. It does not activate analytics, pixels, SEO experiments, Cloudflare settings, or production infrastructure changes.

## Current System State

### Frontend

- The public pages are static HTML with shared CSS and JavaScript bundles.
- `/odyssey` mobile performance is currently healthy after deferred 3D handling.
- `/creations` is the heaviest public surface because it supports a large remote gallery, lazy loading, share URLs, and a mobile lightbox.
- `/creations` now has both an extracted gallery controller and a critical first stylesheet with deferred full CSS loading on compact/mobile first load.
- Existing maintenance docs list `/creations` desktop intro CLS and future thumbnail work as the next measured performance opportunities.

### Backend

- `/api/contact` is implemented as a Cloudflare Pages Function.
- Contact delivery tries Zepto Mail first and Formspree as fallback.
- Optional Mailchimp opt-in is queued only after contact delivery and uses environment variables.
- Existing protection includes field validation and honeypot handling.
- No committed API keys, Mailchimp keys, Zepto keys, Cloudflare tokens, or contact exports were found in the inspected source paths.

### SEO

- Canonical URLs, Open Graph metadata, Twitter metadata, sitemap, robots, and JSON-LD are already present on the main public pages.
- Existing closeout docs record healthy Lighthouse SEO scores.
- Preview-host `X-Robots-Tag: noindex` rules are configured in `_headers` and must remain intact.
- HTML pages intentionally keep `Cache-Control: public, no-cache, must-revalidate, no-transform`.

### Tracking And Pixels

- `index.html` includes Meta domain verification.
- `js/facebook-pixel.js` and `js/facebook-pixel.min.js` exist and contain a Meta Pixel loader, but the current public HTML does not load them.
- No active Google tag, Google Tag Manager, GA4, or Google Ads conversion script was found in the current public page source.
- Current Content Security Policy does not allow Google tag domains or Meta Pixel domains. That is correct until there is an approved consent and tracking implementation.

## Official Guidance Checked

- Google consent mode for websites: `https://developers.google.com/tag-platform/security/guides/consent`
- Google Analytics event setup: `https://developers.google.com/analytics/devguides/collection/ga4/events`
- Google Tag Manager consent mode support: `https://support.google.com/tagmanager/answer/10718549`
- Meta Pixel setup: `https://developers.facebook.com/documentation/meta-pixel/get-started`
- Google SEO Starter Guide: `https://developers.google.com/search/docs/fundamentals/seo-starter-guide`
- Google structured data introduction and policies:
  - `https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data`
  - `https://developers.google.com/search/docs/appearance/structured-data/sd-policies`

## Priority 0 - Protect The Current Healthy State

Goal: keep the production baseline stable while future work is planned.

Safe actions:

- Preserve `_headers` preview `noindex` rules.
- Preserve `no-transform` HTML cache directives.
- Keep Cloudflare Pages as the deployment path.
- Keep R2/custom asset domain routing for gallery media.
- Keep GitHub Actions Lighthouse audit as the production performance gate.
- Keep tracking scripts inactive until consent, IDs, CSP, and privacy copy are all ready.

Do not touch without explicit approval:

- DNS.
- GoDaddy.
- Cloudflare production settings.
- R2 bucket settings.
- GitHub billing, secrets, environments, or branch protection.
- Third-party analytics or advertising scripts.
- Broad dependency upgrades.
- Broad visual redesign.

## Priority 1 - Measurement Architecture

Goal: prepare analytics in a way that is useful, privacy-aware, and fast.

Blocked until owner supplies or confirms:

- GA4 Measurement ID, usually `G-...`.
- Google Ads conversion ID and conversion labels, only if paid ads are actually being used.
- Google Tag Manager container ID, only if GTM is preferred over direct `gtag.js`.
- Confirmed Meta Pixel or Dataset ID.
- Consent/banner approach and privacy wording.
- Whether measurement should apply globally or only to selected pages.

Safe implementation approach after approval:

- Add one local analytics facade such as `js/taiyzun-analytics.js`.
- Track internal events first without sending to third parties until consent is known.
- Defer loading any third-party script until after consent and idle time where possible.
- Keep all events free of private message text, email addresses, names, phone numbers, and payment data.
- Use one approved route: either direct Google tag plus Meta Pixel, or GTM with consent settings. Do not run duplicate tags.
- Update CSP only for the exact domains required by the approved implementation.

Suggested event taxonomy:

| Event | Purpose | Notes |
| --- | --- | --- |
| `page_view` | Basic page measurement | Automatic if GA4 is active. |
| `gallery_open` | Image viewer engagement | No image text if it could expose private data. Use safe image id/category only. |
| `gallery_share` | Share button usage | Preserve current share button. |
| `video_play` | Homepage YouTube carousel engagement | Track only video id/category. |
| `contact_submit_success` | Successful form delivery | Do not send message body, name, or email. |
| `outbound_social_click` | Social profile click-through | Platform name only. |
| `odyssey_3d_ready` | 3D enhancement loaded | Useful for performance/experience correlation. |

Risk level: medium. Measurement changes can affect privacy, CSP, Lighthouse, and user trust.

## Priority 2 - Frontend Performance

Goal: reduce remaining weight without weakening the visual identity.

Recommended order:

1. Keep the completed `/creations` critical CSS split narrow; do not continue into broad CSS restructuring unless fresh metrics justify it.
2. Treat `/creations` desktop intro CLS as the next measured visual-performance target if desktop CLS becomes a formal gate.
3. Keep the extracted/minified `/creations` gallery controller under full interaction QA; do not continue into functional refactors unless fresh metrics justify it.
4. Add responsive thumbnail improvements only if Lighthouse or RUM shows image transfer pressure.
5. Keep desktop 3D rich, and keep mobile WebGL deferred/static on first load.
6. Continue using browser QA for carousel, gallery, lightbox, 3D, overflow, and reduced motion.

Do not do:

- Do not split CSS blindly.
- Do not remove gallery features to chase a score.
- Do not downgrade image quality in the lightbox.
- Do not make mobile load desktop WebGL immediately.

Risk level: medium, because `/creations` is interaction-heavy and public-facing.

## Priority 3 - Backend And Form Hardening

Goal: strengthen contact and marketing plumbing without blocking genuine enquiries.

Safe next steps:

- Add a documented Cloudflare Pages environment-variable checklist for Zepto, Formspree, Mailchimp, and future analytics IDs.
- Add a lightweight contact endpoint smoke test script that validates `POST only`, honeypot, invalid payload, and dry form behaviour without sending real enquiries.
- Consider Cloudflare Turnstile only after owner approval because it changes frontend UX and Cloudflare settings.
- Consider dashboard-side rate limiting only after owner approval because it is infrastructure configuration.
- Keep Mailchimp opt-in optional and separate from normal contact delivery.

Risk level: low for docs/tests, medium for Turnstile or rate limiting.

## Priority 4 - SEO And Structured Data

Goal: improve search clarity without keyword stuffing or speculative markup.

Safe next steps:

- Revalidate JSON-LD against visible page content.
- Add or refine `BreadcrumbList` where it matches visible navigation.
- Add `ImageObject` only where the public image is crawlable, relevant, and indexable.
- Keep page titles and descriptions human, concise, and specific.
- Confirm `/creations` share pages have useful social cards while preserving their current redirect/share behaviour.
- Keep AI crawler policy and preview noindex unchanged unless that is the specific task.

Do not do:

- Do not mark up hidden or misleading content.
- Do not add fake ratings, fake reviews, or unrelated schema.
- Do not change the brand voice only for keyword density.

Risk level: low to medium.

## Priority 5 - Google Tag, Google Ads, And Meta Pixel Activation

Goal: activate tracking only when it is clean, consent-aware, and verifiable.

Required approval package before implementation:

- Which Google route: GA4 direct, Google Tag Manager, Google Ads only, or GA4 plus Ads.
- Real GA4/GTM/Ads IDs.
- Real Meta Pixel/Dataset ID.
- Consent default behaviour by region.
- Privacy/cookie notice wording.
- Whether paid campaign conversion events are needed now.

Implementation sequence:

1. Add consent defaults before any Google or Meta measurement command.
2. Add the approved tag loader, deferred and gated where practical.
3. Update CSP for only the exact approved endpoints.
4. Wire the event taxonomy with PII-safe payloads.
5. Test in local browser, Tag Assistant, GA4 DebugView, and Meta Events Manager/Test Events.
6. Run Lighthouse before and after.
7. Push only if no performance, console, CSP, or privacy regression appears.

Risk level: medium-high. Pixels affect privacy, performance, CSP, and user trust.

## Priority 6 - Monitoring And Monthly Operations

Monthly checks:

- `gh auth status`
- latest GitHub Actions Lighthouse Audit
- `npm run build`
- JS syntax checks for `functions/`, `js/`, and `scripts/`
- `git diff --check`
- `node scripts/validate-pages.js`
- `npm audit --omit=dev`
- route checks for `/`, `/journey`, `/creations`, `/odyssey`, `/connect`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`
- browser QA on mobile and desktop
- Search Console coverage, sitemap, and page experience checks
- GA4/GTM/Meta event health only after tracking is intentionally activated
- contact form smoke test without exposing private data
- R2 gallery manifest and share index freshness

## Next Best Steps

1. Confirm the analytics route: direct Google tag or Google Tag Manager.
2. Provide the real GA4/GTM/Ads and Meta Pixel IDs, or confirm tracking should remain off.
3. Approve consent/privacy wording before any third-party tracker is loaded.
4. Run the `/creations` CSS and JavaScript ownership audit next.
5. Add backend smoke tests for `/api/contact`.
6. Revalidate JSON-LD and add only page-accurate structured data improvements.
7. After each change, build, validate, browser-test, commit, push, and confirm GitHub Actions.

## Rollback Method

```bash
cd /Users/tai/Documents/GitHub/taiyzun.com
git log --oneline -10
git revert <bad-commit>
npm run build
node scripts/validate-pages.js
git push origin main
```

If a tracking rollout causes a production issue, revert the tracking commit first. Do not loosen CSP broadly to hide the problem.

## Current Status

The current production state is healthy. The next optimisation phase should begin with measurement architecture and `/creations` performance ownership, while Google/Meta tracking remains inactive until approved IDs, consent behaviour, CSP updates, and privacy wording are ready.
