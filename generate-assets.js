/**
 * Lunaris Android Asset Generator
 * Resizes master icon & splash to all required Android densities
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICON_SRC  = 'C:\\Users\\berkg\\.gemini\\antigravity-ide\\brain\\cc57f6b2-7499-4bc4-8ca4-95b8b1646fa2\\lunaris_icon_square_1786975601491.jpg';
const SPLASH_PORT_SRC = 'C:\\Users\\berkg\\.gemini\\antigravity-ide\\brain\\cc57f6b2-7499-4bc4-8ca4-95b8b1646fa2\\lunaris_splash_port_1786972004074.jpg';
const RES = path.resolve(__dirname, 'android/app/src/main/res');

// Android launcher icon sizes
const iconSizes = [
  { dir: 'mipmap-mdpi',    size: 48 },
  { dir: 'mipmap-hdpi',    size: 72 },
  { dir: 'mipmap-xhdpi',   size: 96 },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

// Android splash screen sizes (portrait)
const splashPortSizes = [
  { dir: 'drawable-port-mdpi',    w: 320,  h: 480  },
  { dir: 'drawable-port-hdpi',    w: 480,  h: 800  },
  { dir: 'drawable-port-xhdpi',   w: 720,  h: 1280 },
  { dir: 'drawable-port-xxhdpi',  w: 960,  h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 2000 },
];

// Landscape splash
const splashLandSizes = [
  { dir: 'drawable-land-mdpi',    w: 480,  h: 320  },
  { dir: 'drawable-land-hdpi',    w: 800,  h: 480  },
  { dir: 'drawable-land-xhdpi',   w: 1280, h: 720  },
  { dir: 'drawable-land-xxhdpi',  w: 1600, h: 960  },
  { dir: 'drawable-land-xxxhdpi', w: 2000, h: 1280 },
];

const defaultSplashSize = { dir: 'drawable', w: 480, h: 800 };

async function run() {
  console.log('🌙 Generating Lunaris Android assets...\n');

  // ── LAUNCHER ICONS ──────────────────────────────────────────
  console.log('📱 Launcher icons:');
  for (const { dir, size } of iconSizes) {
    const destDir = path.join(RES, dir);
    await sharp(ICON_SRC)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(destDir, 'ic_launcher.png'));

    await sharp(ICON_SRC)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(destDir, 'ic_launcher_round.png'));

    // Foreground for adaptive icon — artwork fills ~85% of canvas, dark bg fills the rest
    const padded = Math.round(size * 0.85);
    const pad = Math.round((size - padded) / 2);
    await sharp(ICON_SRC)
      .resize(padded, padded, { fit: 'cover', position: 'center' })
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 11, g: 7, b: 20, alpha: 1 } })
      .png()
      .toFile(path.join(destDir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ ${dir} — ${size}×${size}px`);
  }

  // ── PORTRAIT SPLASH ─────────────────────────────────────────
  console.log('\n🌅 Portrait splash screens:');
  for (const { dir, w, h } of splashPortSizes) {
    const destDir = path.join(RES, dir);
    await sharp(SPLASH_PORT_SRC)
      .resize(w, h, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(destDir, 'splash.png'));
    console.log(`  ✓ ${dir} — ${w}×${h}px`);
  }

  // ── LANDSCAPE SPLASH ─────────────────────────────────────────
  console.log('\n🌅 Landscape splash screens:');
  for (const { dir, w, h } of splashLandSizes) {
    const destDir = path.join(RES, dir);
    await sharp(SPLASH_PORT_SRC)
      .resize(w, h, { fit: 'cover', position: 'center' })
      .png()
      .toFile(path.join(destDir, 'splash.png'));
    console.log(`  ✓ ${dir} — ${w}×${h}px`);
  }

  // ── DEFAULT DRAWABLE ─────────────────────────────────────────
  const defDir = path.join(RES, defaultSplashSize.dir);
  await sharp(SPLASH_PORT_SRC)
    .resize(defaultSplashSize.w, defaultSplashSize.h, { fit: 'cover', position: 'center' })
    .png()
    .toFile(path.join(defDir, 'splash.png'));
  console.log(`\n  ✓ drawable (default) — ${defaultSplashSize.w}×${defaultSplashSize.h}px`);

  console.log('\n✅ All Lunaris Android assets generated successfully!');
}

run().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
