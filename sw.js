/* ==========================================================
   LUNARIS — Service Worker
   ----------------------------------------------------------
   Amaç: uygulama kabuğunu çevrimdışı kullanılabilir kılmak.
   Bu mümkün çünkü astroloji motoru tamamen cihazda çalışıyor —
   efemeris (vendor/astronomy.browser.min.js) yerel bir dosya,
   ağ bağlantısı gerektirmiyor. Uçakta bile burç, tarot ve doğum
   haritası hesaplanabilir.

   STRATEJİ — neden böyle:
   Uygulama kodu (HTML/CSS/JS/JSON) için ÖNCE AĞ. Bunun sebebi
   acı bir deneyimle bulundu: kod dosyaları "önce önbellek" ile
   sunulduğunda, yeni bir dağıtım kullanıcıya HİÇ ulaşmıyor —
   tarayıcı sonsuza dek eski sürümü çalıştırıyor. Ağ varken hep
   taze kod, ağ yokken önbellekteki son sürüm.

   Yalnızca gerçekten değişmeyen varlıklar (görseller, efemeris
   kütüphanesi, ikonlar) ÖNCE ÖNBELLEK ile sunuluyor; bunlar
   değiştiğinde dosya adı/sürümü de değişir.

   Çapraz kaynak istekleri (Firebase, Google Fonts) hiç ele
   alınmaz — kimlik doğrulama ve canlı veri önbelleğe girmemeli.
   ========================================================== */

const SURUM = 'lunaris-v2';
const KABUK = SURUM + '-kabuk';

/* Çevrimdışı açılış için gereken asgari kabuk. Tarot görselleri
   burada yok: 9 MB'ı kuruluma yüklemek yerine ziyaret edildikçe
   önbelleğe alınıyor. */
const KABUK_DOSYALARI = [
  '/', '/index.html', '/araclar.html', '/blog.html',
  '/style.css', '/main.js', '/lunaris-ml.js',
  '/vendor/astronomy.browser.min.js',
  '/ml-weights.json', '/manifest.webmanifest',
  '/assets/brand/icon-192.png', '/assets/brand/icon-512.png'
];

/* Değişmez sayılan yollar: yalnızca bunlar "önce önbellek". */
function degismezMi(url) {
  return url.pathname.startsWith('/assets/') ||
         url.pathname.startsWith('/vendor/');
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(KABUK)
      // Tek bir dosya 404 verirse tüm kurulum düşmesin
      .then(c => Promise.allSettled(KABUK_DOSYALARI.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(adlar => Promise.all(adlar.filter(a => a !== KABUK).map(a => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const istek = e.request;
  if (istek.method !== 'GET') return;

  const url = new URL(istek.url);
  if (url.origin !== self.location.origin) return;   // Firebase, fontlar: dokunma
  if (url.pathname.endsWith('/env.js')) return;      // yapılandırma: önbelleğe alma

  // Değişmez varlıklar: önce önbellek, yoksa ağdan alıp sakla
  if (degismezMi(url)) {
    e.respondWith(
      caches.match(istek).then(onb => onb || fetch(istek).then(y => {
        if (y && y.status === 200 && y.type === 'basic') {
          const kopya = y.clone();
          caches.open(KABUK).then(c => c.put(istek, kopya));
        }
        return y;
      }))
    );
    return;
  }

  // Uygulama kodu ve gezinme: önce ağ, olmazsa önbellek
  e.respondWith(
    fetch(istek)
      .then(y => {
        if (y && y.status === 200 && y.type === 'basic') {
          const kopya = y.clone();
          caches.open(KABUK).then(c => c.put(istek, kopya));
        }
        return y;
      })
      .catch(() => caches.match(istek).then(y => {
        if (y) return y;
        // Çevrimdışı gezinme: elimizdeki kabuğu ver
        return istek.mode === 'navigate' ? caches.match('/index.html') : undefined;
      }))
  );
});
