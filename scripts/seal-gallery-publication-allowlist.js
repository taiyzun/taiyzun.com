#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const {
  APPROVAL_PATH,
  entryFingerprint,
  publicationBlockReason
} = require('./gallery-publication-policy');

if (!process.argv.includes('--confirm-policy-audited')) {
  console.error('Refusing to approve gallery metadata without --confirm-policy-audited.');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const manifestPath = path.join(rootDir, 'assets', 'space-gallery-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const fingerprints = [];
const blockedCounts = new Map();

for (const [category, entries] of Object.entries(manifest)) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    const reason = publicationBlockReason(entry, category, { requireApproval: false });
    if (reason) {
      blockedCounts.set(reason, (blockedCounts.get(reason) || 0) + 1);
      continue;
    }
    fingerprints.push(entryFingerprint(entry));
  }
}

fingerprints.sort();
fs.mkdirSync(path.dirname(APPROVAL_PATH), { recursive: true });
fs.writeFileSync(APPROVAL_PATH, `${JSON.stringify({
  schema: 1,
  policyAuditedOn: new Date().toISOString().slice(0, 10),
  approvedCount: fingerprints.length,
  fingerprints
}, null, 2)}\n`);

console.log(`Sealed fail-closed gallery allowlist with ${fingerprints.length} policy-audited items.`);
for (const [reason, count] of [...blockedCounts].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`Withheld by ${reason}: ${count}`);
}
