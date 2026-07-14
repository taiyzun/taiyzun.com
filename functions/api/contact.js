const SUCCESS_MESSAGE = 'Message sent. Thank you for reaching out — I will be in touch soon.';
const DEFAULT_MAILCHIMP_TAGS = ['Taiyzun Serious Enquiry', 'taiyzun.com'];
const JSON_HEADERS = {
  'content-type': 'application/json; charset=UTF-8',
  'cache-control': 'no-store'
};
const MAX_BODY_BYTES = 64 * 1024;
const FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 160,
  message: 5000
};
const UPSTREAM_TIMEOUT_MS = 10_000;

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

function isAllowedOrigin(request) {
  const origin = clean(request.headers.get('origin'));
  if (!origin) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'taiyzun.com' ||
      hostname === 'www.taiyzun.com' ||
      hostname === 'taiyzun-com.pages.dev' ||
      hostname.endsWith('.taiyzun-com.pages.dev');
  } catch (_) {
    return false;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isOptInValue(value) {
  return ['1', 'true', 'yes', 'on'].includes(clean(value).toLowerCase());
}

function splitCsv(value) {
  return clean(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getField(data, name) {
  if (!data) {
    return null;
  }

  if (typeof data.get === 'function') {
    return data.get(name);
  }

  return data[name] ?? null;
}

async function readContactData(request) {
  const contentType = clean(request.headers.get('content-type')).toLowerCase();
  const contentLength = Number(request.headers.get('content-length') || 0);
  const supportedType = contentType.includes('application/json') ||
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  if (!supportedType || (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES)) {
    return null;
  }

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => null);
    return payload && typeof payload === 'object' ? payload : null;
  }

  return request.formData().catch(() => null);
}

function mailchimpStatus(env) {
  const configured = clean(env.MAILCHIMP_SUBSCRIBE_STATUS).toLowerCase();
  if (configured === 'subscribed' || configured === 'pending') {
    return configured;
  }

  return 'pending';
}

function mailchimpServerPrefix(apiKey, env) {
  const configured = clean(env.MAILCHIMP_SERVER_PREFIX || env.MAILCHIMP_DC);
  if (configured) {
    return configured;
  }

  const keySuffix = apiKey.includes('-') ? apiKey.split('-').pop() : '';
  return clean(keySuffix);
}

function mailchimpBaseUrl(config) {
  return `https://${config.serverPrefix}.api.mailchimp.com/3.0`;
}

function base64(value) {
  if (typeof btoa === 'function') {
    return btoa(value);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value).toString('base64');
  }

  throw new Error('Base64 encoding is unavailable.');
}

function mailchimpHeaders(apiKey) {
  return {
    Authorization: `Basic ${base64(`taiyzun:${apiKey}`)}`,
    'content-type': 'application/json'
  };
}

function nameParts(name) {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');

  return { firstName, lastName };
}

function mailchimpConfig(env) {
  const apiKey = clean(env.MAILCHIMP_API_KEY || env.MC_API_KEY);
  const audienceId = clean(env.MAILCHIMP_AUDIENCE_ID || env.MAILCHIMP_LIST_ID);
  const serverPrefix = mailchimpServerPrefix(apiKey, env);
  const configuredTags = splitCsv(env.MAILCHIMP_OPT_IN_TAGS || env.MAILCHIMP_TAGS);
  const tags = configuredTags.length ? configuredTags : DEFAULT_MAILCHIMP_TAGS;
  const marketingPermissionId = clean(env.MAILCHIMP_MARKETING_PERMISSION_ID);

  return {
    available: Boolean(apiKey && audienceId && serverPrefix),
    apiKey,
    audienceId,
    serverPrefix,
    status: mailchimpStatus(env),
    tags,
    marketingPermissionId
  };
}

function buildMailchimpMemberPayload(fields, config) {
  const { firstName, lastName } = nameParts(fields.name);
  const mergeFields = {};

  if (firstName) {
    mergeFields.FNAME = firstName;
  }

  if (lastName) {
    mergeFields.LNAME = lastName;
  }

  const payload = {
    email_address: fields.email,
    status: config.status
  };

  if (Object.keys(mergeFields).length) {
    payload.merge_fields = mergeFields;
  }

  if (config.marketingPermissionId) {
    payload.marketing_permissions = [
      {
        marketing_permission_id: config.marketingPermissionId,
        enabled: true
      }
    ];
  }

  return payload;
}

function buildMailchimpTagPayload(tags) {
  return {
    tags: tags.map((name) => ({
      name,
      status: 'active'
    }))
  };
}

async function addMailchimpTags(memberId, config) {
  if (!memberId || !config.tags.length) {
    return { ok: true, tagged: false };
  }

  const response = await fetchWithTimeout(`${mailchimpBaseUrl(config)}/lists/${encodeURIComponent(config.audienceId)}/members/${encodeURIComponent(memberId)}/tags`, {
    method: 'POST',
    headers: mailchimpHeaders(config.apiKey),
    body: JSON.stringify(buildMailchimpTagPayload(config.tags))
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      tagged: false,
      message: payload.detail || payload.title || 'Mailchimp tag update failed.'
    };
  }

  return { ok: true, tagged: true };
}

async function addMailchimpOptIn(fields, env) {
  if (!fields.seriousEnquiryOptIn) {
    return { requested: false };
  }

  const config = mailchimpConfig(env);
  if (!config.available) {
    return { requested: true, available: false };
  }

  const response = await fetchWithTimeout(`${mailchimpBaseUrl(config)}/lists/${encodeURIComponent(config.audienceId)}/members`, {
    method: 'POST',
    headers: mailchimpHeaders(config.apiKey),
    body: JSON.stringify(buildMailchimpMemberPayload(fields, config))
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const alreadyExists = response.status === 400 && /exists/i.test(`${payload.title || ''} ${payload.detail || ''}`);
    return {
      requested: true,
      available: true,
      ok: alreadyExists,
      existing: alreadyExists,
      message: alreadyExists ? 'Mailchimp contact already exists.' : payload.detail || payload.title || 'Mailchimp contact add failed.'
    };
  }

  const tagResult = await addMailchimpTags(payload.id, config);
  return {
    requested: true,
    available: true,
    ok: tagResult.ok,
    provider: 'mailchimp',
    status: config.status,
    tagged: tagResult.tagged,
    message: tagResult.message
  };
}

async function recordOptionalMailchimpOptIn(fields, env) {
  try {
    const result = await addMailchimpOptIn(fields, env);
    if (result.requested && result.available && !result.ok) {
      console.warn('Optional Mailchimp opt-in failed after contact delivery.', {
        reason: result.message ? 'Mailchimp rejected the optional opt-in request.' : 'Unknown Mailchimp error.'
      });
    }
    return result;
  } catch (error) {
    console.warn('Optional Mailchimp opt-in threw after contact delivery.', {
      reason: error && error.message ? error.message : 'Unknown Mailchimp error.'
    });
    return { requested: true, available: true, ok: false };
  }
}

function queueOptionalMailchimpOptIn(fields, context) {
  if (!fields.seriousEnquiryOptIn) {
    return { requested: false };
  }

  const work = recordOptionalMailchimpOptIn(fields, context.env);
  if (typeof context.waitUntil === 'function') {
    context.waitUntil(work);
    return { requested: true, ok: true };
  }

  return work;
}

function buildDeliveryResponse(deliveryResult, mailchimpResult) {
  const body = {
    ok: true,
    provider: deliveryResult.provider,
    message: SUCCESS_MESSAGE
  };

  if (mailchimpResult.requested) {
    body.followUp = mailchimpResult.ok ? 'queued' : 'received';
  }

  return json(body);
}

function contactSubject(subject) {
  const base = clean(subject) || 'General inquiry';
  const prefixed = /^taiyzun contact:/i.test(base) ? base : `Taiyzun contact: ${base}`;

  return prefixed.length > 150 ? `${prefixed.slice(0, 147)}...` : prefixed;
}

function buildZeptoPayload({ name, email, subject, message, seriousEnquiryOptIn }, senderEmail, recipientEmail) {
  const effectiveSubject = contactSubject(subject);
  const optInLabel = seriousEnquiryOptIn ? 'Requested' : 'Not requested';

  return {
    from: {
      address: senderEmail,
      name: 'Taiyzun'
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
        <p style="margin:0 0 20px;"><strong>Serious enquiry follow-up:</strong> ${escapeHtml(optInLabel)}</p>
        <div style="background:#ffffff;border:1px solid rgba(201,168,76,0.28);border-left:4px solid #c9a84c;padding:20px;line-height:1.75;white-space:pre-wrap;">${escapeHtml(message)}</div>
      </div>
    `,
    textbody: [
      'NEW CONTACT MESSAGE',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject || 'General inquiry'}`,
      `Serious enquiry follow-up: ${optInLabel}`,
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

  let response;
  try {
    response = await fetchWithTimeout('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        Authorization: `Zoho-enczapikey ${apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(buildZeptoPayload(fields, senderEmail, recipientEmail))
    });
  } catch (_) {
    return {
      available: true,
      ok: false,
      message: 'Zepto Mail request failed before delivery.'
    };
  }

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
  const endpoint = clean(env.FORMSPREE_ENDPOINT);
  if (!endpoint) {
    return {
      available: false,
      ok: false,
      message: 'Fallback delivery is not configured.'
    };
  }

  const body = new URLSearchParams({
    name: fields.name,
    email: fields.email,
    subject: fields.subject || 'General inquiry',
    message: fields.message,
    _subject: fields.subject || `New Contact Message from ${fields.name}`
  });

  let response;
  try {
    response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body
    });
  } catch (_) {
    return {
      available: true,
      ok: false,
      message: 'Fallback delivery request failed.'
    };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      message: payload.error || payload.message || 'Fallback delivery failed.'
    };
  }

  return {
    available: true,
    ok: true,
    provider: 'formspree'
  };
}

export async function onRequestPost(context) {
  if (!isAllowedOrigin(context.request)) {
    return json({ ok: false, message: 'This form must be submitted from taiyzun.com.' }, 403);
  }

  const contactData = await readContactData(context.request);
  if (!contactData) {
    return json({ ok: false, message: 'Please submit the form again.' }, 400);
  }

  const optInValue = getField(contactData, 'serious_enquiry_opt_in') ?? getField(contactData, 'mailchimp_opt_in') ?? getField(contactData, 'newsletter_opt_in');
  const fields = {
    name: clean(getField(contactData, 'name')),
    email: clean(getField(contactData, 'email')),
    subject: clean(getField(contactData, 'subject') || getField(contactData, '_subject')),
    message: clean(getField(contactData, 'message')),
    gotcha: clean(getField(contactData, '_gotcha') || getField(contactData, 'company')),
    seriousEnquiryOptIn: isOptInValue(optInValue)
  };

  if (fields.gotcha) {
    return json({ ok: true, message: SUCCESS_MESSAGE });
  }

  const exceedsFieldLimit = Object.entries(FIELD_LIMITS).some(([name, limit]) => fields[name].length > limit);
  if (exceedsFieldLimit) {
    return json({ ok: false, message: 'Please shorten your submission and try again.' }, 413);
  }

  if (fields.name.length < 2 || !isValidEmail(fields.email) || fields.message.length < 10) {
    return json({ ok: false, message: 'Please complete the required fields with valid information.' }, 422);
  }

  const zeptoResult = await sendViaZepto(fields, context.env);
  if (zeptoResult.available && zeptoResult.ok) {
    const mailchimpResult = await queueOptionalMailchimpOptIn(fields, context);
    return buildDeliveryResponse(zeptoResult, mailchimpResult);
  }

  const fallbackResult = await sendViaFormspree(fields, context.env);
  if (fallbackResult.ok) {
    const mailchimpResult = await queueOptionalMailchimpOptIn(fields, context);
    return buildDeliveryResponse(fallbackResult, mailchimpResult);
  }

  return json({ ok: false, message: zeptoResult.message || fallbackResult.message || 'Message delivery failed.' }, 502);
}

export function onRequestGet() {
  return json({ ok: false, message: 'POST only.' }, 405);
}
