# Environment And Tracking Checklist

## Purpose

This checklist keeps production secrets, analytics IDs, consent decisions, and Content Security Policy changes explicit. It is safe to use before Cloudflare Pages updates, Google tag setup, Meta Pixel setup, or contact-form maintenance.

Do not paste secrets into source files, documentation commits, screenshots, GitHub issues, or chat logs.

## Cloudflare Pages Runtime

Project: `taiyzun-com`

Required for contact delivery:

- `ZEPTO_MAIL_API_KEY`
- `ZEPTO_MAIL_SENDER`
- `ZEPTO_MAIL_RECIPIENT`

Optional fallback:

- `FORMSPREE_ENDPOINT`

Optional Mailchimp opt-in:

- `MAILCHIMP_API_KEY`
- `MAILCHIMP_AUDIENCE_ID`
- `MAILCHIMP_SERVER_PREFIX`
- `MAILCHIMP_SUBSCRIBE_STATUS`
- `MAILCHIMP_OPT_IN_TAGS`
- `MAILCHIMP_MARKETING_PERMISSION_ID`

Safe defaults:

- Keep Mailchimp status as `pending` unless single opt-in is deliberately approved.
- Keep normal contact delivery independent from Mailchimp success.
- Keep environment variables in Cloudflare Pages project settings, not in source.

## Current Tracking State

- Meta domain verification is present in `index.html`.
- Meta Pixel loader files exist in `js/`, but are not loaded by public HTML.
- No active Google tag, Google Tag Manager, GA4, or Google Ads script is loaded by public HTML.
- Current Content Security Policy does not allow Google or Meta tracking endpoints.

This is the desired state until real IDs, privacy wording, consent behaviour, and CSP changes are approved.

## Required Before Google Tag Or GA4 Activation

- GA4 Measurement ID, usually `G-...`.
- Confirmation whether direct `gtag.js` or Google Tag Manager should be used.
- Google Tag Manager container ID, if GTM is chosen.
- Google Ads conversion ID and labels, only if paid ads are in use.
- Consent default behaviour by region.
- Privacy/cookie wording approved for public display.
- Test access to GA4 Realtime or DebugView.
- Lighthouse before/after baseline.

Do not activate both direct `gtag.js` and GTM unless there is a deliberate reason and duplicate events have been tested.

## Required Before Meta Pixel Activation

- Confirmed Meta Pixel or Dataset ID.
- Confirmation that `taiyzun.com` remains connected to the correct verified Meta domain.
- Consent/privacy wording approved for Meta tracking.
- Decision on whether automatic matching or advanced matching is allowed.
- Test access to Meta Events Manager/Test Events.
- Lighthouse before/after baseline.

Do not send names, email addresses, message text, phone numbers, or private contact data through browser events.

## Safe Event Payload Rules

Allowed:

- Route name.
- Public gallery category.
- Public image id where already exposed in share URLs.
- Social platform name.
- Video id where already public.
- Feature readiness state such as `odyssey_3d_ready`.

Not allowed:

- Visitor name.
- Email address.
- Contact form message.
- Phone number.
- Private notes.
- Payment, banking, revenue, or document identifiers.
- Any raw text that may contain personal data.

## Validation Commands

Run before and after any tracking or backend-adjacent change:

```bash
npm run test:safe
npm run build
find functions js scripts -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \) | sort | while read -r file; do node --check "$file"; done
node scripts/validate-pages.js
npm audit --omit=dev
git diff --check
```

For rendered checks:

- `/`
- `/creations`
- `/odyssey`
- `/connect`
- mobile `390 x 844`
- desktop `1440 x 900`

For tracking checks after activation:

- Browser console has no CSP errors.
- Network panel shows exactly the intended Google/Meta endpoints.
- GA4 DebugView or Realtime receives test events.
- Meta Events Manager/Test Events receives test events.
- Lighthouse Performance and Best Practices do not regress materially.

## Rollback

If analytics or pixels cause errors, privacy concerns, duplicate events, or performance regressions:

```bash
git revert <tracking-commit>
npm run test:safe
npm run build
node scripts/validate-pages.js
git push origin main
```

Do not loosen CSP broadly to hide a tracking failure. Revert first, then rework the tracking implementation narrowly.
