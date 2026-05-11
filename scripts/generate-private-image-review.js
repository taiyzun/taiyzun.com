#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'assets', 'space-gallery-manifest.json');
const outDir = path.join(root, 'privacy-review');

const explicitRules = [
  [/\bex[-\s]?girlfriend\b/i, 'ex-girlfriend wording'],
  [/\bgirlfriend\b/i, 'girlfriend wording'],
  [/\bwife\b/i, 'wife wording'],
  [/\brelationship\b/i, 'relationship wording'],
  [/\bcouple\b/i, 'couple'],
  [/\bkiss(?:ed|ing)?\b/i, 'kissing'],
  [/\bromantic\b/i, 'romantic'],
  [/\blove poem\b/i, 'love poem'],
  [/\bwoman lying\b/i, 'woman lying'],
  [/\bwoman sleeping\b/i, 'woman sleeping'],
  [/\bwoman in bed\b/i, 'woman in bed'],
  [/\blying in bed\b/i, 'lying in bed'],
  [/\bon the bed\b/i, 'bed setting'],
  [/\bwhite dress\b/i, 'white dress'],
  [/\bred lit room\b/i, 'red-lit private room'],
  [/\bembrac(?:e|ing)\b/i, 'embrace']
];

const likelyRules = [
  [/\bwoman\b/i, 'woman'],
  [/\bgirl\b/i, 'girl'],
  [/\bfemale\b/i, 'female'],
  [/\blady\b/i, 'lady'],
  [/\bblonde\b/i, 'blonde'],
  [/\bportrait\b/i, 'portrait'],
  [/\bselfie\b/i, 'selfie'],
  [/\bbedroom\b/i, 'bedroom'],
  [/\bsleeping\b/i, 'sleeping'],
  [/\bbed\b/i, 'bed'],
  [/\bdinner\b/i, 'dinner/private social setting'],
  [/\bbar\b/i, 'bar/private social setting'],
  [/\bfamily selfie\b/i, 'family selfie'],
  [/\btwo people\b/i, 'two people'],
  [/\bsmiling .*woman\b/i, 'smiling woman']
];

function flattenManifest(manifest) {
  return Object.entries(manifest).flatMap(([category, items]) => {
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => ({ category, index, ...item }));
  });
}

function classify(item) {
  const haystack = [item.name, item.title, item.full, item.thumb, item.category].filter(Boolean).join(' ');
  const explicit = explicitRules.filter(([rule]) => rule.test(haystack)).map(([, label]) => label);
  const likely = likelyRules.filter(([rule]) => rule.test(haystack)).map(([, label]) => label);

  if (!explicit.length && !likely.length) return null;

  const tier = explicit.length ? 'explicit' : 'likely';
  const score = explicit.length * 10 + likely.length * 2;
  return {
    tier,
    score,
    reasons: [...new Set([...explicit, ...likely])]
  };
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const candidates = flattenManifest(manifest)
  .map((item) => ({ item, match: classify(item) }))
  .filter((entry) => entry.match)
  .map(({ item, match }) => ({
    tier: match.tier,
    score: match.score,
    category: item.category,
    manifestIndex: item.index,
    name: item.name || item.title || '',
    reasons: match.reasons,
    thumb: item.thumb || item.full || '',
    full: item.full || item.thumb || ''
  }))
  .sort((left, right) => {
    if (left.tier !== right.tier) return left.tier === 'explicit' ? -1 : 1;
    return right.score - left.score || left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
  });

const summary = candidates.reduce((acc, item) => {
  acc.total += 1;
  acc[item.tier] += 1;
  acc.byCategory[item.category] = (acc.byCategory[item.category] || 0) + 1;
  return acc;
}, { total: 0, explicit: 0, likely: 0, byCategory: {} });

fs.mkdirSync(outDir, { recursive: true });

const generatedAt = new Date().toISOString();
const json = { generatedAt, source: 'assets/space-gallery-manifest.json', summary, candidates };
fs.writeFileSync(path.join(outDir, 'private-image-review.json'), JSON.stringify(json, null, 2));

const csvHeader = ['tier', 'score', 'category', 'manifestIndex', 'name', 'reasons', 'thumb', 'full'];
const csvRows = candidates.map((item) => csvHeader.map((key) => csvEscape(Array.isArray(item[key]) ? item[key].join('; ') : item[key])).join(','));
fs.writeFileSync(path.join(outDir, 'private-image-review.csv'), `${csvHeader.join(',')}\n${csvRows.join('\n')}\n`);

const cards = candidates.map((item, index) => `
  <article class="card ${htmlEscape(item.tier)}">
    <a href="${htmlEscape(item.full)}" target="_blank" rel="noopener noreferrer">
      <img src="${htmlEscape(item.thumb)}" alt="${htmlEscape(item.name)}" loading="lazy">
    </a>
    <div class="meta">
      <p class="rank">${String(index + 1).padStart(3, '0')} / ${htmlEscape(item.tier)} / score ${item.score}</p>
      <h2>${htmlEscape(item.name)}</h2>
      <p><strong>Category:</strong> ${htmlEscape(item.category)}</p>
      <p><strong>Reasons:</strong> ${htmlEscape(item.reasons.join(', '))}</p>
    </div>
  </article>`).join('\n');

const html = `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Taiyzun Private Image Review</title>
  <style>
    :root { color-scheme: light; --paper:#f4efe7; --ink:#1f1b17; --muted:#6f6254; --gold:#b28d58; --line:rgba(178,141,88,.22); }
    body { margin:0; font-family: Philosopher, DINPro, Optima, Georgia, serif; background:var(--paper); color:var(--ink); }
    header { position:sticky; top:0; z-index:2; padding:24px clamp(16px,4vw,48px); background:rgba(244,239,231,.92); border-bottom:1px solid var(--line); backdrop-filter:blur(18px); }
    h1 { margin:0 0 8px; font-size:clamp(28px,5vw,56px); font-weight:400; letter-spacing:-.04em; }
    p { color:var(--muted); line-height:1.55; }
    .summary { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
    .pill { border:1px solid var(--line); border-radius:999px; padding:8px 12px; background:rgba(255,255,255,.48); }
    main { padding:clamp(18px,4vw,48px); display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:18px; }
    .card { overflow:hidden; border:1px solid var(--line); border-radius:26px; background:linear-gradient(165deg,rgba(255,255,255,.82),rgba(246,240,232,.72)); box-shadow:0 18px 40px rgba(91,72,42,.1); }
    .card.explicit { border-color:rgba(151,82,56,.38); }
    img { display:block; width:100%; aspect-ratio:1; object-fit:contain; background:rgba(255,255,255,.54); }
    .meta { padding:16px; }
    .rank { margin:0 0 10px; text-transform:uppercase; letter-spacing:.16em; font-size:12px; color:var(--gold); }
    h2 { margin:0 0 12px; font-size:18px; line-height:1.25; font-weight:700; }
    strong { color:var(--ink); }
  </style>
</head>
<body>
  <header>
    <h1>Private Image Review</h1>
    <p>Generated from <code>assets/space-gallery-manifest.json</code>. This is a review pack only; it does not remove, hide, rename or delete any gallery image.</p>
    <div class="summary">
      <span class="pill">Total: ${summary.total}</span>
      <span class="pill">Explicit: ${summary.explicit}</span>
      <span class="pill">Likely: ${summary.likely}</span>
      <span class="pill">Generated: ${generatedAt}</span>
    </div>
  </header>
  <main>${cards}
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'private-image-review.html'), html);

console.log(`Private image review generated: ${summary.total} candidates (${summary.explicit} explicit, ${summary.likely} likely).`);
console.log('Outputs:');
console.log(' - privacy-review/private-image-review.json');
console.log(' - privacy-review/private-image-review.csv');
console.log(' - privacy-review/private-image-review.html');
