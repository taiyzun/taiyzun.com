const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(
  __dirname,
  '..',
  'assets',
  'decorative',
  'TaiyZun ~ sword ~ logO ~ 2021 [2420x1452].png'
);
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
const imagesDir = path.join(__dirname, '..', 'assets', 'images');

// Alpha bounds measured from the supplied 2420 x 1452 artwork. The square
// derivative deliberately isolates the sword; every resize keeps aspect ratio.
const fullMark = { left: 241, top: 71, width: 1927, height: 1277 };
const swordMark = { left: 241, top: 71, width: 375, height: 1277 };
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

function squareSword(size, format = 'png') {
  const pipeline = sharp(sourceImage)
    .extract(swordMark)
    .resize({
      width: Math.round(size * 0.76),
      height: Math.round(size * 0.88),
      fit: 'contain',
      background: transparent,
      withoutEnlargement: true,
    })
    .extend({
      top: Math.round(size * 0.06),
      bottom: Math.round(size * 0.06),
      left: Math.round(size * 0.12),
      right: Math.round(size * 0.12),
      background: transparent,
    });

  return pipeline[format]({ quality: 92 });
}

async function writeSquareSword(size, outputFile, format = 'png') {
  await squareSword(size, format).toFile(outputFile);
  console.log(`Generated ${path.relative(path.join(__dirname, '..'), outputFile)}`);
}

async function generateBrandAssets() {
  console.log('Generating brand assets from the supplied 2021 sword logo...');

  for (const size of [16, 32]) {
    await writeSquareSword(size, path.join(iconsDir, `favicon-${size}x${size}.png`));
  }

  await writeSquareSword(180, path.join(iconsDir, 'apple-touch-icon.png'));
  await writeSquareSword(180, path.join(iconsDir, 'apple-touch-icon-180.png'));
  await writeSquareSword(192, path.join(iconsDir, 'android-chrome-192x192.png'));
  await writeSquareSword(512, path.join(iconsDir, 'android-chrome-512x512.png'));

  for (const size of [36, 52, 200, 400]) {
    await writeSquareSword(size, path.join(imagesDir, `Taiyzun-logo-${size}w.webp`), 'webp');
    await writeSquareSword(size, path.join(imagesDir, `Taiyzun-logo-${size}w.avif`), 'avif');
  }
  await writeSquareSword(400, path.join(imagesDir, 'Taiyzun-logo.png'));

  await sharp(sourceImage)
    .extract(fullMark)
    .resize({ width: 600, height: 360, fit: 'contain', background: transparent })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(imagesDir, 'Taiyzun-signature-600w.webp'));

  // Social, metadata and structured-preview consumers receive the supplied
  // transparent PNG byte-for-byte: no canvas, matte, crop or recompression.
  fs.copyFileSync(
    sourceImage,
    path.join(imagesDir, 'taiyzun-sword-logo-original-2021-v3.png')
  );

  console.log('Brand asset generation complete.');
}

generateBrandAssets().catch(error => {
  console.error('Brand asset generation failed:', error);
  process.exitCode = 1;
});
