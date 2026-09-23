#!/usr/bin/env node
/* ==========================================================
   LUNARIS — Sürüm Damgalayıcı
   ----------------------------------------------------------
   Tek gerçek kaynak: package.json "version".
   Sürüm dört ayrı yerde elle yazılıyordu ve kaçınılmaz olarak
   birbirinden ayrıldı (package 2.1.1 / sw 2.3.0 / footer 2.1.1
   / APK adı v2.1). Bu betik hepsini package.json'dan damgalar.
   Idempotenttir: değişiklik yoksa dosyaya dokunmaz.
   ========================================================== */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ver = require(path.join(root, 'package.json')).version;

const SEMVER = '\\d+\\.\\d+\\.\\d+';
let degisen = 0;

function damgala(dosya, kurallar) {
  const p = path.join(root, dosya);
  if (!fs.existsSync(p)) return;
  const onceki = fs.readFileSync(p, 'utf8');
  let s = onceki;
  const vurus = [];
  for (const [ad, re, yeni] of kurallar) {
    const n = (s.match(re) || []).length;
    if (n) vurus.push(`${ad}×${n}`);
    s = s.replace(re, yeni);
  }
  if (s !== onceki) {
    fs.writeFileSync(p, s, 'utf8');
    degisen++;
    console.log(`  ✎ ${dosya}  [${vurus.join(', ')}]`);
  } else {
    console.log(`  · ${dosya}  zaten güncel`);
  }
}

damgala('index.html', [
  ['apk-etiketi', new RegExp(`Lunaris APK \\(v${SEMVER}\\)`, 'g'), `Lunaris APK (v${ver})`],
  ['footer', new RegExp(`(LUNARIS[^<]*?•\\s*)v${SEMVER}`, 'g'), `$1v${ver}`],
  ['cache-bust', new RegExp(`\\?v=${SEMVER}`, 'g'), `?v=${ver}`],
]);

damgala('sw.js', [
  ['sw-surum', new RegExp(`(const SURUM = ')lunaris-v${SEMVER}(')`, 'g'), `$1lunaris-v${ver}$2`],
]);

damgala('android/app/build.gradle', [
  ['versionName', new RegExp(`(versionName ")${SEMVER}(")`, 'g'), `$1${ver}$2`],
]);

console.log(degisen
  ? `\n✓ Sürüm v${ver} olarak damgalandı (${degisen} dosya güncellendi).`
  : `\n✓ Tüm sürüm etiketleri zaten v${ver}.`);
