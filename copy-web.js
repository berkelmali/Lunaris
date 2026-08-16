const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy web assets (html, css, js, icons, json)
const allowedExtensions = ['.html', '.css', '.js', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.txt'];
const ignoredFiles = ['package.json', 'package-lock.json', 'capacitor.config.json', 'copy-web.js', 'firebase.json', '.firebaserc', 'firestore.rules'];
const ignoredDirs = ['node_modules', '.git', '.firebase', 'android', 'ios', 'www'];

function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirs.includes(entry.name) && !entry.name.startsWith('.')) {
        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
        copyRecursive(srcPath, destPath);
      }
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExtensions.includes(ext) && !ignoredFiles.includes(entry.name)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

copyRecursive(srcDir, destDir);
console.log('✓ Web assets successfully copied to www/');
