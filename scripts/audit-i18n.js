const fs = require('fs');
const path = require('path');
const vm = require('vm');

const mainJs = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const match = mainJs.match(/const UI = (\{[\s\S]*?\n\};)/);
if (!match) {
  console.error('Could not find const UI in main.js');
  process.exit(1);
}

const sandbox = {};
vm.runInNewContext('UI = ' + match[1], sandbox);
const UI = sandbox.UI;

const htmlFiles = ['index.html', 'araclar.html', 'blog.html'];

htmlFiles.forEach(file => {
  const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const i18nMatches = [...html.matchAll(/data-i18n=["']([^"']+)["']/g)].map(m => m[1]);
  const phMatches = [...html.matchAll(/data-i18n-ph=["']([^"']+)["']/g)].map(m => m[1]);
  
  const allHtmlKeys = new Set([...i18nMatches, ...phMatches]);
  const missingInTr = [...allHtmlKeys].filter(k => UI.tr[k] === undefined);
  const missingInEn = [...allHtmlKeys].filter(k => UI.en[k] === undefined);
  const missingInRu = [...allHtmlKeys].filter(k => UI.ru[k] === undefined);

  console.log(`=== ${file} (Total unique data-i18n/ph: ${allHtmlKeys.size}) ===`);
  if (missingInTr.length) console.log('  ❌ Missing in TR:', missingInTr);
  else console.log('  ✅ All keys exist in TR');
  if (missingInEn.length) console.log('  ❌ Missing in EN:', missingInEn);
  else console.log('  ✅ All keys exist in EN');
  if (missingInRu.length) console.log('  ❌ Missing in RU:', missingInRu);
  else console.log('  ✅ All keys exist in RU');
});
