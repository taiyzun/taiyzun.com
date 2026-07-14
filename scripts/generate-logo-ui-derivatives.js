const path = require('node:path');
const sharp = require('sharp');

const imagesDirectory = path.join(__dirname, '..', 'assets', 'images');
const source = path.join(imagesDirectory, 'TaiyZun-Sword-logo-2026.png');
const widths = [384, 700, 1024];

async function generate() {
  const sourceMetadata = await sharp(source).metadata();
  if (!sourceMetadata.hasAlpha || sourceMetadata.width !== 13999 || sourceMetadata.height !== 10000) {
    throw new Error('Canonical TaiyZun logo dimensions or transparency changed; review before regenerating UI derivatives.');
  }

  for (const width of widths) {
    const output = path.join(imagesDirectory, `TaiyZun-Sword-logo-2026-ui-${width}.png`);
    await sharp(source, { failOn: 'error' })
      .resize({ width, fit: 'inside', withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, adaptiveFiltering: true, progressive: true })
      .toFile(output);

    const outputMetadata = await sharp(output).metadata();
    if (!outputMetadata.hasAlpha || outputMetadata.width !== width) {
      throw new Error(`Invalid transparent derivative generated at ${width}px.`);
    }
  }
}

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
