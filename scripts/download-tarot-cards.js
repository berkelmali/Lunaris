const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..', 'assets', 'tarot');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const CARDS = [
  { key: 'fool', title: 'File:RWS_Tarot_00_Fool.jpg', num: 'ar00' },
  { key: 'magician', title: 'File:RWS_Tarot_01_Magician.jpg', num: 'ar01' },
  { key: 'highpriestess', title: 'File:RWS_Tarot_02_High_Priestess.jpg', num: 'ar02' },
  { key: 'empress', title: 'File:RWS_Tarot_03_Empress.jpg', num: 'ar03' },
  { key: 'emperor', title: 'File:RWS_Tarot_04_Emperor.jpg', num: 'ar04' },
  { key: 'hierophant', title: 'File:RWS_Tarot_05_Hierophant.jpg', num: 'ar05' },
  { key: 'lovers', title: 'File:RWS_Tarot_06_Lovers.jpg', num: 'ar06' },
  { key: 'chariot', title: 'File:RWS_Tarot_07_Chariot.jpg', num: 'ar07' },
  { key: 'strength', title: 'File:RWS_Tarot_08_Strength.jpg', num: 'ar08' },
  { key: 'hermit', title: 'File:RWS_Tarot_09_Hermit.jpg', num: 'ar09' },
  { key: 'wheel', title: 'File:RWS_Tarot_10_Wheel_of_Fortune.jpg', num: 'ar10' },
  { key: 'justice', title: 'File:RWS_Tarot_11_Justice.jpg', num: 'ar11' },
  { key: 'hangedman', title: 'File:RWS_Tarot_12_Hanged_Man.jpg', num: 'ar12' },
  { key: 'death', title: 'File:RWS_Tarot_13_Death.jpg', num: 'ar13' },
  { key: 'temperance', title: 'File:RWS_Tarot_14_Temperance.jpg', num: 'ar14' },
  { key: 'devil', title: 'File:RWS_Tarot_15_Devil.jpg', num: 'ar15' },
  { key: 'tower', title: 'File:RWS_Tarot_16_Tower.jpg', num: 'ar16' },
  { key: 'star', title: 'File:RWS_Tarot_17_Star.jpg', num: 'ar17' },
  { key: 'moon', title: 'File:RWS_Tarot_18_Moon.jpg', num: 'ar18' },
  { key: 'sun', title: 'File:RWS_Tarot_19_Sun.jpg', num: 'ar19' },
  { key: 'judgement', title: 'File:RWS_Tarot_20_Judgement.jpg', num: 'ar20' },
  { key: 'world', title: 'File:RWS_Tarot_21_World.jpg', num: 'ar21' }
];

async function run() {
  console.log('🔮 Downloading 22 Rider-Waite-Smith Major Arcana Tarot Cards from Wikimedia Commons...');
  
  const titleList = CARDS.map(c => c.title).join('|');
  const apiUrl = 'https://commons.wikimedia.org/w/api.php?action=query&titles=' + encodeURIComponent(titleList) + '&prop=imageinfo&iiprop=url&iiurlwidth=360&format=json';
  
  const apiRes = await fetch(apiUrl, { headers: { 'User-Agent': 'LunarisTarot/2.0 (contact: info@lunaris.app)' } });
  const data = await apiRes.json();
  const pages = data.query.pages;
  
  const urlMap = {};
  for (const pid in pages) {
    const p = pages[pid];
    if (p.imageinfo && p.imageinfo[0]) {
      const info = p.imageinfo[0];
      urlMap[p.title] = info.thumburl || info.url;
    }
  }

  let successCount = 0;
  for (const card of CARDS) {
    const rawTitle = card.title.replace(/_/g, ' ');
    const downloadUrl = urlMap[rawTitle] || urlMap[card.title];
    if (!downloadUrl) {
      console.error(`❌ URL not found for ${card.key} (${card.title})`);
      continue;
    }

    const outPath = path.join(targetDir, card.key + '.jpg');
    // Also save as ar00.jpg for backwards compatibility
    const outPathNum = path.join(targetDir, card.num + '.jpg');

    try {
      const imgRes = await fetch(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      fs.writeFileSync(outPath, buffer);
      fs.writeFileSync(outPathNum, buffer);
      console.log(`  ✅ [${card.num}] ${card.key.padEnd(14)} saved (${(buffer.length / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch(err) {
      console.error(`  ❌ Error downloading ${card.key}:`, err.message);
    }
  }

  console.log(`\n🎉 Completed! ${successCount}/${CARDS.length} cards saved to assets/tarot/`);
}

run();
