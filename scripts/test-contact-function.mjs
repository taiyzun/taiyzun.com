#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const contactSource = await readFile(new URL('../functions/api/contact.js', import.meta.url), 'utf8');
const contactModuleUrl = `data:text/javascript;base64,${Buffer.from(contactSource).toString('base64')}`;
const { onRequestGet, onRequestPost } = await import(contactModuleUrl);

const originalFetch = globalThis.fetch;
let outboundFetchCount = 0;
let outboundFetchHandler;

globalThis.fetch = async (...args) => {
  outboundFetchCount += 1;
  return outboundFetchHandler(...args);
};

function rejectUnexpectedFetch() {
  throw new Error('Unexpected outbound fetch during contact smoke test.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeContext(request, env = {}) {
  return {
    request,
    env,
    waitUntil(promise) {
      Promise.resolve(promise).catch(() => {});
    }
  };
}

function jsonRequest(payload) {
  return new Request('https://taiyzun.com/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

function formRequest(fields) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return new Request('https://taiyzun.com/api/contact', {
    method: 'POST',
    body: formData
  });
}

async function responseJson(response) {
  return response.json();
}

async function runCase(name, fn) {
  outboundFetchCount = 0;
  outboundFetchHandler = rejectUnexpectedFetch;
  await fn();
  console.log(`PASS ${name}`);
}

try {
  await runCase('GET is rejected as POST only', async () => {
    const response = onRequestGet();
    const body = await responseJson(response);

    assert(response.status === 405, `Expected 405, got ${response.status}`);
    assert(body.ok === false, 'Expected ok=false for GET.');
    assert(outboundFetchCount === 0, 'GET must not call outbound providers.');
  });

  await runCase('malformed JSON is rejected', async () => {
    const request = new Request('https://taiyzun.com/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json'
    });
    const response = await onRequestPost(makeContext(request));
    const body = await responseJson(response);

    assert(response.status === 400, `Expected 400, got ${response.status}`);
    assert(body.ok === false, 'Expected ok=false for malformed JSON.');
    assert(outboundFetchCount === 0, 'Malformed JSON must not call outbound providers.');
  });

  await runCase('invalid required fields are rejected', async () => {
    const response = await onRequestPost(makeContext(jsonRequest({
      name: 'T',
      email: 'not-an-email',
      message: 'short'
    })));
    const body = await responseJson(response);

    assert(response.status === 422, `Expected 422, got ${response.status}`);
    assert(body.ok === false, 'Expected ok=false for invalid fields.');
    assert(outboundFetchCount === 0, 'Invalid fields must not call outbound providers.');
  });

  await runCase('honeypot submissions are accepted without delivery', async () => {
    const response = await onRequestPost(makeContext(formRequest({
      name: 'Automated Sender',
      email: 'bot@example.com',
      subject: 'Automated Submission',
      message: 'This should be absorbed by the honeypot.',
      _gotcha: 'filled'
    })));
    const body = await responseJson(response);

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(body.ok === true, 'Expected honeypot response to look successful.');
    assert(outboundFetchCount === 0, 'Honeypot must not call outbound providers.');
  });

  await runCase('optional updates remain received when Mailchimp is not configured', async () => {
    outboundFetchHandler = async (url) => {
      assert(String(url) === 'https://api.zeptomail.com/v1.1/email', 'Expected Zepto delivery only.');
      return new Response(JSON.stringify({ request_id: 'test-delivery' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    };

    const response = await onRequestPost(makeContext(jsonRequest({
      name: 'Tai Test',
      email: 'tai.test@example.com',
      subject: 'Opt-in status test',
      message: 'This validates honest optional-update status reporting.',
      serious_enquiry_opt_in: 'yes'
    }), {
      ZEPTO_MAIL_API_KEY: 'test-key',
      ZEPTO_MAIL_SENDER: 'sender@example.com',
      ZEPTO_MAIL_RECIPIENT: 'recipient@example.com'
    }));
    const body = await responseJson(response);

    assert(response.status === 200, `Expected 200, got ${response.status}`);
    assert(body.ok === true, 'Expected successful contact delivery.');
    assert(body.provider === 'zepto', 'Expected Zepto delivery provider.');
    assert(body.followUp === 'received', 'Unconfigured Mailchimp must not be reported as queued.');
    assert(outboundFetchCount === 1, 'Unconfigured Mailchimp must not trigger an outbound request.');
  });

  await runCase('valid payload without providers fails safely without outbound delivery', async () => {
    const response = await onRequestPost(makeContext(jsonRequest({
      name: 'Tai Test',
      email: 'tai.test@example.com',
      subject: 'Smoke Test',
      message: 'This is a local smoke test with no provider environment configured.'
    })));
    const body = await responseJson(response);

    assert(response.status === 502, `Expected 502 without providers, got ${response.status}`);
    assert(body.ok === false, 'Expected ok=false when delivery providers are unavailable.');
    assert(body.message === 'Your message could not be sent just now. Please try again shortly or use one of the public channels below.', 'Expected a provider-neutral visitor message.');
    assert(outboundFetchCount === 0, 'Missing provider env must not call outbound providers.');
  });
} finally {
  globalThis.fetch = originalFetch;
}
