# Taiyzun Email Deliverability Audit

Snapshot taken: 2026-06-26 21:11 IST

Scope: `taiyzun.com`, `www.taiyzun.com`, ZeptoMail contact-form delivery, Google Workspace / Gmail Apps receiving and sending records, and related Cloudflare DNS trust signals.

## Pre-change DNS snapshot

Authoritative nameservers:

- `ingrid.ns.cloudflare.com`
- `wells.ns.cloudflare.com`

Root TXT records:

- `v=spf1 include:_spf.google.com -all`
- `google-site-verification=NfZCgSLZJJLVPQwlfV5Is0GtTRk_aDY68C0XeXyicRA`
- `google-site-verification=yl9l0yprxN2ciEL2ldzCYq5nSxlkxEPWrmtT7kEBTro`

MX records:

- `1 aspmx.l.google.com`
- `5 alt1.aspmx.l.google.com`
- `5 alt2.aspmx.l.google.com`
- `10 alt3.aspmx.l.google.com`
- `10 alt4.aspmx.l.google.com`

DMARC:

- `_dmarc.taiyzun.com TXT "v=DMARC1; p=reject; adkim=r; aspf=r;"`

Google Workspace DKIM:

- `google._domainkey.taiyzun.com TXT "v=DKIM1; k=rsa; p=..."`
- DNS record is present. Google Admin still needs to show that DKIM signing is enabled for the domain.

ZeptoMail DKIM:

- `2673527._domainkey.taiyzun.com TXT "k=rsa; p=..."`
- DNS record is present.

ZeptoMail bounce / return path:

- `bounce-zem.taiyzun.com CNAME cluster89.zeptomail.com`
- DNS record is present.

Web and `www`:

- `taiyzun.com` resolves through Cloudflare IPv4 and IPv6.
- `www.taiyzun.com` resolves through Cloudflare IPv4 and IPv6.
- `https://taiyzun.com` returns HTTP 200 with HSTS and security headers.
- `https://www.taiyzun.com` returns HTTP 200 with HSTS and security headers.

CAA:

- No CAA record found.
- This is not an email-deliverability fault.

## Initial findings

- Google MX is correctly pointed at Google Workspace / Gmail.
- Google Workspace DKIM DNS is published under selector `google`.
- ZeptoMail DKIM DNS is published under selector `2673527`.
- ZeptoMail bounce CNAME is published and points to `cluster89.zeptomail.com`.
- There is one root SPF record, which avoids the common duplicate-SPF failure.
- The SPF record currently uses `-all`. This is strict and can be fine only when every legitimate sender is fully known and aligned. For this mixed Google Workspace plus ZeptoMail setup, a softer Google-style `~all` is the safer reversible setting unless the Zepto dashboard explicitly requires a different SPF record.
- DMARC exists with `p=reject` and relaxed SPF/DKIM alignment. This is valid, but there are no aggregate report addresses. That limits monitoring of future authentication failures.
- The live contact form is configured to send through ZeptoMail from `taiyzun@taiyzun.com` to `taiyzun@gmail.com`.

## Change log

- Edited Cloudflare DNS root SPF TXT:
  - From: `v=spf1 include:_spf.google.com -all`
  - To: `v=spf1 include:_spf.google.com ~all`
  - Reason: keep Google Workspace authorised while avoiding an overly strict hard-fail posture during the current Google Workspace plus ZeptoMail setup.
- Left ZeptoMail out of the root SPF record intentionally.
  - ZeptoMail currently asks this domain for DKIM and bounce / return-path CNAME records, not a root SPF include.
  - The ZeptoMail dashboard shows both required records as verified.
  - Adding an unrequested Zepto SPF include would increase SPF complexity without improving the current authenticated Zepto path.
- Added explicit ZeptoMail sender address:
  - `taiyzun@taiyzun.com`
  - Associated agent: `taiyzun_contact`
- Created a Gmail filter in `taiyzun@gmail.com`:
  - Match: `from:(taiyzun@taiyzun.com)`
  - Actions: never send to Spam; mark as important.
  - Applied to existing matching conversations when Gmail offered that option.
- Hardened `functions/api/contact.js`:
  - The live contact form still accepts the normal browser `FormData` submission.
  - JSON submissions now return controlled JSON responses instead of causing a Cloudflare 1101 exception.
  - The honeypot also recognises `_gotcha` and `company`.
- Committed and deployed:
  - `957fc5bb9 fix(contact): harden delivery endpoint and mail audit`

## Post-change verification

- Authoritative Cloudflare DNS now returns:
  - `v=spf1 include:_spf.google.com ~all`
- Default resolver also returns:
  - `v=spf1 include:_spf.google.com ~all`
- MX records still point to Google Workspace / Gmail.
- Google DKIM TXT still exists at:
  - `google._domainkey.taiyzun.com`
- DMARC still exists at:
  - `_dmarc.taiyzun.com TXT "v=DMARC1; p=reject; adkim=r; aspf=r;"`
- ZeptoMail DKIM still exists and is verified:
  - `2673527._domainkey.taiyzun.com`
- ZeptoMail bounce / return-path CNAME still exists and is verified:
  - `bounce-zem.taiyzun.com CNAME cluster89.zeptomail.com`
- ZeptoMail dashboard status:
  - `taiyzun.com` verified.
  - `taiyzun_contact` associated with `taiyzun.com`.
  - `taiyzun@taiyzun.com` listed as a sender address for `taiyzun.com`.
  - Latest production contact-form test from `taiyzun@taiyzun.com` to `taiyzun@gmail.com` was `Delivered`.
  - Recent ZeptoMail overview showed 11 sent, 11 delivered, 0 soft bounces, 0 hard bounces and 0 process failures.
  - Suppression list showed no visible suppressed email addresses.
  - Bounce reports showed no bounces in the last 30 days.
- Live contact endpoint:
  - Form-style POST returned HTTP 200 with provider `zepto`.
  - JSON honeypot POST returned HTTP 200 without sending another email.
- Website and `www`:
  - `https://taiyzun.com` returns HTTP 200.
  - `https://www.taiyzun.com` returns HTTP 200.
  - Both are behind Cloudflare and return HSTS / security headers.

## Manual follow-up

- Google Admin console asked for a fresh Google sign-in when opening the Gmail DKIM authentication screen.
- DNS proves the Google DKIM TXT record is published, but an admin still needs to confirm inside Google Admin that DKIM signing is enabled / started for `taiyzun.com`.
- The visible personal Gmail account `taiyzun@gmail.com` does not currently list `taiyzun@taiyzun.com` under "Send mail as". If mail should be sent from the personal Gmail interface as `taiyzun@taiyzun.com`, add that sender identity through Gmail settings or use the actual Google Workspace mailbox for `taiyzun.com`.
- Consider adding a DMARC aggregate report address later, but only after confirming where reports should be received. It was not added during this pass to avoid routing large automated reports into the wrong mailbox.
