const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sourceImage = path.join(
  __dirname,
  '..',
  'assets',
  'images',
  'TaiyZun-Sword-logo-2026.png'
);
const iconsDir = path.join(__dirname, '..', 'assets', 'icons');
const imagesDir = path.join(__dirname, '..', 'assets', 'images');

// Alpha bounds measured from the final supplied 13999 x 10000 artwork. The square
// derivative deliberately isolates the sword; every resize keeps aspect ratio.
const swordMark = { left: 291, top: 560, width: 3500, height: 8897 };
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
  console.log('Generating brand assets from the final 2026 sword logo...');

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

  console.log('Brand asset generation complete.');
}

generateBrandAssets().catch(error => {
  console.error('Brand asset generation failed:', error);
  process.exitCode = 1;
});
