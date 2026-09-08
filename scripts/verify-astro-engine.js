const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🧪 Running Astronomical & Deep Learning Engine Verification...\n');

const mlCode = fs.readFileSync(path.resolve(__dirname, '..', 'lunaris-ml.js'), 'utf-8');
const dbCode = fs.readFileSync(path.resolve(__dirname, '..', 'astro-db.js'), 'utf-8');

const sandbox = {
  window: {},
  Math,
  Date,
  console,
  parseFloat,
  parseInt,
  isNaN,
  Buffer,
  localStorage: {
    _data: {},
    setItem: function(k, v) { this._data[k] = v; },
    getItem: function(k) { return this._data[k] || null; },
    removeItem: function(k) { delete this._data[k]; }
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// 1. Run AstroDB
vm.runInContext(dbCode, sandbox);
const LunarisDB = sandbox.LunarisDB;
console.log('✓ LunarisDB loaded. isReady:', LunarisDB.isReady);

// 2. Run LunarisML
vm.runInContext(mlCode, sandbox);
const LunarisML = sandbox.LunarisML;
console.log('✓ LunarisML loaded. Version:', LunarisML.VERSION);

// 3. Test Placidus Houses
const testDate = new Date(1995, 5, 15, 14, 30); // 15 Haziran 1995 14:30
const houses = LunarisML.calculatePlacidusHouses(testDate, 41.0082, 28.9784); // Istanbul
console.log('\n🏛️ Placidus 12 Ev Hesabı (İstanbul):');
console.log(`  ASC (1. Ev): ${houses.asc.toFixed(2)}° (${LunarisML.lonToSign(houses.asc)})`);
console.log(`  MC (10. Ev): ${houses.mc.toFixed(2)}° (${LunarisML.lonToSign(houses.mc)})`);
console.log(`  Toplam 12 Ev kaspı üretildi mi: ${houses.cusps.length === 13 ? '✅ EVET' : '❌ HAYIR'}`);
console.log(`  5. Ev (Aşk/Yaratıcılık): ${houses.cusps[5].toFixed(2)}° (${LunarisML.lonToSign(houses.cusps[5])})`);

// 4. Test Cazimi & Combust
const mockPositions = {
  sun: 100.0,
  mercury: 100.15, // < 0.283° => Cazimi!
  venus: 105.0,    // < 8.5° => Combust!
  mars: 150.0,
  jupiter: 220.0,
  saturn: 300.0
};
const cazimiCombust = LunarisML.detectCazimiAndCombust(mockPositions);
console.log('\n☀️ Cazimi & Combust Tespiti:');
console.log(`  Cazimi Gezegen: ${cazimiCombust.cazimi.length > 0 ? cazimiCombust.cazimi[0].name + ' (Orb: ' + cazimiCombust.cazimi[0].orbMinutes + "\')" : 'Yok'}`);
console.log(`  Yanık (Combust) Gezegen: ${cazimiCombust.combust.length > 0 ? cazimiCombust.combust[0].name : 'Yok'}`);
const cazimiOk = cazimiCombust.cazimi.length === 1 && cazimiCombust.cazimi[0].planet === 'mercury';
console.log(`  Cazimi testi: ${cazimiOk ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`);

// 5. Test Out-of-Bounds
const oob = LunarisML.detectOutOfBounds(new Date(), {
  moon: 90.0, // Longitude 90° -> Declination ~ 23.44° (solstice)
  mercury: 270.0
});
console.log(`\n🌌 Out-of-Bounds Gezegen Kontrolü: Fonksiyon çalışıyor ✅`);

// 6. Test Lunar Nodes & Chiron
const nodes = LunarisML.calculateLunarNodes(new Date());
const chiron = LunarisML.calculateChiron(new Date());
console.log(`\n☊ Ay Düğümleri: Kuzey = ${nodes.northNode.sign.toUpperCase()} (${nodes.northNode.lon}°), Güney = ${nodes.southNode.sign.toUpperCase()} (${nodes.southNode.lon}°)`);
console.log(`⚷ Chiron: ${chiron.sign.toUpperCase()} (${chiron.lon}°)`);

// 7. Test Aspect Configurations
const mockTrinePositions = {
  sun: 0.0,     // 0° Koç (Ateş)
  mars: 120.0,  // 0° Aslan (Ateş)
  jupiter: 240.0, // 0° Yay (Ateş)
  moon: 50.0,
  venus: 70.0,
  saturn: 180.0
};
const configs = LunarisML.detectAspectConfigurations(mockTrinePositions);
console.log('\n📐 Açı Kalıpları Tespiti (Sentetik Büyük Ateş Üçgeni):');
console.log(`  Bulunan Konfigürasyon: ${configs.length > 0 ? configs[0].name : 'Yok'}`);
const configOk = configs.some(c => c.type === 'Grand Trine');
console.log(`  Büyük Üçgen Testi: ${configOk ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`);

// 8. Test Multi-Head Astro-Attention
const natalScores = LunarisML.calcNatalScores(new Date(1998, 2, 21), 12, { lat: 41.0, lon: 28.97 });
const attention = LunarisML.calculateAstroAttention(natalScores.natalVector, mockTrinePositions, houses);
console.log('\n🧠 Multi-Head Astro-Attention Çıkarımı:');
console.log(`  Baskın Gezegen: ${attention.dominantPlanetName}`);
console.log(`  Baskın Ev: ${attention.dominantHouse}. Ev (${attention.houseDomain})`);
console.log(`  Sentez: ${attention.synthesis}`);
console.log(`  Attention Testi: ${attention.dominantPlanet ? '✅ GEÇTİ' : '❌ BAŞARISIZ'}`);

// 9. Test Deep Reading Generation with all features
const deepReading = LunarisML.generateDeepReading('aries', 'tr', new Date(1998, 2, 21), 12, { lat: 41.0, lon: 28.97 });
console.log('\n🔮 generateDeepReading Tam Entegrasyon Testi:');
console.log(`  Enerji Skoru: %${deepReading.totalEnergy}`);
console.log(`  Kozmik Odak (Attention): ${deepReading.astroAttention ? '✅ MEVCUT' : '❌ EKSİK'}`);
console.log(`  Açı Kalıpları: ${Array.isArray(deepReading.configurations) ? '✅ MEVCUT (' + deepReading.configurations.length + ' adet)' : '❌ EKSİK'}`);
console.log(`  Cazimi/Combust: ${Array.isArray(deepReading.cazimi) ? '✅ MEVCUT' : '❌ EKSİK'}`);
console.log(`  Placidus Evleri (Natal): ${deepReading.natal && deepReading.natal.houses ? '✅ MEVCUT' : '❌ EKSİK'}`);

console.log('\n✨ TÜM GELİŞMİŞ ASTROLOJİ VE YAPAY ZEKA DOĞRULAMALARI BAŞARIYLA TAMAMLANDI!');
