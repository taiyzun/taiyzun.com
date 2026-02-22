const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Favicon sizes to generate
const sizes = [16, 32, 192, 512, 180]; // 180 for apple-touch-icon
const sourceImage = './assets/Portraits/optimized/taiyzun_shahpurwala-00001-w1200.avif';
const iconsDir = './assets/icons';

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateFavicons() {
  console.log('🎨 Starting favicon generation from portrait image...');
  
  try {
    for (const size of sizes) {
      const outputFile = path.join(iconsDir, `favicon-${size}x${size}.png`);
      
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'cover',
          position: 'center',
        })
        .png()
        .toFile(outputFile);
      
      console.log(`✅ Generated ${size}x${size} favicon: ${outputFile}`);
    }
    
    // Generate Apple Touch Icon (180x180)
    const appleIcon = path.join(iconsDir, 'apple-touch-icon.png');
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toFile(appleIcon);
    console.log(`✅ Generated Apple Touch Icon: ${appleIcon}`);
    
    // Generate Android Chrome icons (192x192 and 512x512)
    const android192 = path.join(iconsDir, 'android-chrome-192x192.png');
    await sharp(sourceImage)
      .resize(192, 192, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toFile(android192);
    console.log(`✅ Generated Android Chrome 192x192: ${android192}`);
    
    const android512 = path.join(iconsDir, 'android-chrome-512x512.png');
    await sharp(sourceImage)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toFile(android512);
    console.log(`✅ Generated Android Chrome 512x512: ${android512}`);
    
    console.log('\n✨ All favicons generated successfully!');
    console.log('📁 Favicons location: ./assets/icons/');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
