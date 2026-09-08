const fs = require('fs');
const path = require('path');

const files = ['index.html', 'araclar.html', 'blog.html'];

files.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  
  // Look for elements with Turkish characters: ç, ğ, ı, ö, ş, ü, İ, etc.
  // or common Turkish words without data-i18n
  const lines = content.split('\n');
  const findings = [];
  
  lines.forEach((line, idx) => {
    // skip script and style tags
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    if (trimmed.includes('<script') || trimmed.includes('</script>')) return;
    if (trimmed.includes('<style') || trimmed.includes('</style>')) return;
    if (trimmed.includes('console.')) return;
    
    // Check if line has html tags with text content but without data-i18n
    // E.g., <button ...>Giriş</button> or <span>...</span>
    const tagMatch = line.match(/<([a-z1-6]+)([^>]*)>([^<]+)<\/\1>/i);
    if (tagMatch) {
      const tag = tagMatch[1];
      const attrs = tagMatch[2];
      const text = tagMatch[3].trim();
      
      // If text has Turkish characters or Turkish words and no data-i18n
      const hasTurkishChar = /[çğıöşüÇĞİÖŞÜ]/.test(text);
      const isShortSymbol = /^[0-9\s✦✨★☆—\-_•|/\\:.,%]+$/.test(text);
      if (!attrs.includes('data-i18n') && !attrs.includes('data-i18n-ph') && (hasTurkishChar || /^(Giriş|Kayıt|Yükleniyor|Hesabım|Bugün|Burç|Detay|Tümü|Kapat|Gönder|İptal|Kaydet|Seç)/i.test(text)) && !isShortSymbol) {
        findings.push({ line: idx + 1, tag, text, raw: trimmed });
      }
    }
  });

  console.log(`\n================ ${file} Potential Untranslated Static Elements (${findings.length}) ================`);
  findings.slice(0, 30).forEach(f => {
    console.log(`L${f.line} [${f.tag}]: "${f.text}"`);
  });
  if (findings.length > 30) {
    console.log(`... and ${findings.length - 30} more`);
  }
});
