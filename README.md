<p align="center">
  <img src="https://img.shields.io/badge/LUNARIS-🌙_Tarot_&_Astroloji-7B2FBE?style=for-the-badge&labelColor=0B0714" alt="Lunaris Badge"/>
</p>

<h1 align="center">🌕 LUNARIS</h1>
<p align="center">
  <strong>Tarot · Astroloji · Makine Öğrenmesi Destekli Kozmik Portal</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/Firebase-v10-FFCA28?logo=firebase&logoColor=black" alt="Firebase"/>
  <img src="https://img.shields.io/badge/ML-Saf_JS-7B2FBE" alt="ML"/>
  <img src="https://img.shields.io/badge/Dil-TR_|_EN_|_RU-00ADB5" alt="Çoklu Dil"/>
  <img src="https://img.shields.io/badge/Lisans-MIT-green" alt="License"/>
</p>

<p align="center">
  Kartların sırrı, yıldızların rehberliği.<br/>
  Sıfır bağımlılıklı makine öğrenmesi motoru, gerçek zamanlı topluluk ve kozmik araçlar — tek bir portalda.
</p>

---

## ✨ Özellikler

### 🃏 Tarot Açılımı
- 22 kartlık Büyük Arkana destesi
- 3'lü Açılım: **Geçmiş → Şimdi → Gelecek**
- 3D çevirme animasyonları ve birleşik kehanet metni

### ♈ Astroloji & Burç Yorumları
- **12 Burç İnteraktif Zodyak Çarkı** — 36° açılarla dönen gezegen yörüngeleri
- Günlük ML destekli burç yorumu (Aşk, Kariyer, Şans, Sağlık, Para)
- İki burç arası **Sinerji & Uyum Hesaplayıcı**
- Günün Yıldız Haritası & NASA Astronomi Fotoğrafı

### 🧠 ML Derin Astroloji & Doğum Haritası
- Sıfır dış bağımlılıklı, saf JavaScript **deterministik sinir ağı simülasyonu**
- **8 boyutlu Zodyak Feature Vector** uzayı (Enerji, İstikrar, Macera, Pratiklik, Sosyallik, Sezgi, Liderlik, Duyarlılık)
- **Natal Harita**: Güneş, Ay ve Yükselen Burç hesaplaması
- SVG Radar Grafiği ile kişilik profili görselleştirmesi
- 12 aylık **Gelecek Enerji Zaman Çizelgesi**
- Keldani Gezegensel Saat matrisi
- J2000 referanslı Gezegen Transit & Retrograd motoru

### 🔮 Kozmik Araçlar
- **Kutsal Numeroloji** — Yaşam Yolu Sayısı & Usta Sayılar (11, 22, 33)
- **Doğu Astrolojisi** — 12 Hayvan Totemi & 5 Element Mührü
- **Batı Zodyak Dekanları** & 3D Enerji Dengesi
- 2026 Astronomik Takvimi (Merkür Retroları & Tutulmalar)
- Dinamik Aylık **Ay Evresi Takvimi**

### 📖 Mistik Blog
- Ay ritüelleri, kristal rehberleri ve gezegen hareketleri makaleleri
- Tam ekran okuma modalleri & dinamik etiket filtreleme

### 🌟 Topluluk & Sosyal
- **Gerçek Zamanlı Topluluk Duvarı** (Firestore onSnapshot)
- **Kolektif Dilek Feneri** — Canvas tabanlı yıldız animasyonları
- Beğeni, paylaşım ve ruh hali ikonları

### 🎨 Tasarım
- **Glassmorphic** (buzlu cam) koyu tema
- Altın & ametist ışıltılı parçacık animasyonları
- Kayan yıldız & fare izi efektleri
- SVG takımyıldız çizim motoru
- Tam responsive mobil tasarım

### 🌐 Çoklu Dil
- **Türkçe** 🇹🇷 · **English** 🇬🇧 · **Русский** 🇷🇺
- Anlık dil geçişi (localStorage kalıcılığı ile)

---

## 📁 Proje Yapısı

```
lunaris/
├── index.html           # Ana portal (Tarot, Burçlar, ML Analiz, Topluluk)
├── araclar.html         # Kozmik araçlar (Numeroloji, Çin Burcu, Takvim)
├── blog.html            # Mistik blog makaleleri
├── style.css            # Kozmik tasarım sistemi & animasyonlar
├── main.js              # Ortak arayüz, dil motoru & çekirdek kütüphane
├── lunaris-ml.js        # ML & astroloji motoru (sıfır bağımlılık)
├── firebase-config.js   # Firebase Auth, Firestore & offline demo servisi
├── env.js               # 🔒 Firebase credential'ları (gitignore'da)
├── env.example.js       # Credential şablonu
├── firebase.json        # Firebase Hosting yapılandırması
├── firestore.rules      # Firestore güvenlik kuralları
└── .firebaserc          # Firebase proje bağlantısı
```

---

## 🚀 Kurulum & Çalıştırma

### Hızlı Başlangıç (Firebase olmadan)

Herhangi bir kurulum gerekmez! `index.html` dosyasını tarayıcınızda açmanız yeterlidir. **Akıllı Demo Modu** sayesinde tüm özellikler Firebase bağlantısı olmadan çalışır.

```bash
# Repoyu klonlayın
git clone https://github.com/berkelmali/Lunaris.git
cd Lunaris

# Tarayıcınızda açın
start index.html        # Windows
open index.html         # macOS
xdg-open index.html     # Linux
```

### Firebase ile Tam Kurulum (Opsiyonel)

Firebase bağlantısı ile gerçek zamanlı topluluk duvarı, kullanıcı hesapları ve bulut kayıt özelliklerini aktif edebilirsiniz.

1. [Firebase Console](https://console.firebase.google.com/)'da bir proje oluşturun
2. **Authentication** → E-posta/Şifre ve Google sağlayıcılarını aktif edin
3. **Cloud Firestore** veritabanını oluşturun
4. Web uygulaması ekleyip yapılandırma bilgilerini kopyalayın
5. `env.example.js` dosyasını `env.js` olarak kopyalayıp bilgilerinizi girin:

```bash
cp env.example.js env.js
```

```javascript
// env.js
const ENV = {
  FIREBASE_API_KEY: "your-api-key",
  FIREBASE_AUTH_DOMAIN: "your-project.firebaseapp.com",
  FIREBASE_PROJECT_ID: "your-project-id",
  FIREBASE_STORAGE_BUCKET: "your-project.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID: "123456789",
  FIREBASE_APP_ID: "1:123456789:web:abcdef",
  FIREBASE_MEASUREMENT_ID: "G-XXXXXXXXXX"
};
export default ENV;
```

### Firebase'e Deploy

```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

---

## 🧠 ML Motoru Mimarisi

Lunaris'in makine öğrenmesi motoru (`lunaris-ml.js`) **sıfır dış bağımlılık** ile çalışan saf JavaScript deterministik bir sistemdir.

```
┌─────────────────────────────────────────────────┐
│              LunarisML Motor                     │
├─────────────────────────────────────────────────┤
│  Matematiksel Çekirdek                          │
│  ├── sigmoid(x)         → Normalize (0-1)       │
│  ├── dot(a, b)          → Skaler çarpım         │
│  ├── cosineSimilarity() → Vektör benzerliği      │
│  └── julianDay()        → Astronomik tarih       │
├─────────────────────────────────────────────────┤
│  Vektör Uzayı                                    │
│  ├── 12 × 8D Burç Vektörleri (SIGN_VECTORS)     │
│  └── 6 × 8D Kategori Ağırlıkları                │
├─────────────────────────────────────────────────┤
│  Algoritmalar                                    │
│  ├── Natal Harita (Güneş %50 + Ay %30 + Yük %20)│
│  ├── Keldani Gezegensel Saat                     │
│  ├── J2000 Gezegen Transitleri                   │
│  └── 12 Aylık Enerji Simülasyonu                 │
└─────────────────────────────────────────────────┘
```

---

## 🔐 Güvenlik

- Firebase credential'ları `env.js` dosyasında tutulur ve **gitignore'dadır**
- Firestore güvenlik kuralları `firestore.rules` dosyasında tanımlıdır
- Firebase bağlanmadığında otomatik **Akıllı Demo Modu** devreye girer
- Topluluk duvarında 10 saniyelik spam koruması aktiftir

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| **ML Motoru** | Saf JavaScript (sıfır bağımlılık) |
| **Kimlik Doğrulama** | Firebase Auth (E-posta, Google) |
| **Veritabanı** | Cloud Firestore (gerçek zamanlı) |
| **Hosting** | Firebase Hosting |
| **Tasarım** | Glassmorphism, CSS Animations, SVG |
| **Fontlar** | Cinzel Decorative, Yeseva One, Alegreya |

---

## 🤝 Katkıda Bulunma

1. Bu repoyu **fork** edin
2. Yeni bir branch oluşturun: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerinizi commit edin: `git commit -m 'feat: yeni özellik ekle'`
4. Branch'inizi push edin: `git push origin feature/yeni-ozellik`
5. Bir **Pull Request** açın

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

<p align="center">
  <strong>🌙 Yıldızlar rehberin olsun.</strong><br/>
  <sub>Lunaris ile kozmik yolculuğuna başla.</sub>
</p>
