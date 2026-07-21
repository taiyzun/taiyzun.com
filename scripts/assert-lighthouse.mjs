#!/usr/bin/env node

import fs from 'node:fs';

const cliArgs = process.argv.slice(2);
const aggregateArgs = cliArgs.filter((argument) => argument.startsWith('--aggregate='));
const unknownOptions = cliArgs.filter((argument) => argument.startsWith('--') && !argument.startsWith('--aggregate='));
if (unknownOptions.length || aggregateArgs.length > 1) {
  throw new Error(`Unsupported Lighthouse assertion option: ${unknownOptions[0] || aggregateArgs[1]}`);
}

const aggregateMode = aggregateArgs[0]?.split('=')[1] || null;
if (aggregateMode && aggregateMode !== 'median') {
  throw new Error(`Unsupported Lighthouse aggregation mode: ${aggregateMode}`);
}

const reportPaths = cliArgs.filter((argument) => !argument.startsWith('--'));
if (!reportPaths.length) {
  throw new Error('Usage: node scripts/assert-lighthouse.mjs [--aggregate=median] REPORT.json [REPORT.json ...]');
}
if (aggregateMode && (reportPaths.length < 3 || reportPaths.length % 2 === 0)) {
  throw new Error('Median Lighthouse aggregation requires an odd number of at least three reports.');
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
const samples = [];

function passesThreshold(value, threshold, mode) {
  return mode === 'minimum' ? value >= threshold : value <= threshold;
}

function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  const p75 = sorted[Math.max(0, Math.ceil(sorted.length * 0.75) - 1)];
  return { min: sorted[0], median, p75, max: sorted[sorted.length - 1] };
}

function formatSummary(summary, digits = 0) {
  const format = (value) => Number(value).toFixed(digits);
  return `min=${format(summary.min)} median=${format(summary.median)} p75=${format(summary.p75)} max=${format(summary.max)}`;
}

for (const reportPath of reportPaths) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const url = report.finalDisplayedUrl || report.finalUrl || report.requestedUrl || reportPath;
  const formFactor = report.configSettings?.formFactor || 'unknown';
  const label = `${url} (${formFactor})`;
  const categories = report.categories || {};
  const audits = report.audits || {};
  const reportFailures = [];
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

  if (report.runtimeError) {
    reportFailures.push(`${label}: Lighthouse runtime error ${report.runtimeError.code || report.runtimeError.message || 'unknown'}`);
  }

  const volatileComparisons = [
    ['performance', values.performance, thresholds.performance, 'minimum'],
    ['LCP', values.lcp, thresholds.lcp, 'maximum'],
    ['TBT', values.tbt, thresholds.tbt, 'maximum']
  ];
  const stableComparisons = [
    ['accessibility', values.accessibility, thresholds.accessibility, 'minimum'],
    ['best practices', values.bestPractices, thresholds.bestPractices, 'minimum'],
    ['SEO', values.seo, thresholds.seo, 'minimum'],
    ['CLS', values.cls, thresholds.cls, 'maximum'],
    ['transfer bytes', values.bytes, thresholds.bytes, 'maximum']
  ];
  const enforcedComparisons = aggregateMode
    ? stableComparisons
    : [...volatileComparisons, ...stableComparisons];

  for (const [name, value, threshold, mode] of enforcedComparisons) {
    if (!passesThreshold(value, threshold, mode)) {
      reportFailures.push(`${label}: ${name} ${value} missed ${mode} ${threshold}`);
    }
  }

  const networkItems = audits['network-requests']?.details?.items || [];
  const initialVideoRequests = networkItems.filter((item) => /\.mp4(?:$|\?)/i.test(item.url || ''));
  if (initialVideoRequests.length) {
    reportFailures.push(`${label}: ambient MP4 was requested before user interaction`);
  }
  const initialModelRequests = networkItems.filter((item) => /\.glb(?:$|\?)/i.test(item.url || ''));
  if (initialModelRequests.length) {
    reportFailures.push(`${label}: 3D model was requested before user interaction`);
  }
  const initialHomeEnhancements = networkItems.filter((item) =>
    /\/(?:home-interactions|video-carousel)\.min\.js(?:$|\?)/i.test(item.url || '')
  );
  if (initialHomeEnhancements.length) {
    reportFailures.push(`${label}: Home interaction or video runtime was requested before it became relevant`);
  }
  const initialDecorativeRuntime = networkItems.filter((item) =>
    /\/site-decorative-field\.min\.js(?:$|\?)/i.test(item.url || '')
  );
  if (initialDecorativeRuntime.length) {
    reportFailures.push(`${label}: decorative field was requested before user interaction`);
  }
  const cloudflareChallengeRequests = networkItems.filter((item) =>
    /\/cdn-cgi\/challenge-platform\//i.test(item.url || '')
  );
  if (cloudflareChallengeRequests.length) {
    reportFailures.push(`${label}: Cloudflare challenge JavaScript was injected into the HTML response`);
  }

  const volatilePassed = volatileComparisons.every(([name, value, threshold, mode]) =>
    passesThreshold(value, threshold, mode)
  );
  failures.push(...reportFailures);
  samples.push({
    reportPath,
    url,
    formFactor,
    values,
    benchmarkIndex: Number(report.environment?.benchmarkIndex),
    volatilePassed
  });

  const status = reportFailures.length
    ? 'FAIL'
    : aggregateMode
      ? `SAMPLE-${volatilePassed ? 'PASS' : 'OUTLIER'}`
      : 'PASS';
  console.log(
    `${status} ${label}: perf=${values.performance.toFixed(2)} a11y=${values.accessibility.toFixed(2)} bp=${values.bestPractices.toFixed(2)} seo=${values.seo.toFixed(2)} LCP=${Math.round(values.lcp)}ms CLS=${values.cls.toFixed(4)} TBT=${Math.round(values.tbt)}ms bytes=${Math.round(values.bytes)} benchmark=${Number.isFinite(Number(report.environment?.benchmarkIndex)) ? Math.round(Number(report.environment.benchmarkIndex)) : 'unknown'}`
  );
}

if (aggregateMode) {
  const urls = new Set(samples.map((sample) => sample.url));
  const formFactors = new Set(samples.map((sample) => sample.formFactor));
  if (urls.size !== 1) {
    failures.push(`Aggregate contains mixed Lighthouse URLs: ${[...urls].join(', ')}`);
  }
  if (formFactors.size !== 1) {
    failures.push(`Aggregate contains mixed Lighthouse form factors: ${[...formFactors].join(', ')}`);
  }

  const requiredPasses = Math.floor(samples.length / 2) + 1;
  const volatilePasses = samples.filter((sample) => sample.volatilePassed).length;
  const performance = summarize(samples.map((sample) => sample.values.performance));
  const lcp = summarize(samples.map((sample) => sample.values.lcp));
  const tbt = summarize(samples.map((sample) => sample.values.tbt));
  const benchmarkValues = samples
    .map((sample) => sample.benchmarkIndex)
    .filter((value) => Number.isFinite(value));

  console.log(`\nAGGREGATE ${samples[0].url} (${samples[0].formFactor}): ${volatilePasses}/${samples.length} samples met performance, LCP and TBT budgets; required ${requiredPasses}/${samples.length}`);
  console.log(`- performance: ${formatSummary(performance, 2)}`);
  console.log(`- LCP ms: ${formatSummary(lcp)}`);
  console.log(`- TBT ms: ${formatSummary(tbt)}`);
  if (benchmarkValues.length) {
    console.log(`- runner benchmark: ${formatSummary(summarize(benchmarkValues))}`);
  }

  if (volatilePasses < requiredPasses) {
    failures.push(
      `${samples[0].url} (${samples[0].formFactor}): only ${volatilePasses}/${samples.length} samples met performance >= ${thresholds.performance}, LCP <= ${thresholds.lcp}ms and TBT <= ${thresholds.tbt}ms; required ${requiredPasses}/${samples.length}`
    );
  }
}

if (failures.length) {
  console.error('\nLighthouse budget failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nLighthouse budgets passed.');
