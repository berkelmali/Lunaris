/**
 * Lunaris Android Brand Asset Generator
 * Generates exact vector brand splash screens and launcher icons
 * matching the site's official logo design.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const RES = path.resolve(__dirname, '../android/app/src/main/res');

// Android launcher icon densities
const iconSizes = [
  { dir: 'mipmap-mdpi',    size: 48 },
  { dir: 'mipmap-hdpi',    size: 72 },
  { dir: 'mipmap-xhdpi',   size: 96 },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Android portrait splash screen densities
const splashPortSizes = [
  { dir: 'drawable-port-mdpi',    w: 320,  h: 480  },
  { dir: 'drawable-port-hdpi',    w: 480,  h: 800  },
  { dir: 'drawable-port-xhdpi',   w: 720,  h: 1280 },
  { dir: 'drawable-port-xxhdpi',  w: 960,  h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 2000 },
];

// Android landscape splash screen densities
const splashLandSizes = [
  { dir: 'drawable-land-mdpi',    w: 480,  h: 320  },
  { dir: 'drawable-land-hdpi',    w: 800,  h: 480  },
  { dir: 'drawable-land-xhdpi',   w: 1280, h: 720  },
  { dir: 'drawable-land-xxhdpi',  w: 1600, h: 960  },
  { dir: 'drawable-land-xxxhdpi', w: 2000, h: 1280 },
];

const defaultSplashSize = { dir: 'drawable', w: 480, h: 800 };

/**
 * Creates an authentic SVG for the splash screen matching the site brand
 */
function createSplashSVG(width, height) {
  const isLandscape = width > height;
  const emblemScale = isLandscape ? Math.min(width, height) * 0.42 : Math.min(width, height) * 0.48;
  const cx = width / 2;
  const cy = isLandscape ? height * 0.46 : height * 0.44;
  const titleY = cy + emblemScale * 0.64 + 20;
  const tagY = titleY + 28;
  const titleSize = Math.max(22, Math.round(emblemScale * 0.17));
  const tagSize = Math.max(10, Math.round(titleSize * 0.42));

  // Stars for subtle cosmic background
  const stars = [
    { x: cx * 0.35, y: cy * 0.4, r: 1.2, o: 0.7 },
    { x: cx * 1.6,  y: cy * 0.3, r: 1.5, o: 0.8 },
    { x: cx * 0.2,  y: cy * 1.4, r: 1.0, o: 0.5 },
    { x: cx * 1.75, y: cy * 1.5, r: 1.3, o: 0.65 },
    { x: cx * 0.7,  y: cy * 0.25, r: 0.8, o: 0.6 },
    { x: cx * 1.3,  y: cy * 1.7, r: 1.1, o: 0.75 },
    { x: cx * 0.45, y: cy * 1.75, r: 0.9, o: 0.5 },
    { x: cx * 1.55, y: cy * 0.8, r: 1.4, o: 0.6 },
  ];

  const starsSVG = stars.map(s => 
    `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="#E8D5B5" opacity="${s.o}"/>`
  ).join('\n');

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Radial Aura -->
    <radialGradient id="nebulaAura" cx="50%" cy="${isLandscape ? '46%' : '44%'}" r="55%" fx="50%" fy="${isLandscape ? '46%' : '44%'}">
      <stop offset="0%" stop-color="#2D164D" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#1B0C32" stop-opacity="0.75"/>
      <stop offset="70%" stop-color="#0F081C" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0B0714" stop-opacity="1"/>
    </radialGradient>

    <!-- Emblem Crescent Moon Gradient -->
    <linearGradient id="logoMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9B5DE5"/>
      <stop offset="50%" stop-color="#D4AF6A"/>
      <stop offset="100%" stop-color="#F2D07A"/>
    </linearGradient>

    <!-- Wordmark Gold Gradient -->
    <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F5D77F"/>
      <stop offset="50%" stop-color="#E5AA70"/>
      <stop offset="100%" stop-color="#C99436"/>
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="emblemGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${emblemScale * 0.05}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="softAura" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="${emblemScale * 0.12}"/>
    </filter>
  </defs>

  <!-- Deep Cosmic Obsidian Canvas -->
  <rect width="${width}" height="${height}" fill="#0B0714"/>
  <rect width="${width}" height="${height}" fill="url(#nebulaAura)"/>

  <!-- Celestial Stars -->
  ${starsSVG}

  <!-- Luminous Ambient Halo behind Emblem -->
  <circle cx="${cx}" cy="${cy}" r="${emblemScale * 0.44}" fill="#7F3FB8" opacity="0.35" filter="url(#softAura)"/>
  <circle cx="${cx}" cy="${cy}" r="${emblemScale * 0.28}" fill="#D4AF6A" opacity="0.25" filter="url(#softAura)"/>

  <!-- Lunaris Official Emblem (ViewBox 0 0 40 40 mapped to emblemScale) -->
  <g transform="translate(${cx - emblemScale / 2}, ${cy - emblemScale / 2}) scale(${emblemScale / 40})" filter="url(#emblemGlow)">
    <!-- Outer Orbital Dashed Ring -->
    <circle cx="20" cy="20" r="18" fill="none" stroke="#D4AF6A" stroke-width="0.9" stroke-dasharray="1.6 3.6" opacity="0.75"/>
    
    <!-- Inner Concentric Ring -->
    <circle cx="20" cy="20" r="14.5" fill="none" stroke="#D4AF6A" stroke-width="0.6" opacity="0.4"/>
    
    <!-- Crescent Moon -->
    <path d="M25.5,9.3 a10.7,10.7 0 1,0 0,21.4 a13,13 0 1,1 0,-21.4 Z" fill="url(#logoMoonGrad)"/>
    
    <!-- 10-Point Star -->
    <path d="M16.5,12 L17.9,15.6 L21.6,16.3 L18.8,18.9 L19.6,22.6 L16.5,20.6 L13.4,22.6 L14.2,18.9 L11.4,16.3 L15.1,15.6 Z" fill="#F2D07A"/>
    
    <!-- Twinkle Spark -->
    <circle cx="27.5" cy="26" r="1" fill="#FFFFFF" opacity="0.95"/>
  </g>

  <!-- Brand Wordmark Typography -->
  <text x="${cx}" y="${titleY}" 
        font-family="Cinzel, 'Cinzel Decorative', 'Georgia', serif" 
        font-size="${titleSize}" 
        font-weight="700" 
        letter-spacing="${Math.round(titleSize * 0.28)}" 
        text-anchor="middle" 
        fill="url(#goldTextGrad)">LUNARIS</text>

  <!-- Subtitle -->
  <text x="${cx}" y="${tagY}" 
        font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" 
        font-size="${tagSize}" 
        font-weight="500" 
        letter-spacing="${Math.round(tagSize * 0.35)}" 
        text-anchor="middle" 
        fill="#A79CB8">TAROT &amp; ASTROLOJİ</text>
</svg>
`;
}

/**
 * Creates an authentic SVG for the App Launcher Icon
 */
function createIconSVG(size) {
  const emblemScale = size * 0.72;
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="iconBgGrad" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#2D164D"/>
      <stop offset="55%" stop-color="#180C2D"/>
      <stop offset="100%" stop-color="#0B0714"/>
    </radialGradient>

    <linearGradient id="iconMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9B5DE5"/>
      <stop offset="50%" stop-color="#D4AF6A"/>
      <stop offset="100%" stop-color="#F2D07A"/>
    </linearGradient>

    <filter id="iconGlow">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="${size}" height="${size}" fill="url(#iconBgGrad)"/>

  <!-- Subtle Gold Border Ring -->
  <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="${size * 0.22}" fill="none" stroke="#D4AF6A" stroke-width="${size * 0.015}" opacity="0.35"/>

  <!-- Official Emblem -->
  <g transform="translate(${cx - emblemScale / 2}, ${cy - emblemScale / 2}) scale(${emblemScale / 40})" filter="url(#iconGlow)">
    <circle cx="20" cy="20" r="18" fill="none" stroke="#D4AF6A" stroke-width="0.9" stroke-dasharray="1.6 3.6" opacity="0.8"/>
    <circle cx="20" cy="20" r="14.5" fill="none" stroke="#D4AF6A" stroke-width="0.6" opacity="0.45"/>
    <path d="M25.5,9.3 a10.7,10.7 0 1,0 0,21.4 a13,13 0 1,1 0,-21.4 Z" fill="url(#iconMoonGrad)"/>
    <path d="M16.5,12 L17.9,15.6 L21.6,16.3 L18.8,18.9 L19.6,22.6 L16.5,20.6 L13.4,22.6 L14.2,18.9 L11.4,16.3 L15.1,15.6 Z" fill="#F2D07A"/>
    <circle cx="27.5" cy="26" r="1" fill="#FFFFFF" opacity="0.95"/>
  </g>
</svg>
`;
}

/**
 * Creates Adaptive Icon Foreground (Transparent background, padded artwork)
 */
function createAdaptiveForegroundSVG(size) {
  const emblemScale = size * 0.65;
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fgMoonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9B5DE5"/>
      <stop offset="50%" stop-color="#D4AF6A"/>
      <stop offset="100%" stop-color="#F2D07A"/>
    </linearGradient>

    <filter id="fgGlow">
      <feGaussianBlur stdDeviation="${size * 0.02}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g transform="translate(${cx - emblemScale / 2}, ${cy - emblemScale / 2}) scale(${emblemScale / 40})" filter="url(#fgGlow)">
    <circle cx="20" cy="20" r="18" fill="none" stroke="#D4AF6A" stroke-width="0.9" stroke-dasharray="1.6 3.6" opacity="0.85"/>
    <circle cx="20" cy="20" r="14.5" fill="none" stroke="#D4AF6A" stroke-width="0.6" opacity="0.5"/>
    <path d="M25.5,9.3 a10.7,10.7 0 1,0 0,21.4 a13,13 0 1,1 0,-21.4 Z" fill="url(#fgMoonGrad)"/>
    <path d="M16.5,12 L17.9,15.6 L21.6,16.3 L18.8,18.9 L19.6,22.6 L16.5,20.6 L13.4,22.6 L14.2,18.9 L11.4,16.3 L15.1,15.6 Z" fill="#F2D07A"/>
    <circle cx="27.5" cy="26" r="1" fill="#FFFFFF" opacity="0.95"/>
  </g>
</svg>
`;
}

async function run() {
  console.log('🌙 Generating Lunaris authentic Android brand assets...\n');

  // 1. Launcher Icons
  console.log('📱 Generating App Launcher Icons:');
  for (const { dir, size } of iconSizes) {
    const destDir = path.join(RES, dir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const iconSvg = Buffer.from(createIconSVG(size));
    await sharp(iconSvg).png().toFile(path.join(destDir, 'ic_launcher.png'));
    await sharp(iconSvg).png().toFile(path.join(destDir, 'ic_launcher_round.png'));

    const fgSvg = Buffer.from(createAdaptiveForegroundSVG(size));
    await sharp(fgSvg).png().toFile(path.join(destDir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ ${dir} — ${size}×${size}px`);
  }

  // 2. Portrait Splash Screens
  console.log('\n🌅 Generating Portrait Splash Screens:');
  for (const { dir, w, h } of splashPortSizes) {
    const destDir = path.join(RES, dir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const splashSvg = Buffer.from(createSplashSVG(w, h));
    await sharp(splashSvg).png().toFile(path.join(destDir, 'splash.png'));
    console.log(`  ✓ ${dir} — ${w}×${h}px`);
  }

  // 3. Landscape Splash Screens
  console.log('\n🌅 Generating Landscape Splash Screens:');
  for (const { dir, w, h } of splashLandSizes) {
    const destDir = path.join(RES, dir);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const splashSvg = Buffer.from(createSplashSVG(w, h));
    await sharp(splashSvg).png().toFile(path.join(destDir, 'splash.png'));
    console.log(`  ✓ ${dir} — ${w}×${h}px`);
  }

  // 4. Default Drawable Splash
  const defDir = path.join(RES, defaultSplashSize.dir);
  if (!fs.existsSync(defDir)) fs.mkdirSync(defDir, { recursive: true });
  const defSplashSvg = Buffer.from(createSplashSVG(defaultSplashSize.w, defaultSplashSize.h));
  await sharp(defSplashSvg).png().toFile(path.join(defDir, 'splash.png'));
  console.log(`\n  ✓ drawable (default) — ${defaultSplashSize.w}×${defaultSplashSize.h}px`);

  console.log('\n✨ All Lunaris APK brand assets generated with 100% fidelity to the site logo!');
}

run().catch(err => {
  console.error('❌ Error generating brand assets:', err);
  process.exit(1);
});
