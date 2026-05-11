const FORM_ENDPOINT = 'https://formspree.io/f/mzzbvglv';
const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS
  });
}

function clean(value) {
  return String(value || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildZeptoPayload({ name, email, subject, message }, senderEmail, recipientEmail) {
  const effectiveSubject = subject || `New Contact Message from ${name}`;

  return {
    from: {
      address: senderEmail,
      name: 'Taiyzun Contact'
    },
    to: [
      {
        email_address: {
          address: recipientEmail,
          name: 'Taiyzun'
        }
      }
    ],
    reply_to: [
      {
        address: email,
        name
      }
    ],
    subject: effectiveSubject,
    htmlbody: `
      <div style="font-family:'Philosopher','DINPro','Optima','Trebuchet MS',sans-serif;color:#1a1a1a;background:#f8f7f5;padding:32px;max-width:640px;margin:0 auto;">
        <div style="border-bottom:2px solid #c9a84c;padding-bottom:18px;margin-bottom:24px;">
          <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#8a7642;">taiyzun.com</p>
          <h1 style="margin:10px 0 0;font-size:24px;font-weight:700;color:#1a1a1a;">New Contact Message</h1>
        </div>
        <p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 12px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}" style="color:#8a7642;">${escapeHtml(email)}</a></p>
        <p style="margin:0 0 20px;"><strong>Subject:</strong> ${escapeHtml(subject || 'General inquiry')}</p>
        <div style="background:#ffffff;border:1px solid rgba(201,168,76,0.28);border-left:4px solid #c9a84c;padding:20px;line-height:1.75;white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
    `,
    textbody: [
      'NEW CONTACT MESSAGE',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject || 'General inquiry'}`,
      '',
      message
    ].join('\n')
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendViaZepto(fields, env) {
  const apiKey = clean(env.ZEPTO_MAIL_API_KEY || env.ZEPTO_MAIL_KEY);
  const senderEmail = clean(env.ZEPTO_MAIL_SENDER || env.ZEPTO_MAIL_FROM);
  const recipientEmail = clean(env.ZEPTO_MAIL_RECIPIENT || env.CONTACT_RECIPIENT_EMAIL || env.CONTACT_EMAIL);

  if (!apiKey || !senderEmail || !recipientEmail) {
    return { available: false };
  }

  const response = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      Authorization: `Zoho-enczapikey ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(buildZeptoPayload(fields, senderEmail, recipientEmail))
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      available: true,
      ok: false,
      message: payload.message || 'Zepto Mail rejected the request.'
    };
  }

  return {
    available: true,
    ok: true,
    provider: 'zepto'
  };
}

async function sendViaFormspree(fields, env) {
  const endpoint = clean(env.FORMSPREE_ENDPOINT) || FORM_ENDPOINT;
  const body = new URLSearchParams({
    name: fields.name,
    email: fields.email,
    subject: fields.subject || 'General inquiry',
    message: fields.message,
    _subject: fields.subject || `New Contact Message from ${fields.name}`
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      message: payload.error || payload.message || 'Fallback delivery failed.'
    };
  }

  return {
    ok: true,
    provider: 'formspree'
  };
}

export async function onRequestPost(context) {
  const formData = await context.request.formData();
  const fields = {
    name: clean(formData.get('name')),
    email: clean(formData.get('email')),
    subject: clean(formData.get('subject') || formData.get('_subject')),
    message: clean(formData.get('message')),
    gotcha: clean(formData.get('_gotcha'))
  };

  if (fields.gotcha) {
    return json({ ok: true, message: 'Message sent. Thank you for reaching out — I will be in touch soon.' });
  }

  if (fields.name.length < 2 || !isValidEmail(fields.email) || fields.message.length < 10) {
    return json({ ok: false, message: 'Please complete the required fields with valid information.' }, 422);
  }

  const zeptoResult = await sendViaZepto(fields, context.env);
  if (zeptoResult.available && zeptoResult.ok) {
    return json({ ok: true, provider: zeptoResult.provider, message: 'Message sent. Thank you for reaching out — I will be in touch soon.' });
  }

  const fallbackResult = await sendViaFormspree(fields, context.env);
  if (fallbackResult.ok) {
    return json({ ok: true, provider: fallbackResult.provider, message: 'Message sent. Thank you for reaching out — I will be in touch soon.' });
  }

  return json({ ok: false, message: zeptoResult.message || fallbackResult.message || 'Message delivery failed.' }, 502);
}

export function onRequestGet() {
  return json({ ok: false, message: 'POST only.' }, 405);
}
