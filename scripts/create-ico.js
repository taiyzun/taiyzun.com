const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create favicon.ico from 32x32 PNG
async function createICO() {
  try {
    const pngFile = './assets/icons/favicon-32x32.png';
    const icoFile = './favicon.ico';
    
    // Copy 32x32 PNG and rename as ICO (browsers will handle .ico as PNG)
    const buffer = await sharp(pngFile)
      .resize(32, 32)
      .png()
      .toBuffer();
    
    fs.writeFileSync(icoFile, buffer);
    console.log('✅ Created favicon.ico');
  } catch (error) {
    console.error('Error creating ICO:', error);
  }
}

createICO();
