const fs = require('fs');
const path = require('path');

const root = fs.realpathSync(__dirname);
const dest = path.join(root, 'www');
const files = [
  'index.html', 'araclar.html', 'blog.html', 'benim-alanim.html',
  'style.css', 'main.js', 'lunaris-ml.js', 'astro-db.js', 'cosmic-audio.js',
  'synastry-engine.js', 'mobile-bridge.js', 'firebase-config.js', 'env.js',
  'sw.js', 'manifest.webmanifest', 'ml-weights.json', 'lunaris-benchmark.js',
  'lunaris-scientific-ui.js', 'lunaris-stats.js', 'personal-core.js',
  'personal.js', 'personal.css', 'journal-link.js'
];
const dirs = ['assets', 'vendor'];
// Validate sources and the exact output path before replacing generated output.
function validateSource(p) {
  const stat = fs.lstatSync(p);
  if (stat.isSymbolicLink()) throw new Error('Web assets must not contain symbolic links: ' + p);
  if (stat.isDirectory()) for (const entry of fs.readdirSync(p)) validateSource(path.join(p, entry));
}
for (const name of [...files, ...dirs]) validateSource(path.join(root, name));
if (path.dirname(dest) !== root || path.basename(dest) !== 'www') throw new Error('Invalid output path');
if (fs.existsSync(dest) && (fs.lstatSync(dest).isSymbolicLink() || fs.realpathSync(dest) !== dest)) throw new Error('Output must be a real www directory inside the project');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest);
for (const name of files) fs.copyFileSync(path.join(root, name), path.join(dest, name));
for (const name of dirs) fs.cpSync(path.join(root, name), path.join(dest, name), { recursive: true });
console.log('Web build ready: ' + files.length + ' application files + assets/vendor. No development files copied.');
