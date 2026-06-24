#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { minify } = require('csso');

const rootDir = path.resolve(__dirname, '..');
const cssDir = path.join(rootDir, 'css');

const bundles = {
  'taiyzun-index.bundle.min.css': [
    'fonts.min.css',
    'design-principles.min.css',
    'white-theme.min.css',
    'padding-fix.css',
    'fctrylab-inspired.css',
    'ambient-video.css',
    'video-field.min.css',
    'site-decorative-field.css',
    'mily-inspired-system.css',
    'visual-protocol.min.css',
    'harmonic-ui.min.css',
    'gold-glam-ui.css',
    'mobile-menu.css',
    'taiyzun-3d-field.min.css'
  ],
  'taiyzun-journey.bundle.min.css': [
    'fonts.min.css',
    'design-principles.min.css',
    'white-theme.min.css',
    'padding-fix.css',
    'fctrylab-inspired.css',
    'ambient-video.css',
    'site-decorative-field.css',
    'mily-inspired-system.css',
    'visual-protocol.min.css',
    'harmonic-ui.min.css',
    'gold-glam-ui.css',
    'mobile-menu.css',
    'taiyzun-3d-field.min.css'
  ],
  'taiyzun-odyssey.bundle.min.css': [
    'fonts.min.css',
    'design-principles.min.css',
    'white-theme.min.css',
    'padding-fix.css',
    'gallery-visual-fix.css',
    'fctrylab-inspired.css',
    'vaulk-gallery-inspired.css',
    'ambient-video.css',
    'site-decorative-field.css',
    'mily-inspired-system.css',
    'visual-protocol.min.css',
    'harmonic-ui.min.css',
    'gold-glam-ui.css',
    'mobile-menu.css',
    'taiyzun-3d-field.min.css',
    'odyssey-portraits.css'
  ],
  'taiyzun-creations.bundle.min.css': [
    'fonts.min.css',
    'design-principles.min.css',
    'white-theme.min.css',
    'padding-fix.css',
    'gallery-visual-fix.css',
    'fctrylab-inspired.css',
    'vaulk-gallery-inspired.css',
    'ambient-video.css',
    'site-decorative-field.css',
    'mily-inspired-system.css',
    'visual-protocol.min.css',
    'harmonic-ui.min.css',
    'gold-glam-ui.css',
    'mobile-menu.css',
    'taiyzun-3d-field.min.css'
  ],
  'taiyzun-connect.bundle.min.css': [
    'fonts.min.css',
    'design-principles.min.css',
    'white-theme.min.css',
    'padding-fix.css',
    'fctrylab-inspired.css',
    'ambient-video.css',
    'site-decorative-field.css',
    'connect-refine.css',
    'mily-inspired-system.css',
    'visual-protocol.min.css',
    'harmonic-ui.min.css',
    'gold-glam-ui.css',
    'mobile-menu.css',
    'taiyzun-3d-field.min.css'
  ]
};

function readCss(fileName) {
  const filePath = path.join(cssDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing CSS source: css/${fileName}`);
  }

  return `\n/* css/${fileName} */\n${fs.readFileSync(filePath, 'utf8')}`;
}

for (const [bundleName, sources] of Object.entries(bundles)) {
  const bundleCss = sources.map(readCss).join('\n');
  const result = minify(bundleCss, { restructure: false });
  fs.writeFileSync(path.join(cssDir, bundleName), `${result.css}\n`);
  console.log(`Built css/${bundleName} from ${sources.length} files`);
}
