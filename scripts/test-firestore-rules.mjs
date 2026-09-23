/* ==========================================================
   LUNARIS — Firestore Güvenlik Kuralı Testleri
   ----------------------------------------------------------
   Çalıştırma:  npm run test:rules
   (Firestore emülatörünü başlatır, testleri koşar, kapatır.)

   Neden var: kurallar sessizce bozuluyor. Örnekler —
   - istemci "constellationWishes" kullanırken kural "wishes"
     tanımlıyordu; dilek galaksisi canlıda permission-denied alıp
     localStorage'a düştü, kimse fark etmedi.
   - yorum kuralının ilk sürümü, hiç yorumu olmayan gönderiye
     İLK yorumu reddediyordu (yeni[0:0] boş aralığı kurallarda
     değerlendirme hatası verir). Bu test onu yakaladı.

   "demo-" önekli proje kimliği kullanılıyor: gerçek projeye
   hiçbir koşulda bağlanmaz.
   ========================================================== */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, updateDoc, collection, query, orderBy, limit, arrayUnion, increment } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-lunaris',                       // demo- öneki: gerçek projeye ASLA dokunmaz
  firestore: { rules: readFileSync(join(KOK, 'firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 }
});

const yorum = (uid, o = {}) => Object.assign({
  id: 'c_' + Math.random().toString(36).slice(2), name: 'Test', text: 'Merhaba',
  photoURL: null, createdAt: new Date().toISOString(), authorUid: uid
}, o);
const mevcut = yorum('yazar', { id: 'c_ilk', text: 'İlk yorum' });

async function kur() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'wallPosts', 'p1'), { text: 'Gönderi', authorUid: 'yazar', likes: 0, comments: [mevcut] });
    await setDoc(doc(db, 'wallPosts', 'p2'), { text: 'Yorumsuz', authorUid: 'yazar', likes: 0 });
  });
}

const ayse  = () => env.authenticatedContext('ayse').firestore();
const misafir = () => env.unauthenticatedContext().firestore();
const sonuc = [];
async function t(ad, beklenen, fn) {
  await kur();
  try {
    await (beklenen === 'izin' ? assertSucceeds(fn()) : assertFails(fn()));
    sonuc.push(['✓', beklenen.padEnd(5), ad]);
  } catch (e) {
    sonuc.push(['✗', beklenen.padEnd(5), ad + '  ← BEKLENMEYEN: ' + (e.message || e).toString().slice(0, 90)]);
  }
}

// ── İzin verilmesi gerekenler ──
await t('giriş yapmış kullanıcı arrayUnion ile yorum ekler', 'izin',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse')) }));
await t('yorumu olmayan gönderiye ilk yorum', 'izin',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p2'), { comments: arrayUnion(yorum('ayse')) }));
await t('https profil görselli yorum', 'izin',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse', { photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=A' })) }));
await t('beğeni artırma (gerileme kontrolü)', 'izin',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { likes: increment(1) }));
await t('herkes duvarı okuyabilir', 'izin',
  () => getDoc(doc(misafir(), 'wallPosts', 'p1')));

// ── Reddedilmesi gerekenler ──
await t('misafir yorum ekleyemez', 'red',
  () => updateDoc(doc(misafir(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse')) }));
await t('başkası adına yorum (authorUid taklidi)', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('yazar')) }));
await t('mevcut yorumu düzenleme', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: [Object.assign({}, mevcut, { text: 'ELE GEÇİRİLDİ' }), yorum('ayse')] }));
await t('mevcut yorumu silme', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: [] }));
await t('yorumu silip yerine kendininkini koyma', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: [yorum('ayse')] }));
await t('tek seferde iki yorum', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse'), yorum('ayse')) }));
await t('boş yorum metni', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse', { text: '' })) }));
await t('281 karakterlik yorum', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse', { text: 'x'.repeat(281) })) }));
await t('yoruma fazladan alan (isAdmin)', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse', { isAdmin: true })) }));
await t('javascript: görsel URL', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse', { photoURL: 'javascript:alert(1)' })) }));
await t('http (https değil) görsel URL', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse', { photoURL: 'http://iz.example/p.gif' })) }));
await t('yorumla birlikte gönderi metnini değiştirme', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse')), text: 'değişti' }));
await t('yorum ve beğeniyi aynı anda', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion(yorum('ayse')), likes: increment(1) }));
await t('başkasının gönderi metnini değiştirme', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { text: 'ele geçirildi' }));
await t('yorum yerine dize (tip hilesi)', 'red',
  () => updateDoc(doc(ayse(), 'wallPosts', 'p1'), { comments: arrayUnion('düz metin') }));

// ── Dilek galaksisi (önceki düzeltmenin gerileme kontrolü) ──
await t('misafir dilekleri okuyabilir', 'izin',
  () => getDocs(query(collection(misafir(), 'constellationWishes'), orderBy('createdAt', 'desc'), limit(40))));
await t('misafir dilek bırakabilir', 'izin',
  () => setDoc(doc(misafir(), 'constellationWishes', 'w1'), { text: 'Dileğim', authorUid: 'anon', lightCount: 1, createdAt: new Date() }));

await env.cleanup();
for (const [d, b, a] of sonuc) console.log(`  ${d} ${b} ${a}`);
const hata = sonuc.filter(r => r[0] === '✗').length;
console.log(`\n  ${sonuc.length - hata}/${sonuc.length} senaryo beklendiği gibi`);
process.exit(hata ? 1 : 0);
