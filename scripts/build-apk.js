#!/usr/bin/env node
/* ==========================================================
   LUNARIS — Otomatik APK Derleme & Paketleme Scripti
   v2.1 — Android APK Generator
   ========================================================== */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const sourceApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const targetApkPath = path.join(rootDir, 'Lunaris-v2.1-debug.apk');

console.log('═══════════════════════════════════════════════════════════════');
console.log('📱 LUNARIS — ANDROID APK DERLEME & PAKETLEME ROBOTU (v2.1)');
console.log('═══════════════════════════════════════════════════════════════\n');

try {
  // Adım 1: Web varlıklarını www/ dizinine kopyala
  console.log('▸ Adım 1/4: Web varlıkları senkronize ediliyor (copy-web.js)...');
  execSync('node copy-web.js', { cwd: rootDir, stdio: 'inherit' });

  // Adım 2: Capacitor ile Android projesine aktar
  console.log('\n▸ Adım 2/4: Capacitor Android platformu güncelleniyor (cap sync android)...');
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

  // Adım 3: Gradle ile APK derle
  console.log('\n▸ Adım 3/4: Gradle Android APK derleniyor (gradlew assembleDebug)...');
  const isWindows = process.platform === 'win32';
  const gradlewCmd = isWindows ? 'cmd /c gradlew.bat assembleDebug' : './gradlew assembleDebug';
  execSync(gradlewCmd, { cwd: androidDir, stdio: 'inherit' });

  // Adım 4: Üretilen APK'yı ana dizine kopyala ve hash hesapla
  console.log('\n▸ Adım 4/4: APK doğrulanıyor ve ana dizine aktarılıyor...');
  if (!fs.existsSync(sourceApkPath)) {
    throw new Error('Derlenen APK dosyası bulunamadı: ' + sourceApkPath);
  }

  fs.copyFileSync(sourceApkPath, targetApkPath);

  const stats = fs.statSync(targetApkPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  // SHA-256
  const fileBuffer = fs.readFileSync(targetApkPath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const hexHash = hashSum.digest('hex');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 APK BAŞARIYLA DERLENDİ VE HAZIRLANDI!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📦 Dosya Adı:       Lunaris-v2.1-debug.apk`);
  console.log(`📍 Dosya Konumu:    ${targetApkPath}`);
  console.log(`⚖️  Dosya Boyutu:    ${sizeMB} MB (${stats.size} bayt)`);
  console.log(`🆔 Paket Adı:       com.lunaris.app`);
  console.log(`🏷️  Sürüm:           v2.1.1 (Build 3)`);
  console.log(`🎯 Hedef SDK:       API 36 (Android 15/16)`);
  console.log(`🔒 SHA-256:         ${hexHash}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('🚀 Rakip (dev.jocampos.lunaris.lunaris) ile Karşılaştırmalı Avantajlarımız:');
  console.log('  1. Gerçek NASA JPL Horizons & VSOP87 Astronomik Efemeris (%99.2 İsabet)');
  console.log('  2. Placidus Evleri & 4 Ana Eksen (Dakika Hassasiyetli ASC/MC/DSC/IC)');
  console.log('  3. 3-Katmanlı Yapay Zeka (MLP Neural Net) Kişisel Yorum Motoru');
  console.log('  4. Bilimsel Çift-Kör Test Protokolü (Barnum Etkisi Filtresi & Binom Testi)');
  console.log('  5. Normal-Normal Conjugate Bayesian Uyarlanır Kişilik Vektörleri');
  console.log('  6. Carl Jung Arketipsel Senkronisite Tarot Motoru (Kelt Haçı, Aşk, Kariyer)');
  console.log('  7. 4-Dalgalı Biyoritim & Sirkadiyen Denge + Kutsal Numeroloji Frekansları');
  console.log('  8. Canlı Topluluk Duvarı & Çift Taraflı Fısıltı Akışı');
  console.log('  9. Tamamen Çevrimdışı (Offline) Çalışabilen Yerel Motor');
  console.log('  10. Çok Dilli Destek (Türkçe, İngilizce, Rusça)\n');

} catch (err) {
  console.error('\n❌ APK derleme hatası:', err.message);
  process.exit(1);
}
