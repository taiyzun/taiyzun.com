#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const contactSource = await readFile(new URL('../functions/api/contact.js', import.meta.url), 'utf8');
const contactModuleUrl = `data:text/javascript;base64,${Buffer.from(contactSource).toString('base64')}`;
const { onRequestGet, onRequestPost } = await import(contactModuleUrl);

const originalFetch = globalThis.fetch;
let outboundFetchCount = 0;

globalThis.fetch = async () => {
  outboundFetchCount += 1;
  throw new Error('Unexpected outbound fetch during contact smoke test.');
};

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
    assert(outboundFetchCount === 0, 'Missing provider env must not call outbound providers.');
  });
} finally {
  globalThis.fetch = originalFetch;
}
