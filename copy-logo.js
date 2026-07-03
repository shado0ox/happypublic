import fs from 'fs';
import path from 'path';

const srcCircularLogo = path.join(process.cwd(), 'src/assets/images/happy_home_logo_new_1781990855965.jpg');
const srcSquareLogo = path.join(process.cwd(), 'src/assets/images/happy_home_logo_1781910968387.jpg');
const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Copy the circular logo as primary branding for Google Search and favicons
if (fs.existsSync(srcCircularLogo)) {
  const destFiles = [
    'favicon.jpg',
    'favicon.ico',
    'favicon.png',
    'apple-touch-icon.png',
    'apple-touch-icon-precomposed.png',
    'logo.jpg',
    'logo_circular.jpg'
  ];

  for (const file of destFiles) {
    const destPath = path.join(publicDir, file);
    fs.copyFileSync(srcCircularLogo, destPath);
  }
  console.log('Successfully copied circular logo to public favicons and logo.jpg');
} else {
  console.error('Source circular logo not found at:', srcCircularLogo);
}

// 2. Copy the square logo as logo_square.jpg
if (fs.existsSync(srcSquareLogo)) {
  const destFiles = [
    'logo_square.jpg',
    'logo_old.jpg'
  ];

  for (const file of destFiles) {
    const destPath = path.join(publicDir, file);
    fs.copyFileSync(srcSquareLogo, destPath);
  }
  console.log('Successfully copied square logo to public alternate files');
} else {
  console.error('Source square logo not found at:', srcSquareLogo);
}
