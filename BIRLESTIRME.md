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

## Doğrulama
- `node --check` → main.js, lunaris-ml.js, araclar.html/index.html gömülü JS temiz.
- Yerel sunucuda her iki sayfa da konsol hatasız yükleniyor (tek 404: `env.js`,
  gitignore'da olduğu için beklenen).
- Derin Analiz akışı tarayıcıda uçtan uca çalıştırıldı: şehirsiz / İstanbul /
  Sydney, üç dilde dil değiştirme, localStorage geri yükleme.
- Numeroloji gösterimi 4 tarihte `lifePathNumber()` ile birebir uyuştu.

## Sonraki adım önerileri (yapılmadı)
- `firebase deploy --only firestore:rules` — kural değişikliği canlıya çıkmalı.
- Flood koruması için Firebase App Check (kurallar hız sınırı koymaz).
- Gerçek efemeris kütüphanesi (ör. astronomy-engine): burç sınırına çok yakın
  doğumlarda ortalama yörünge yaklaşıklığı hâlâ birkaç derece sapabilir.
