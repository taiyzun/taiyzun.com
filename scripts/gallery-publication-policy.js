const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const APPROVAL_PATH = path.join(__dirname, 'data', 'gallery-publication-allowlist.json');

const KNOWN_WITHHELD_FINGERPRINTS = new Set([
  '6d6c6d9752685387c98d1921862202a1fb67bd29cd3129364294ff593c17592e',
  'c56eea0b8a0bcc756b37bdfe3bdc3231de6920938f8449b47dc93200b22f2326',
  'ba60c39c0243e1a68acf9e483deeaa68fd8ba2296b9138b2316c09e6a4bec329',
  'ab81031ece5293b8fbcd585982966aea9d7c6c79c5f6b01f9bdbbe0c034d84e1',
  'ca4eb07ad39111e3bcaadd084bf51c7abf5a70de5735f8449f1cca9bc8555860',
  '28e9b59ef2ede12211417ae215003197632a6b6ff97f1199c113d5872b848891',
  'a603d5822e97fde64d6966c029cf94d5c93e55d01fab6685ba1721475287af77',
  '4e98e30c97d2fc10aefbf3f645d72723fd887e7eb0a333f25498963340230978',
  '4b46ddecd8e87ce83dd8bfebf4dd42f48a2d9130fb29616c089dd0cdfd50f4f3'
]);

function loadApprovedFingerprints() {
  try {
    const parsed = JSON.parse(fs.readFileSync(APPROVAL_PATH, 'utf8'));
    return new Set(Array.isArray(parsed.fingerprints) ? parsed.fingerprints : []);
  } catch {
    return new Set();
  }
}

const APPROVED_FINGERPRINTS = loadApprovedFingerprints();

const BLOCK_RULES = [
  {
    id: 'review-category',
    pattern: /^(?:_Temp_Review|Curatorial Review)(?:\s|$)/i
  },
  {
    id: 'private-communications',
    pattern: /\b(?:whats\s*app|whatsapp|i\s*message|imessage|chat screenshot|conversation screenshot|message screenshot|message thread|text messages?|direct messages?|call logs?|call history|recent calls?|missed calls?|incoming calls?|outgoing calls?|voice calls?|facetime|voice ?mail|email screenshot|mail screenshot)\b/i
  },
  {
    id: 'identity-document',
    pattern: /\b(?:passport(?: photo| page)?|visa page|identity document|identity card|id card|aadhaar|aadhar|pan card)\b/i
  },
  {
    id: 'contact-document',
    pattern: /\b(?:contact cards?|address cards?|contact details|contact information|contact info|postal address|street address|home address|office address|address and phone|email address|e-mail address|phone number|telephone number|mobile number|business cards?|letterheads?)\b/i
  },
  {
    id: 'email-address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
  },
  {
    id: 'sensitive-health-context',
    pattern: /\b(?:counsell?ing|therapy session|medical record|health record|diagnosis|prescription)\b/i
  },
  {
    id: 'sensitive-financial-context',
    pattern: /(?=.*\b(?:bank|cheque|payment|amount|refund)\b)(?=.*\b(?:chat|screenshot|message|statement)\b)/i
  }
];

const TITLE_REPLACEMENTS = [
  [/\bTeh\b/g, 'the'],
  [/\bChristmass\b/gi, 'Christmas'],
  [/\bMesurements\b/gi, 'Measurements'],
  [/\bIi\b/g, 'II'],
  [/\bNamesis\b/gi, 'Nemesis'],
  [/\bAutum\b/gi, 'Autumn'],
  [/\bUnCondtional\b/g, 'Unconditional'],
  [/\bDont\b/g, 'Don’t'],
  [/\bCant\b/g, 'Can’t'],
  [/\bIsnt\b/g, 'Isn’t'],
  [/\bYoure\b/g, 'You’re'],
  [/\bTheres\b/g, 'There’s'],
  [/\bWomans\b/g, 'Woman’s'],
  [/\bGandhis\b/g, 'Gandhi’s'],
  [/\bChilds Shoe\b/g, 'Child’s Shoe'],
  [/\bCleopatras\b/g, 'Cleopatra’s'],
  [/\bInternational Womens Day\b/g, 'International Women’s Day'],
  [/\bMetatrons Cube\b/g, 'Metatron’s Cube'],
  [/\bValentines Day\b/g, 'Valentine’s Day'],
  [/\bMothers Day\b/g, 'Mother’s Day'],
  [/\bFathers Day\b/g, 'Father’s Day'],
  [/\bNew Years\b/g, 'New Year’s'],
  [/\bRubiks Cube\b/g, 'Rubik’s Cube'],
  [/\bColorful\b/g, 'Colourful'],
  [/\bColor\b/g, 'Colour'],
  [/\b3 D\b/g, '3D']
];

function entryText(entry, category = '') {
  return [category, entry && entry.name, entry && entry.title, entry && entry.full, entry && entry.thumb]
    .filter(Boolean)
    .join(' ');
}

function entryFingerprint(entry) {
  const identity = String((entry && (entry.full || entry.thumb || entry.name || entry.title)) || '');
  return crypto.createHash('sha256').update(identity).digest('hex');
}

function publicationBlockReason(entry, category = '', options = {}) {
  if (!entry || typeof entry !== 'object') return 'invalid-entry';
  if (entry.public === false || entry.private === true || entry.hidden === true) return 'explicitly-withheld';

  const fingerprint = entryFingerprint(entry);
  if (KNOWN_WITHHELD_FINGERPRINTS.has(fingerprint)) return 'known-sensitive-item';

  const text = entryText(entry, category);
  const match = BLOCK_RULES.find((rule) => rule.pattern.test(text));
  if (match) return match.id;

  if (options.requireApproval !== false && !APPROVED_FINGERPRINTS.has(fingerprint)) {
    return 'not-approved-for-publication';
  }

  return '';
}

function cleanGalleryTitle(value) {
  let title = String(value || '');
  for (const [pattern, replacement] of TITLE_REPLACEMENTS) {
    title = title.replace(pattern, replacement);
  }
  return title.replace(/\s+/g, ' ').trim();
}

function cleanEntry(entry) {
  const next = { ...entry };
  if (typeof next.name === 'string') next.name = cleanGalleryTitle(next.name);
  if (typeof next.title === 'string') next.title = cleanGalleryTitle(next.title);
  return next;
}

function publicEntries(entries, category = '', options = {}) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map(cleanEntry)
    .filter((entry) => !publicationBlockReason(entry, category, options));
}

function sanitizeManifest(manifest, options = {}) {
  const output = {};
  const excluded = [];
  let corrected = 0;
  let totalBefore = 0;

  for (const [category, entries] of Object.entries(manifest || {})) {
    if (!Array.isArray(entries)) continue;
    totalBefore += entries.length;
    output[category] = [];

    for (const original of entries) {
      const entry = cleanEntry(original);
      if (JSON.stringify(entry) !== JSON.stringify(original)) corrected += 1;
      const reason = publicationBlockReason(entry, category, options);
      if (reason) {
        excluded.push({
          reason,
          category,
          fingerprint: entryFingerprint(entry),
          entry
        });
        continue;
      }
      output[category].push(entry);
    }

    if (!output[category].length) delete output[category];
  }

  return {
    manifest: output,
    excluded,
    corrected,
    totalBefore,
    totalAfter: Object.values(output).reduce((sum, entries) => sum + entries.length, 0)
  };
}

module.exports = {
  APPROVAL_PATH,
  APPROVED_FINGERPRINTS,
  BLOCK_RULES,
  KNOWN_WITHHELD_FINGERPRINTS,
  cleanEntry,
  cleanGalleryTitle,
  entryFingerprint,
  publicationBlockReason,
  publicEntries,
  sanitizeManifest
};
