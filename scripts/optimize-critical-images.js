const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const criticalImages = [
  'assets/images/Taiyzun-logo.png',
  'assets/easter-eggs/earth-mandala.png',
  'assets/easter-eggs/tainfinity.png',
  'assets/easter-eggs/stingray.png',
  'assets/easter-eggs/logo-white.png',
  'assets/easter-eggs/signature.png',
  'assets/easter-eggs/sword.png',
  'assets/easter-eggs/ganesh.png',
  'assets/easter-eggs/diya.png',
  'assets/easter-eggs/at-slogo.png',
  'assets/easter-eggs/star-polygon.png',
  'assets/easter-eggs/epoch.png',
  'assets/easter-eggs/hearts-line.png',
  'assets/easter-eggs/infinite-hearts.png',
];

async function optimizeImage(inputPath) {
  try {
    if (!fs.existsSync(inputPath)) {
      console.log(`[skip] ${inputPath} not found`);
      return;
    }

    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;
    const ext = path.extname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const dir = path.dirname(inputPath);

    // For logo, create multiple sizes
    if (baseName === 'Taiyzun-logo') {
      // Create sizes: 36px (header), 52px (footer), 200px (large)
      for (const size of [36, 52, 200]) {
        const outputPath = path.join(dir, `${baseName}-${size}w.webp`);
        await sharp(inputPath)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp({ quality: 90 })
          .toFile(outputPath);
        console.log(`[optimize] ${outputPath}`);

        // Also create AVIF
        const avifPath = path.join(dir, `${baseName}-${size}w.avif`);
        await sharp(inputPath)
          .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .avif({ quality: 85 })
          .toFile(avifPath);
      }
    } else {
      // For easter eggs, create at original size with optimization
      const webpPath = path.join(dir, `${baseName}.webp`);
      await sharp(inputPath)
        .webp({ quality: 85 })
        .toFile(webpPath);
      console.log(`[optimize] ${webpPath}`);

      const avifPath = path.join(dir, `${baseName}.avif`);
      await sharp(inputPath)
        .avif({ quality: 80 })
        .toFile(avifPath);
    }

    const newSize = fs.statSync(path.join(dir, `${baseName}.webp`)).size;
    const saved = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    console.log(`[size] ${baseName}: ${(originalSize / 1024 / 1024).toFixed(2)}M → ${(newSize / 1024).toFixed(0)}K (${saved}% saved)`);
  } catch (error) {
    console.error(`[error] ${inputPath}: ${error.message}`);
  }
}

async function main() {
  console.log('Optimizing critical images...\n');
  for (const img of criticalImages) {
    await optimizeImage(img);
  }
  console.log('\nCritical images optimization complete!');
}

main().catch(console.error);
