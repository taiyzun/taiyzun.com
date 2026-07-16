#!/usr/bin/env node

import fs from 'node:fs';

const reportPaths = process.argv.slice(2);
if (!reportPaths.length) {
  throw new Error('Usage: node scripts/assert-lighthouse.mjs REPORT.json [REPORT.json ...]');
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

const thresholds = {
  performance: numberFromEnv('MIN_PERFORMANCE', 0.9),
  accessibility: numberFromEnv('MIN_ACCESSIBILITY', 0.95),
  bestPractices: numberFromEnv('MIN_BEST_PRACTICES', 0.95),
  seo: numberFromEnv('MIN_SEO', 0.9),
  lcp: numberFromEnv('MAX_LCP_MS', 3000),
  cls: numberFromEnv('MAX_CLS', 0.1),
  tbt: numberFromEnv('MAX_TBT_MS', 300),
  bytes: numberFromEnv('MAX_TRANSFER_BYTES', 500000)
};

const failures = [];

for (const reportPath of reportPaths) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const label = `${report.finalDisplayedUrl || report.finalUrl || report.requestedUrl} (${report.configSettings?.formFactor || 'unknown'})`;
  const categories = report.categories || {};
  const audits = report.audits || {};
  const values = {
    performance: categories.performance?.score ?? 0,
    accessibility: categories.accessibility?.score ?? 0,
    bestPractices: categories['best-practices']?.score ?? 0,
    seo: categories.seo?.score ?? 0,
    lcp: audits['largest-contentful-paint']?.numericValue ?? Infinity,
    cls: audits['cumulative-layout-shift']?.numericValue ?? Infinity,
    tbt: audits['total-blocking-time']?.numericValue ?? Infinity,
    bytes: audits['total-byte-weight']?.numericValue ?? Infinity
  };

  const comparisons = [
    ['performance', values.performance, thresholds.performance, 'minimum'],
    ['accessibility', values.accessibility, thresholds.accessibility, 'minimum'],
    ['best practices', values.bestPractices, thresholds.bestPractices, 'minimum'],
    ['SEO', values.seo, thresholds.seo, 'minimum'],
    ['LCP', values.lcp, thresholds.lcp, 'maximum'],
    ['CLS', values.cls, thresholds.cls, 'maximum'],
    ['TBT', values.tbt, thresholds.tbt, 'maximum'],
    ['transfer bytes', values.bytes, thresholds.bytes, 'maximum']
  ];

  for (const [name, value, threshold, mode] of comparisons) {
    const passed = mode === 'minimum' ? value >= threshold : value <= threshold;
    if (!passed) {
      failures.push(`${label}: ${name} ${value} missed ${mode} ${threshold}`);
    }
  }

  const networkItems = audits['network-requests']?.details?.items || [];
  const initialVideoRequests = networkItems.filter((item) => /\.mp4(?:$|\?)/i.test(item.url || ''));
  if (initialVideoRequests.length) {
    failures.push(`${label}: ambient MP4 was requested before user interaction`);
  }
  const initialModelRequests = networkItems.filter((item) => /\.glb(?:$|\?)/i.test(item.url || ''));
  if (initialModelRequests.length) {
    failures.push(`${label}: 3D model was requested before user interaction`);
  }
  const initialHomeEnhancements = networkItems.filter((item) =>
    /\/(?:home-interactions|video-carousel)\.min\.js(?:$|\?)/i.test(item.url || '')
  );
  if (initialHomeEnhancements.length) {
    failures.push(`${label}: Home interaction or video runtime was requested before it became relevant`);
  }

  console.log(
    `PASS ${label}: perf=${values.performance.toFixed(2)} a11y=${values.accessibility.toFixed(2)} bp=${values.bestPractices.toFixed(2)} seo=${values.seo.toFixed(2)} LCP=${Math.round(values.lcp)}ms CLS=${values.cls.toFixed(4)} TBT=${Math.round(values.tbt)}ms bytes=${Math.round(values.bytes)}`
  );
}

if (failures.length) {
  console.error('\nLighthouse budget failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nLighthouse budgets passed.');
