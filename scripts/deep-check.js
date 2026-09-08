const fs = require('fs');
const path = require('path');
const vm = require('vm');

const aeCode = fs.readFileSync(path.resolve(__dirname, '..', 'vendor', 'astronomy.browser.min.js'), 'utf-8');
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
sandbox.global = sandbox;
vm.createContext(sandbox);

vm.runInContext(aeCode, sandbox);
vm.runInContext(dbCode, sandbox);
vm.runInContext(mlCode, sandbox);

const ML = sandbox.LunarisML;

// 15 Haziran 1995 14:30 İstanbul
const d = ML.generateDeepReading('gemini', 'tr', new Date(1995, 5, 15), 14.5, { lat: 41.0082, lon: 28.9784, timezoneOffset: 3 });

console.log('=== GÖKSEL KÖŞE NOKTALARI ===');
console.log('Sun :', d.natal.sunSign, d.natal.planetaryHouses.find(p=>p.planet==='sun'));
console.log('Moon:', d.natal.moonSign, d.natal.planetaryHouses.find(p=>p.planet==='moon'));
console.log('ASC :', d.natal.ascSign, d.natal.angles.asc);
console.log('MC  :', d.natal.angles.mc);

console.log('\n=== TÜM GEZEGEN YERLEŞİMLERİ (PLACIDUS + ASTRONOMY ENGINE) ===');
d.natal.planetaryHouses.forEach(p => {
  console.log(`${p.planet.padEnd(10)}: ${p.formattedDegree.padEnd(15)} in ${p.sign.padEnd(12)} -> ${p.house}. Ev (${p.isRetrograde ? 'Retro' : 'Direkt'})`);
});

console.log('\n=== MİSTİK FAL EŞLEŞMELERİ ===');
console.log('Love Style     :', d.mysticFortune.love.subtitle);
console.log('Love Desc      :', d.mysticFortune.love.desc);
console.log('Career Title   :', d.mysticFortune.career.subtitle);
console.log('Career Desc    :', d.mysticFortune.career.desc);
console.log('Soul Aura      :', d.mysticFortune.soul.aura);
console.log('Soul Superpower:', d.mysticFortune.soul.superpower);
console.log('Daily Whisper  :', d.mysticFortune.daily.whisper);
console.log('Daily Tip      :', d.mysticFortune.daily.tip);
console.log('Warning Title  :', d.mysticFortune.warning.title);
console.log('Warning Desc   :', d.mysticFortune.warning.desc);

console.log('\n=== 12 EV KASPLARI ===');
d.natal.houses.houseList.forEach(h => {
  console.log(`${h.name.padEnd(20)}: ${h.formatted} ${h.signName} (Cusp: ${h.degree.toFixed(2)}°)`);
});
