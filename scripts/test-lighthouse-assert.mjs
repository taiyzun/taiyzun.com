#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assertionScript = path.join(projectRoot, 'scripts', 'assert-lighthouse.mjs');
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taiyzun-lighthouse-assert-'));
const productionThresholds = {
  MIN_PERFORMANCE: '0.60',
  MIN_ACCESSIBILITY: '0.90',
  MIN_BEST_PRACTICES: '0.80',
  MIN_SEO: '0.90',
  MAX_LCP_MS: '6000',
  MAX_CLS: '0.15',
  MAX_TBT_MS: '600',
  MAX_TRANSFER_BYTES: '2000000'
};

function writeReport(name, options = {}) {
  const url = options.url || 'https://taiyzun.com/';
  const report = {
    requestedUrl: url,
    finalUrl: url,
    finalDisplayedUrl: url,
    configSettings: { formFactor: options.formFactor || 'mobile' },
    environment: { benchmarkIndex: options.benchmarkIndex || 3500 },
    categories: {
      performance: { score: options.performance ?? 0.9 },
      accessibility: { score: options.accessibility ?? 1 },
      'best-practices': { score: options.bestPractices ?? 1 },
      seo: { score: options.seo ?? 1 }
    },
    audits: {
      'largest-contentful-paint': { numericValue: options.lcp ?? 2000 },
      'cumulative-layout-shift': { numericValue: options.cls ?? 0 },
      'total-blocking-time': { numericValue: options.tbt ?? 0 },
      'total-byte-weight': { numericValue: options.bytes ?? 200000 },
      'network-requests': { details: { items: options.networkItems || [] } }
    }
  };
  const reportPath = path.join(fixtureRoot, `${name}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report));
  return reportPath;
}

function runAssertion(name, args, expectedStatus, expectedText) {
  const result = spawnSync(process.execPath, [assertionScript, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...productionThresholds }
  });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== expectedStatus || !output.includes(expectedText)) {
    throw new Error(
      `${name} failed: expected status ${expectedStatus} and text ${JSON.stringify(expectedText)}; got status ${result.status}\n${output}`
    );
  }
  console.log(`PASS ${name}`);
}

try {
  const passOne = writeReport('pass-one', { tbt: 100, benchmarkIndex: 4200 });
  const passTwo = writeReport('pass-two', { tbt: 300, benchmarkIndex: 3600 });
  const outlierOne = writeReport('outlier-one', { performance: 0.5, tbt: 2400, benchmarkIndex: 2200 });
  const outlierTwo = writeReport('outlier-two', { tbt: 1800, benchmarkIndex: 2300 });
  const accessibilityFailure = writeReport('accessibility-failure', { accessibility: 0.7 });
  const challengeFailure = writeReport('challenge-failure', {
    networkItems: [{ url: 'https://taiyzun.com/cdn-cgi/challenge-platform/scripts/jsd/main.js' }]
  });
  const mixedUrl = writeReport('mixed-url', { url: 'https://taiyzun.com/connect' });

  runAssertion(
    'median tolerates one fixed outlier',
    ['--aggregate=median', passOne, outlierOne, passTwo],
    0,
    '2/3 samples met performance, LCP and TBT budgets'
  );
  runAssertion(
    'median rejects a majority regression',
    ['--aggregate=median', passOne, outlierOne, outlierTwo],
    1,
    'only 1/3 samples met performance'
  );
  runAssertion(
    'stable budgets apply to every sample',
    ['--aggregate=median', passOne, accessibilityFailure, passTwo],
    1,
    'accessibility 0.7 missed minimum 0.9'
  );
  runAssertion(
    'forbidden network requests apply to every sample',
    ['--aggregate=median', passOne, challengeFailure, passTwo],
    1,
    'Cloudflare challenge JavaScript was injected'
  );
  runAssertion(
    'mixed URLs are rejected',
    ['--aggregate=median', passOne, mixedUrl, passTwo],
    1,
    'Aggregate contains mixed Lighthouse URLs'
  );
  runAssertion(
    'single-report mode remains strict',
    [outlierOne],
    1,
    'FAIL https://taiyzun.com/ (mobile)'
  );
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log('Lighthouse assertion tests passed.');
