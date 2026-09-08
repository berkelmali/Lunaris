const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const keys = [
  'fool', 'magician', 'highpriestess', 'empress', 'emperor', 'hierophant',
  'lovers', 'chariot', 'strength', 'hermit', 'wheel', 'justice',
  'hangedman', 'death', 'temperance', 'devil', 'tower', 'star',
  'moon', 'sun', 'judgement', 'world'
];

let replaced = 0;
keys.forEach(k => {
  const re = new RegExp('(\\{key:\\s*"' + k + '"[\\s\\S]*?img:\\s*")[^"]*(")', 'g');
  html = html.replace(re, (match, prefix, suffix) => {
    replaced++;
    return prefix + 'assets/tarot/' + k + '.jpg' + suffix;
  });
});

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Successfully updated ${replaced} tarot card paths in index.html!`);
