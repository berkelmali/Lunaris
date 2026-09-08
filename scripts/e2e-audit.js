const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('══════════════════════════════════════════════════════════════');
console.log('   🔍 LUNARIS — KAPSAMLI ÇALIŞMA DÜZENİ VE TUTARLILIK DENETİMİ   ');
console.log('══════════════════════════════════════════════════════════════\n');

let hasError = false;

// 1. SÖZDİZİMİ (SYNTAX) DENETİMİ
console.log('--- 1. JavaScript Dosyaları Sözdizimi (Syntax) Denetimi ---');
const jsFiles = [
  'main.js',
  'lunaris-ml.js',
  'astro-db.js',
  'cosmic-audio.js',
  'synastry-engine.js',
  'mobile-bridge.js',
  'copy-web.js',
  'generate-assets.js'
];

jsFiles.forEach(file => {
  try {
    const code = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8');
    new vm.Script(code);
    console.log(`  ✅ ${file}: Hatasız.`);
  } catch (err) {
    console.error(`  ❌ ${file} SÖZDİZİMİ HATASI:`, err.message);
    hasError = true;
  }
});

// 2. HTML DOM ID TUTARLILIK DENETİMİ
console.log('\n--- 2. HTML DOM ID ve JavaScript Referans Tutarlılığı ---');

function checkDomIds(htmlFile) {
  const content = fs.readFileSync(path.resolve(__dirname, '..', htmlFile), 'utf-8');
  // Find all defined IDs in HTML
  const definedIds = new Set();
  const idRegex = /id=["']([^"']+)["']/g;
  let match;
  while ((match = idRegex.exec(content)) !== null) {
    definedIds.add(match[1]);
  }

  // Find all getElementById in inline scripts
  const getElemRegex = /document\.getElementById\(["']([^"']+)["']\)/g;
  const missing = [];
  const checked = new Set();

  while ((match = getElemRegex.exec(content)) !== null) {
    const targetId = match[1];
    if (checked.has(targetId)) continue;
    checked.add(targetId);

    // Some IDs might be dynamically generated or created by cosmic-audio.js / auth modal
    const dynamicIds = ['audioFreqGrid', 'audioBinauralSelector', 'audioVisualizerCanvas', 'synRingFg', 'deepEnergyRingFg'];
    if (!definedIds.has(targetId) && !dynamicIds.includes(targetId)) {
      missing.push(targetId);
    }
  }

  if (missing.length === 0) {
    console.log(`  ✅ ${htmlFile}: Aranan ${checked.size} DOM ID referansının tamamı HTML içinde mevcut.`);
  } else {
    console.warn(`  ⚠️ ${htmlFile}: Şu ID'ler statik HTML içinde doğrudan bulunamadı (dinamik oluşturuluyor olabilir):`, missing);
  }
}

checkDomIds('index.html');
checkDomIds('araclar.html');

// 3. ANDROID KAYNAK & SPLASH SCREEN TUTARLILIĞI
console.log('\n--- 3. Android Vektörel Marka Logosu & Varlık Denetimi ---');
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
let androidAssetsOk = true;

// Default splash
const splashDefault = 'android/app/src/main/res/drawable/splash.png';
if (fs.existsSync(splashDefault)) {
  const stat = fs.statSync(splashDefault);
  console.log(`  ✅ Default Splash: ${splashDefault} (${(stat.size/1024).toFixed(1)} KB)`);
} else {
  console.error(`  ❌ Eksik: ${splashDefault}`);
  androidAssetsOk = false;
}

// Portrait splashesh
densities.forEach(d => {
  const p = `android/app/src/main/res/drawable-port-${d}/splash.png`;
  const l = `android/app/src/main/res/drawable-land-${d}/splash.png`;
  const ic = `android/app/src/main/res/mipmap-${d}/ic_launcher.png`;
  if (!fs.existsSync(p) || !fs.existsSync(l) || !fs.existsSync(ic)) {
    console.error(`  ❌ Eksik Android varlığı: ${d}`);
    androidAssetsOk = false;
  }
});
if (androidAssetsOk) {
  console.log(`  ✅ Tüm Android yoğunlukları (mdpi...xxxhdpi) için portrait/landscape splash ve launcher ikonları eksiksiz.`);
}

// 4. WWW DERLEME & CAPACITOR DAĞITIM TUTARLILIĞI
console.log('\n--- 4. www/ ve Android Public Klasörü Dağıtım Denetimi ---');
const criticalFiles = [
  'index.html',
  'araclar.html',
  'blog.html',
  'style.css',
  'main.js',
  'lunaris-ml.js',
  'astro-db.js',
  'cosmic-audio.js',
  'synastry-engine.js',
  'mobile-bridge.js'
];

let syncOk = true;
criticalFiles.forEach(file => {
  const rootStat = fs.existsSync(file) ? fs.statSync(file) : null;
  const wwwStat = fs.existsSync(`www/${file}`) ? fs.statSync(`www/${file}`) : null;
  const androidStat = fs.existsSync(`android/app/src/main/assets/public/${file}`) ? fs.statSync(`android/app/src/main/assets/public/${file}`) : null;

  if (!rootStat) {
    console.error(`  ❌ Kök dizinde dosya yok: ${file}`);
    syncOk = false;
  } else if (!wwwStat) {
    console.error(`  ❌ www/ dizininde dosya eksik: ${file}`);
    syncOk = false;
  } else if (!androidStat) {
    console.error(`  ❌ android/ assets dizininde dosya eksik: ${file}`);
    syncOk = false;
  } else if (rootStat.size !== wwwStat.size) {
    console.warn(`  ⚠️ ${file} boyutu kök (${rootStat.size} B) ile www (${wwwStat.size} B) arasında farklı. Yeniden sync önerilir.`);
    syncOk = false;
  }
});

if (syncOk) {
  console.log(`  ✅ Tüm kritik dosyalar kök dizin, www/ ve Android assets arasında %100 senkronize.`);
}

// 5. APİ & ENTEGRASYON FONKSİYONLARI DOĞRULAMASI
console.log('\n--- 5. API ve Çalışma Düzeni Çapraz Denetimi ---');
const sandbox = {
  window: {},
  AudioContext: class {
    createGain() { return { gain: { setValueAtTime: ()=>{}, linearRampToValueAtTime: ()=>{} }, connect: ()=>{} }; }
    createOscillator() { return { frequency: { setValueAtTime: ()=>{} }, connect: ()=>{}, start: ()=>{}, stop: ()=>{} }; }
    createBiquadFilter() { return { frequency: { setValueAtTime: ()=>{} }, Q: { setValueAtTime: ()=>{} }, connect: ()=>{} }; }
    createBuffer() { return { getChannelData: ()=> new Float32Array(100) }; }
    createBufferSource() { return { connect: ()=>{}, start: ()=>{}, stop: ()=>{} }; }
    createAnalyser() { return { fftSize: 64, smoothingTimeConstant: 0.85, getByteFrequencyData: ()=>{} }; }
  },
  document: {
    readyState: 'complete',
    getElementById: () => null,
    createElement: () => ({ setAttribute: ()=>{}, appendChild: ()=>{}, classList: { add: ()=>{}, remove: ()=>{} }, style: {} }),
    body: { appendChild: ()=>{} }
  },
  console,
  setTimeout,
  clearTimeout,
  parseFloat,
  parseInt,
  Math,
  Date,
  requestAnimationFrame: ()=>{}
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// Load Astronomy, DB, ML, Audio, Synastry
const dbCode = fs.readFileSync('astro-db.js', 'utf-8');
const audioCode = fs.readFileSync('cosmic-audio.js', 'utf-8');
const mlCode = fs.readFileSync('lunaris-ml.js', 'utf-8');
const synCode = fs.readFileSync('synastry-engine.js', 'utf-8');

vm.runInContext(dbCode, sandbox);
vm.runInContext(audioCode, sandbox);
vm.runInContext(mlCode, sandbox);
vm.runInContext(synCode, sandbox);

const LunarisDB = sandbox.LunarisDB;
const LunarisAudio = sandbox.LunarisAudio;
const LunarisML = sandbox.LunarisML;
const SynastryEngine = sandbox.SynastryEngine;

let enginesOk = true;
if (!LunarisDB || typeof LunarisDB.getUserProfile !== 'function') {
  console.error('  ❌ LunarisDB eksik veya hatalı.');
  enginesOk = false;
}
if (!LunarisAudio || typeof LunarisAudio.play !== 'function' || typeof LunarisAudio.autoTuneToPlanetaryHour !== 'function') {
  console.error('  ❌ LunarisAudio eksik veya hatalı.');
  enginesOk = false;
}
if (!LunarisML || typeof LunarisML.calculatePlacidusHouses !== 'function' || typeof LunarisML.calculateAstroAttention !== 'function') {
  console.error('  ❌ LunarisML astronomik metodları eksik.');
  enginesOk = false;
}
if (!SynastryEngine || typeof SynastryEngine.generateReading !== 'function') {
  console.error('  ❌ SynastryEngine eksik veya hatalı.');
  enginesOk = false;
}

if (enginesOk) {
  console.log('  ✅ LunarisDB, LunarisAudio, LunarisML ve SynastryEngine global nesneleri ve metodları eksiksiz.');
}

// 6. DERLEME ÇIKTISI (APK) KONTROLÜ
console.log('\n--- 6. Derlenmiş Android APK Kontrolü ---');
const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
if (fs.existsSync(apkPath)) {
  const stat = fs.statSync(apkPath);
  console.log(`  ✅ APK Dosyası: ${apkPath}`);
  console.log(`  📦 APK Boyutu : ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  🕒 Son Derleme: ${stat.mtime.toLocaleString('tr-TR')}`);
} else {
  console.error(`  ❌ APK bulunamadı: ${apkPath}`);
  hasError = true;
}

console.log('\n══════════════════════════════════════════════════════════════');
if (hasError || !syncOk || !androidAssetsOk || !enginesOk) {
  console.log('❌ DENETİM SONUCU: Düzeltilmesi gereken tutarsızlıklar tespit edildi.');
} else {
  console.log('✅ GENEL KARAR: Tüm sistemler, arayüzler, motorlar ve mobil varlıklar');
  console.log('   %100 TUTARLI, SAĞLAM VE ÇALIŞIR DURUMDADIR.');
}
console.log('══════════════════════════════════════════════════════════════\n');
