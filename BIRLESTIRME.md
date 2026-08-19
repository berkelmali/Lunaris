# Lunaris — Sürüm Karşılaştırması ve Birleştirme

Bu belge `lunaris` (ana dal, LunarisML v3.1) ile `lunaris-duzeltilmis`
klasöründeki denetim sürümünün karşılaştırmasını ve ikisinin tek bir
sürümde nasıl birleştirildiğini kaydeder.

## Karar: temel sürüm = ana dal (`lunaris`)

`lunaris-duzeltilmis`, ana daldan **daha eski** bir Lunaris'in üzerine
yapılmış bir denetim çalışması. Ana dalın ondan fazlası:

| Özellik | ana dal | düzeltilmiş |
|---|---|---|
| Ephemeris (10 gök cismi, pertürbasyonlu Ay) | ✅ | ❌ |
| Esas onurlar (dignities), Gaussian orblu açı motoru | ✅ | ❌ |
| Jung arketipleri, gölge uyarıları, biyoritim | ✅ | ❌ |
| Nöral tarot & astro-tarot sentezi | ✅ | ❌ |
| Gerçek geri bildirim döngüsü (`ml_feedback` + `ml-weights.json`) | ✅ | ❌ |
| Firestore kuralları (şema doğrulamalı, catch-all kapalı) | ✅ | kısmen |
| Capacitor / Android / iOS, mobil köprü | ✅ | ❌ |
| Rusça yerelleştirme derinliği | ✅ | kısmi |

Ana dal ~215 KB ML motoru taşırken düzeltilmiş sürüm ~56 KB. Yani
düzeltilmiş sürüme dönmek 4 büyük özellik kuşağını geri almak olurdu.

**Ama** düzeltilmiş sürümün yakaladığı 4 hata ana dalda hâlâ duruyordu.
Yaklaşım: ana dalı temel al, o düzeltmeleri üzerine taşı.

## Taşınan düzeltmeler

1. **Ay burcu faz döngüsünden hesaplanıyordu** (`lunaris-ml.js`)
   Sinodik ay (29.53 gün) 12'ye bölünüp burç sanılıyordu. Faz, Güneş-Ay-Dünya
   açısıdır; burç, Ay'ın yıldızlara göre konumudur (27.32 gün). Artık aynı
   dosyadaki `calcPlanetPositions()` pertürbasyonlu Ay boylamı kullanılıyor —
   yani natal ile transit motoru artık aynı Ay'a bakıyor.
   *Doğrulama:* 30 günde 13 burç geçişi (beklenen ~12-13). Önceki kod 12 aylık
   dönemde tamamen kaymış değerler üretiyordu.

2. **Yükselen burç için doğum yeri sorulmuyordu** (`index.html`, `main.js`)
   Yükselen doğası gereği enlem + boylama bağlı. Forma 55 şehirlik "Doğum Yerin"
   alanı eklendi (TR/KKTC + dünya); seçim `localStorage`'da saklanıyor. Şehir
   seçilmezse burç **uydurulmuyor**: dürüstçe Güneş burcuna düşülüyor,
   `ascKnown:false` ile işaretleniyor, kutu kesikli çerçeveye geçiyor ve altında
   nedeni yazıyor.

3. **Retro tarihleri iki ayrı yerde yaşıyordu** (`main.js`, `lunaris-ml.js`, `araclar.html`)
   `araclar.html` gerçek 2026 tarihlerini, `lunaris-ml.js` ise **yıl bilgisi olmayan**
   ay/gün çiftlerini kullanıyordu; 2024-2028 arası bütün pencereler tek bir yıla
   eziliyor, Merkür yılda 13 kez retroya giriyordu. Site aynı anda hem "retro"
   hem "retro değil" diyebiliyordu. Artık tek kaynak: `main.js` içindeki
   `LUNARIS_COSMIC` (main.js her iki sayfada da önce yükleniyor).
   *Doğrulama:* 2026'nın 365 gününde motor ile Kozmik Takvim %100 uyumlu.

4. **Numeroloji formülü gerçek hesabı yansıtmıyordu** (`araclar.html`)
   Ekranda ham `gün+ay+yıl` toplamı gösteriliyor, arkada ise gün/ay/yıl ayrı ayrı
   indirgeniyordu. Usta sayılarda (11/22/33) çelişebiliyordu. Artık gösterim
   `lifePathNumber()` ile birebir aynı adımları yazıyor.

5. **Topluluk duvarında yetki açığı** (`firestore.rules`)
   `allow update: if isAuthenticated()` — giriş yapan **herkes** başkasının
   gönderisinin metnini, adını, yazar kimliğini değiştirebiliyordu. Artık
   yalnızca `likes` alanı değiştirilebiliyor (istemci zaten sadece onu yazıyor).
   Uygulamak için: `firebase deploy --only firestore:rules`

### Taşınmayan tek madde
Düzeltilmiş sürüm "ML / Makine Öğrenmesi" etiketlerini "Kozmik Algoritma" diye
yumuşatmıştı; çünkü o sürümde gerçekten öğrenen bir şey yoktu. Ana dalda artık
`ml_feedback` koleksiyonu + `ml-weights.json` üzerinden çalışan gerçek bir geri
bildirim döngüsü var, dolayısıyla etiket dürüst — değiştirilmedi.

## Ek olarak bulunup düzeltilenler (her iki sürümde de vardı)

6. **Yükselen burç 180° yanlıştı** (`lunaris-ml.js`) — en ciddi bulgu.
   Formül `atan2(−cos RAMC, +X)` yazılmıştı; doğrusu `atan2(cos RAMC, −X)`.
   `atan2(−u,v) = −atan2(u,v)` iken doğru ifade `π − atan2(u,v)` olduğu için
   aradaki fark tam 180°: motor yükselen yerine sürekli **Alçalan'ı (Descendant)**
   döndürüyordu. Yani doğum yeri girilse bile herkesin yükseleni tam karşıt burç
   çıkıyordu.
   *Doğrulama (ev tablolarına karşı, RAMC = 0°):*
   | enlem | tablo | yeni kod | eski kod |
   |---|---|---|---|
   | 0° | 0° Yengeç | 0° Yengeç ✅ | 0° Oğlak ❌ |
   | 41° | 19° Yengeç | 19° Yengeç ✅ | 19° Oğlak ❌ |
   | 51° | ~27° Yengeç | 26° Yengeç ✅ | 26° Oğlak ❌ |

7. **Saat dilimi ziyaretçinin tarayıcısından alınıyordu** (`lunaris-ml.js`)
   Berlin'de oturup İstanbul'da doğan biri için yanlış UT üretiyordu. Artık saat
   dilimi doğum şehrinden geliyor (`"enlem,boylam,saatDilimi"`).

8. **Gün sınırı taşması** (`lunaris-ml.js`) — İstanbul'da 01:00 doğum UT 22:00,
   yani bir önceki gün. Eski kod saati mod 24 alıp aynı güne ekliyordu; bu tam bir
   günlük JD kayması, yıldız zamanında ~1° hata demekti. Artık gün kayması da
   JD'ye yansıyor.

9. **Panel "tüm gezegenler direkt" diyordu** (`index.html`) — motor 5 gezegen
   için retro takip ederken panel sadece Merkür ve Venüs'e bakıyordu. Satürn
   retrodayken skorlar cezayı uyguluyor ama ekran "hepsi direkt" yazıyordu.
   Artık aktif olan her gezegen (yoksa gölge periyodu) listeleniyor.

10. **Dil değişimi yükseleni bozuyordu** (`index.html`) — dil değiştirilince
    okuma doğum yeri olmadan yeniden üretiliyor, yükselen sessizce başka bir
    burca dönüyordu. `birthPlace` artık okumayla birlikte taşınıyor.

11. **Haftalık/aylık okumalar doğum yerini almıyordu** (`lunaris-ml.js`) —
    `generateWeeklyReading` / `generateMonthlyReading` artık `options` alıyor.

12. **Kozmik Takvim çok yıllı hale geldi** (`araclar.html`, `main.js`) —
    tablo 2025-2028'i kapsıyor; ekranda yalnızca süren + gelecek 4 pencere
    gösteriliyor, içinde bulunulan yıldan farklı tarihlere yıl etiketi ekleniyor
    (TR/EN/RU). Başlıklardaki sabit "2026" ifadeleri kaldırıldı. 2026'nın
    17 Şubat halkalı Güneş tutulması eksikti, eklendi.

13. **Ay burcu doğum saatini yok sayıyordu** (`lunaris-ml.js`)
    Ay günde ~13.2° ilerler, yani ~2.3 günde bir burç değiştirir. `getMoonSign()`
    yalnızca tarihi alıyor, saati ve saat dilimini görmezden gelip günün başını
    kullanıyordu; doğum günü içinde sınır geçilen herkes yanlış burç alıyordu.
    20.000 rastgele doğum anıyla ölçüldü: **vakaların %21.8'i**. Form zaten doğum
    saatini topluyordu, sadece motora iletilmiyordu. Artık saat ve (şehir
    seçildiyse) o şehrin saat dilimi hesaba katılıyor.
    *Doğrulama:* 7 farklı saat dilimi, 5000 gerçek doğum anı → **%99.86 doğruluk**
    (öncesi ~%78). Kalan sapmalar burç sınırına dakikalar kalmış anlar.

## Gerçek efemerise geçiş (Astronomy Engine)

Doğrulama sırasında motorun gezegen konumları bağımsız bir referansa karşı
ölçüldü. Sonuç, yorum katmanının büyük bölümünü geçersiz kılıyordu:

| gök cismi | eski ort. hata | doğru burcu bulma |
|---|---|---|
| Güneş | 0.01° | %100 |
| Ay | 0.07° | %99.5 |
| **Merkür** | **73.25°** | **%12.8** |
| **Venüs** | **60.06°** | **%14.9** |
| **Mars** | **22.29°** | **%31.7** |
| Plüton | 16.43° | %42.6 |
| Jüpiter | 7.04° | %78.3 |
| Satürn | 3.83° | %87.7 |
| Uranüs | 3.39° | %88.8 |
| Neptün | 1.31° | %96.0 |

Merkür'ün 73° hatası 2.5 burç demek; doğru burcu bulma oranı %12.8, yani
rastgele tahminden (%8.3) yalnızca biraz iyi. Bu konumlar esas onurları
(dignities), açı motorunu ve aşk/para skorlarını besliyordu — oradaki
yorumlar fiilen gürültüydü. Güneş ve Ay iyiydi, o yüzden hata gözle
görünmüyordu.

**Çözüm:** [Astronomy Engine](https://github.com/cosinekitty/astronomy)
(MIT, Don Cross) projeye alındı — `vendor/astronomy.browser.min.js`, 114 KB,
bağımlılığı ve veri dosyası yok, CDN gerektirmiyor. VSOP87/NOVAS tabanlı,
belgelenmiş doğruluğu **1 yay dakikasından (0.017°) iyi**.

Neden Swiss Ephemeris değil: astroloji yazılımlarının fiili standardı o ve
JPL DE431'i 0.001 yay saniyesiyle üretiyor, ama bir C kütüphanesi + 97 MB
veri dosyası ve AGPL/ticari lisans demek — statik bir siteye taşınabilir
değil. Astronomy Engine bu iş için doğru ölçek.

Değişenler:
- `calcPlanetPositions()` artık geosentrik boylamları kütüphaneden alıyor.
  (Kütüphanenin `EclipticLongitude()` fonksiyonu **heliosentriktir**;
  astrolojinin istediği `GeoVector` + `Ecliptic` bileşimidir.)
- Yükselen burç, yıldız zamanını kütüphanenin `SiderealTime()`inden alıyor
  (nütasyon dahil görünür yıldız zamanı).
- Kütüphane yüklenmezse eski seriler yedek olarak devrede kalır; hangi
  kaynağın kullanıldığı `LunarisML.ephemerisSource()` ile okunabilir.
  Yedek yol ayrıca sınandı: sayfa kırılmıyor, tablo yedeği çalışıyor.

## Retrograd artık tablodan değil, gerçek hareketten

Retrograd, gezegenin geosentrik boylamının azalmasıdır. Elle bakımlı tarih
listesi tutmak yerine bu doğrudan ölçülüyor (dλ/dt < 0). İlkel fonksiyon
`main.js`'te duruyor — iki sayfa da onu yüklediği için Derin Analiz ile
Kozmik Takvim'in çelişmesi artık **yapısal olarak imkânsız**.

Kazanç: tablo her yıl elle güncellenmek zorunda değil, geçmiş doğum
haritaları dahil herhangi bir yıl için çalışıyor. Kozmik Takvim de kendi
pencerelerini hesaplıyor (şu an 2029'a kadar otomatik uzanıyor).

*Doğrulama — iki bağımsız yöntem:*

| pencere | hesaplanan | elle bakımlı tablo |
|---|---|---|
| Merkür | 2026-02-26 → 03-20 | 2026-02-26 → 03-20 |
| Merkür | 2026-06-30 → 07-23 | 2026-06-29 → 07-23 |
| Merkür | 2026-10-24 → 11-13 | 2026-10-24 → 11-13 |
| Venüs | 2026-10-03 → 11-13 | 2026-10-03 → 11-13 |

Tek günlük fark duraklama (istasyon) gününün yuvarlanmasından. 2026'da
toplam Merkür retro günü 68 — astronomik beklenti 60-70. Burç etiketi
istasyon anından alınıyor, çünkü astroloji "Merkür Akrep'te retro" derken
gezegenin geri dönmeye başladığı burcu kasteder; pencerenin ortası
yanıltıcıdır (gezegen çoğu zaman geri geri bir önceki burca kayar).


## Doğrulama

**Bütünlük**
- `origin/main` ile fonksiyon envanteri karşılaştırıldı: `main.js` 58→59,
  `lunaris-ml.js` 64→65, `index.html` 49→49, `araclar.html` 17→17 —
  **kaybolan fonksiyon yok**, eklenenler yalnızca `lunarisIsWithinWindow` ve
  `retroWindows`.
- CSS süslü parantez dengesi 956/956, seçici sayısı 794→796.
- `node --check` → `main.js`, `lunaris-ml.js` ve gömülü sayfa JS'i temiz.
- i18n: üç dil arasında anahtar farkı eklenmedi; her dile tam olarak aynı
  4 yeni anahtar girdi (`deepCityLabel`, `deepCityNone`, `deepCityNoteText`,
  `eclipseAnnularSolar`). Kalan boşluklar birleştirmeden önce de vardı
  (aşağıya bakınız).

**Astronomik doğruluk** (bağımsız 25 terimli Meeus/ELP referansına karşı)
- Ay boylamı, 1950-2030 arası 4000 örnek: ortalama hata **0.073°**, en büyük
  **0.321°** (≈8 dakikalık zaman belirsizliği), aynı burcu verme oranı %99.88.
- Ay burcu, 7 saat diliminde 5000 gerçek doğum anı: **%99.86** doğruluk.
- Yükselen burç, ev tablolarına karşı üç enlemde birebir tutuyor.
- Güneş burcu sınır tarihleri (20/21 Mart, 22/23 Temmuz) doğru.
- Retro tutarlılığı: 2026'nın 365 günü tek tek karşılaştırıldı, motor ile
  Kozmik Takvim **%100 uyumlu**.

**Çalışma**
- Yerel sunucuda üç sayfa da (`index`, `araclar`, `blog`) konsol hatasız
  yükleniyor; tüm varlıklar 200, tek 404 `env.js` (gitignore'da, beklenen).
- `index.html`: tarot açılımı, burç paneli, uyum, derin analiz, ML geri
  bildirimi ve üç dil arasında geçiş çalıştırıldı.
- Derin Analiz: şehirsiz / İstanbul / Sydney; saat 02:00 vs 23:00 aynı günde
  farklı Ay burcu üretiyor (saatin gerçekten işlendiğinin kanıtı);
  `localStorage` geri yüklemesi çalışıyor.
- Dürüst yedek arayüzü doğrulandı: şehir yokken kesikli çerçeve + %72 opaklık
  + görünür not, şehir seçilince düz çerçeve + %100 opaklık + gizli not.
- Form yerleşimi masaüstünde 2 sütun + alt satır, mobilde tek sütun; alanlar
  eşit yükseklikte, formdan kaynaklı yatay taşma yok.
- `araclar.html`: numeroloji, Çin burcu, gezegen saatleri, ritüel, Kozmik
  Takvim ve Ay takvimi çalıştırıldı; takvim ile motor aynı günde aynı cevabı
  veriyor.
- 54 şehrin tamamının `enlem,boylam,saat dilimi` verisi aralık denetiminden
  geçti.

## Birleştirmeyle ilgisi olmayan, önceden var olan bulgular

Bunlar `origin/main` üzerinde de mevcut, bu PR'ın kapsamı dışında bırakıldı:

- **i18n boşlukları**: biyoritim anahtarları (`bioEyebrow`, `bioTitle`,
  `bioPhys` ve 8 tanesi daha) yalnızca Türkçe'de var; `moonRitual*` üç
  anahtarı Türkçe'de eksik; `presetAvatarsLabel` hiçbir dilde yok ama üç
  sayfada da `data-i18n` olarak kullanılıyor; `avatarUpdatedToast` koddan
  çağrılıyor ama Türkçe tabloda yok.
- **Mobilde yatay taşma**: 375px genişlikte belge 639px'e uzuyor. Kaynak hero
  süslemeleri (`.nebula`, `.hero-art`, `.hero-card`) — bu PR'da dokunulan
  hiçbir seçici listede yok.


## Sonraki adım önerileri (yapılmadı)
- `firebase deploy --only firestore:rules` — kural değişikliği canlıya çıkmalı.
- Flood koruması için Firebase App Check (kurallar hız sınırı koymaz).
- ~~Gerçek efemeris kütüphanesi~~ — yapıldı, bkz. "Gerçek efemerise geçiş".
- Skorlama kalibrasyonu: toplam enerji 12 burçta 15-52 aralığında dalgalanıyor
  ve ateş/hava burçlarında sistematik olarak yüksek, toprak/su burçlarında
  düşük çıkıyor. Bu desen `origin/main`'de de aynı (18-54), yani efemeris
  değişikliğinden bağımsız bir tasarım konusu — ama kullanıcı hiçbir zaman
  %52'nin üstünü göremiyor. `scoreForCategory()` sigmoid kalibrasyonu ayrı
  bir turda gözden geçirilmeye değer.
