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

- Pending.

## Post-change verification

- Pending.
