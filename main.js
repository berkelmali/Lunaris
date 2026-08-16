/* ==========================================================
   LUNARIS — shared site logic (main.js)
   Used by index.html, araclar.html and blog.html.
   Contains: translations, language persistence, icon system,
   shared header/nav, ambient background effects,
   preloader loading screen, glassmorphic auth modal,
   account profile management (photo upload, tarot + horoscope history) & toast alerts.
   ========================================================== */

const PREFERRED_LANG_KEY = "lunaris_preferred_lang";

function getInitialLang() {
  try {
    const saved = localStorage.getItem(PREFERRED_LANG_KEY);
    if (saved && (saved === "tr" || saved === "en" || saved === "ru")) {
      return saved;
    }
  } catch (e) {}
  return "tr";
}

const state = { 
  lang: getInitialLang(), 
  selectedSign: null, 
  spread: [], 
  wallMood: "starry", 
  wallPosts: [], 
  openBlogKey: null,
  activeAccountTab: "tarot"
};

const UI = {
  tr: {
    brandTag: "Tarot & Astroloji", heroEyebrow: "Kartlar & Yıldızlar",
    heroTitle: "Kartların Sırrı, Yıldızların Rehberliği",
    heroText: "Kadim tarot kartları ve gökyüzünün dilini bir araya getirdik. Bugün kartlarını çek, burcunun ne fısıldadığını dinle.",
    heroCta: "Falına Bak", heroCardName: "Yıldız", heroCardLabel: "Bugünün Yıldızı", moonLabel: "Ay Evresi", nowLabel: "Şu An",
    starmapTitle: "Bugünün Yıldız Haritası", starmapText: "Evrenin gerçek görüntüleri eşliğinde, bu gecenin enerjisini keşfet.", starmapCreditPrefix: "Fotoğraf",
    posterLabel: "Gökyüzü Haritası", posterSub: "Bugün Doğan Takımyıldız",
    compatTitle: "Burç Uyumu", compatText: "İki burcu seç, evrenin aranızdaki bağ hakkında ne söylediğine bak.", compatLabel1: "1. Burç", compatLabel2: "2. Burç", compatBtn: "Uyumu Gör", compatScoreLabel: "Uyum Skoru", tierHigh: "Kader Birliği", tierGood: "Güçlü Uyum", tierMid: "Çalışmaya Değer", tierLow: "Zorlu ama İmkansız Değil",
    
    // Auth & Giriş Ekranı
    loginBtn: "Giriş Yap", authModalTitle: "Kozmik Portal", authModalSub: "Yıldızların rehberliğine adım at",
    authTabLogin: "Giriş Yap", authTabSignup: "Kayıt Ol", authTabForgot: "Şifremi Unuttum",
    authUsernamePh: "Kullanıcı Adın", authEmailPh: "E-posta adresin", authPasswordPh: "Şifren", authPasswordMinPh: "Şifre (en az 6 karakter)",
    authCreateBtn: "Hesap Oluştur", authGoogleBtn: "Google ile Devam Et", authDemoBtn: "✨ Demo / Misafir Moduyla Giriş Yap",
    authForgotTitle: "Şifre Sıfırlama", authForgotSub: "Kayıtlı e-posta adresini gir, sıfırlama bağlantısını hemen gönderelim.",
    authSendResetBtn: "Sıfırlama Bağlantısı Gönder", authBackToLogin: "Giriş Ekranına Dön",
    authResetSuccess: "Şifre sıfırlama bağlantısı e-posta adresine gönderildi ✨",
    authNotConfiguredNote: "Firebase yapılandırması henüz girilmedi. İstersen Demo Modu ile hemen test edebilirsin.",
    authErrNotConfigured: "Hesap sistemi henüz aktif değil.", authErrGeneric: "Bir şeyler ters gitti, tekrar dene.",
    authErrInUse: "Bu e-posta adresi zaten kayıtlı.", authErrWeak: "Şifre en az 6 karakter olmalıdır.",
    authErrInvalidEmail: "Lütfen geçerli bir e-posta adresi gir.",
    authErrWrongPassword: "Girdiğin şifre hatalı. Lütfen tekrar dene.",
    authErrNotFound: "Bu e-posta adresine ait bir hesap bulunamadı.",
    authErrInvalidCred: "E-posta veya şifre hatalı. Hesabın yoksa Kayıt Ol sekmesinden oluşturabilirsin.",
    authErrTooMany: "Çok fazla hatalı giriş denemesi yapıldı. Lütfen biraz bekleyip tekrar dene.",
    authErrUserDisabled: "Bu hesap erişime kapatılmıştır.",
    authErrEmptyUsername: "Lütfen bir kullanıcı adı girin.",
    authErrEmptyPassword: "Lütfen şifreni gir.",
    authErrUnauthorizedDomain: "Bu alan adı (lunaris.web.app) Firebase Console'da 'Authorized Domains' listesine eklenmelidir.",
    authErrOpNotAllowed: "Google ile giriş Firebase Console'da henüz aktif edilmedi.",
    authErrPopupClosed: "Giriş penceresi kapatıldı.",
    authErrPopupBlocked: "Tarayıcı açılır pencereyi engelledi. Lütfen popup izni verin.",
    toastWelcome: "Hoş geldin, {name} ✨", toastLogout: "Oturum kapatıldı. Yıldızlar seninle olsun 🌙",
    prefLangLabel: "Tercih Edilen Dil:",
    
    // Profil & Fotoğraf & Geçmiş
    accountLabel: "Hesabım", logoutBtn: "Çıkış Yap", 
    changeAvatarLabel: "Profil Fotoğrafı:", uploadPhotoBtn: "📷 Fotoğraf Yükle",
    tabTarotHist: "🃏 Tarot Fallarım", tabHoroHist: "⭐ Burç Yorumlarım", tabWishesHist: "🌟 Dileklerim",
    historyTitle: "Geçmiş Okumaların",
    historyEmpty: "Henüz kayıtlı bir falın yok. Bir tarot açılımı yap, burada saklansın.", 
    horoHistoryEmpty: "Henüz kaydedilmiş burç yorumun yok. Burcunu seçip 'Yorumu Kaydet'e basarak burada saklayabilirsin.",
    wishesHistoryEmpty: "Henüz gökyüzüne bir dilek fırlatmadın. Dilek Feneri'nden niyetini fısılda, yıldızın burada parıldasın ✨",
    wishLightCountBadge: "{count} Işık / Enerji Verildi", wishLightsLabel: "Işık / Enerji",
    historyLoading: "Yıldızların kayıtları yükleniyor...", historyError: "Geçmiş yüklenemedi.",
    saveHoroBtn: "✦ Günlük Yorumu Profilime Kaydet", horoSavedBadge: "Kaydedildi ✓",
    horoSavedToast: "{sign} burcu yorumu profiline kaydedildi ✨",
    
    // Preloader Yükleme Sözleri
    preloaderQuote1: "Kozmik enerjiler yükleniyor...",
    preloaderQuote2: "Yıldızlar senin için hizalanıyor...",
    preloaderQuote3: "Kadim sembollerin dili çözülüyor...",

    featTitle: "Neler Sunuyoruz",
    feat1Title: "22 Kartlık Büyük Arkana", feat1Desc: "Özenle tasarlanmış benzersiz desteden geçmiş-şimdi-gelecek açılımı çek, her kartın anlamını keşfet.",
    feat2Title: "Her Gün Yenilenen Burç Yorumu", feat2Desc: "12 burç için aşk, şans, günlük hayat ve para yorumları her gün değişiyor, hep taze hep senin için.",
    feat3Title: "3 Dilde Kesintisiz Deneyim", feat3Desc: "Türkçe, İngilizce ve Rusça arasında tek tıkla geç, hangi dilde rahatsan o dilde fal baktır.",
    feat4Title: "Sıkıcı Değil, Esprili", feat4Desc: "Klasik kehanet dilinden sıkıldıysan doğru yerdesin, her burç için özgün ve gülümseten yorumlar burada.",
    tarotTitle: "Kartlarını Çek", tarotText: "Zihnini boşalt, aklındaki soruyu düşün ve üç kartlık açılımını gör: geçmişin, şimdin ve geleceğin.",
    drawBtn: "Kartları Çek", redrawBtn: "Yeniden Çek", comboTitle: "Kartlarının Birleşik Yorumu",
    tarotMlTitle: "✦ ML Nöral Tarot Sentezi & Kozmik Rezonans",
    tarotResonanceLabel: "Kozmik Rezonans Skoru",
    tarotPlanetaryImpact: "Gezegen Saati & Ay Fazı Rezonansı",
    tarotAlchemyTitle: "Elementel Simya Dağılımı",
    tarotAdviceTitle: "🎯 ML Nöral Eylem Rehberi",
    tarotMantraTitle: "🔮 Günün Kozmik Mantrası",
    tarotEnergyLove: "Aşk", tarotEnergyCareer: "Kariyer", tarotEnergyLuck: "Şans", tarotEnergyHealth: "Şifa & Ruh", tarotEnergyMoney: "Maddiyat",
    posPast: "Geçmiş", posPresent: "Şimdi", posFuture: "Gelecek",
    horoTitle: "Bugünün Burç Yorumları", horoText: "Burcunu seç, evrenin bugün senin için ne hazırladığına bak.",
    todayLabel: "Bugün", selectPrompt: "Yukarıdan burcunu seç",
    luckyNumLabel: "Şanslı Sayı", luckyColorLabel: "Şanslı Renk", energyLabel: "Enerji",
    footerText: "LUNARIS eğlence amaçlıdır, kararlarını yıldızlara değil kendi sezgine bırak.", footerCredit: "✨ ile hazırlandı",
    navTarot: "Tarot", navHoro: "Burçlar", navCompat: "Uyum", navBlog: "Blog", navWall: "Topluluk",
    blogEyebrow: "Mistik Notlar", blogTitle: "LUNARIS Blog", blogText: "Ay evrelerinden kristal enerjisine, kartların dilinden gezegenlerin oyununa kadar okuman için hazırladıklarımız.", blogReadMore: "Devamını Oku", blogMinRead: "dk okuma",
    
    // Topluluk Duvarı
    wallEyebrow: "Herkese Açık", wallTitle: "Topluluk Duvarı", wallText: "Bugün enerjini seç, birkaç kelimeyle paylaş; aynı gökyüzünün altındaki herkes görsün.",
    wallGateTitle: "Topluluk Duvarına Katıl",
    wallGateText: "Duvarda fısıltı paylaşmak ve topluluk enerjisine katılmak için lütfen giriş yapın veya ücretsiz hesap oluşturun.",
    wallGateBtn: "Giriş Yap / Kayıt Ol",
    wallAuthorTag: "Kozmik Gezgin",
    wallMessagePh: "Bugün evren sana ne fısıldıyor?", wallSubmitBtn: "Paylaş", wallRefreshBtn: "Duvarı Yenile", wallLoading: "Fısıltılar yükleniyor...", wallEmpty: "Henüz kimse yazmamış, ilk fısıltıyı sen bırak.", wallLocalNote: "Firebase yapılandırılmadığı için mesajlar şimdilik bu tarayıcıda saklanıyor.", wallSyncedNote: "Mesajın tüm ziyaretçilerle paylaşılıyor ✦", wallTextRequired: "Mesajın boş olamaz.", wallLoginRequired: "Duvarda paylaşım yapmak için lütfen önce giriş yapın.", wallCooldown: "Biraz nefes al, birazdan tekrar paylaşabilirsin.", wallJustNow: "az önce", wallMinAgo: "dk önce", wallHourAgo: "sa önce", wallDayAgo: "gün önce",
    moodStarry: "Işıltılı", moodLoved: "Aşk Dolu", moodLucky: "Şanslı", moodDreamy: "Hayalperest", blogAccountNote: "Geçmiş fallarını görmek için ana sayfaya dön.",
    navTools: "Araçlar", toolsEyebrow: "Kozmik Doğum Matrisi", toolsTitle: "Astrolojik Doğum Haritan", toolsText: "Doğum tarihini gir; kutsal numeroloji sayını, Doğu astrolojisi 5 element mührünü ve Güneş burcunun kozmik güç dengesini keşfet.",
    toolsDateLabel: "Doğum Tarihin", toolsCalcBtn: "✦ Kozmik İmzamı Çöz", toolsDateRequired: "Lütfen doğum tarihini seç.",
    numeroEyebrow: "Kutsal Numeroloji", numeroTitle: "Yaşam Yolu Sayın", numeroBadgePending: "✦ Yaşam Yolu", numeroEmptyTitle: "Kutsal Sayı Frekansı", numeroEmpty: "Doğum tarihini girerek yaşam yolu sayını, gezegensel titreşimini ve solfeggio frekansını keşfet.", numeroEmptyChip: "✦ 1 - 9 & Usta Sayılar (11, 22, 33)", numeroNote: "Numeroloji ve doğum analizi kadim ezoterik sistemlere ve astronomik takvim hesaplamalarına dayanır.",
    chineseEyebrow: "Doğu Astrolojisi & Çin Burcu", chineseTitle: "Çin Burcun & Element Mührü", chineseBadgePending: "✦ 5 Element Mührü", chineseEmptyTitle: "Doğu Mührü & 5 Element", chineseEmpty: "12 Göksel Hayvan totemini, Yin/Yang polariteni ve Ahşap, Ateş, Toprak, Metal, Su element dengeni mühürle.", chineseEmptyChip: "✦ 12 Yıllık Ay Takvimi Döngüsü", chineseNote: "Çin burcu Ay takvimine göre Ocak/Şubat civarında değişir; sınır tarihlerde doğduysan gerçek yılın bir öncekiyle aynı olabilir.",
    westernEyebrow: "Güneş Burcu & Element Dengesi", westernTitle: "Kozmik Doğum İmzası", westernBadgePending: "✦ Güneş Haritası", westernEmptyTitle: "Güneş İmzası & Enerji Radarı", westernEmpty: "Güneş burcunun dekansal arketiplerini, sezgisel derinliğini ve manyetik aura güç dengesini ortaya çıkar.", westernEmptyChip: "✦ Zodyak Dekanı & 3 Boyutlu Güç Dengesi",
    matrixVibeLabel: "Gezegensel Titreşim", matrixChakraLabel: "Kozmik Çakra", matrixLuckyNumLabel: "Şanslı Sayılar", matrixLuckyColLabel: "Aura Renkleri",
    matrixIntuition: "Ruhsal Sezgi", matrixCharm: "Manyetik Çekim", matrixFocus: "Zihinsel Odak",
    cosmicEyebrow: "Kozmik Takvim", cosmicTitle: "2026'da Gökyüzü", cosmicText: "Merkür'ün retro dönemleri ve bu yılın tutulmaları — gerçek astronomik tarihlerle.", cosmicRetroActive: "Şu an Merkür retrosundayız", cosmicRetroDirect: "Şu an Merkür direkt (normal) ilerliyor", cosmicDaysLeft: "gün kaldı", cosmicUntilNext: "sonraki retroya", cosmicRetroListTitle: "2026 Merkür Retro Dönemleri", cosmicEclipseListTitle: "2026 Tutulmaları", cosmicNote: "Tarihler 2026 yılına özeldir ve yaygın astronomik/astrolojik kaynaklara dayanır.",
    moonCalEyebrow: "Ay Takvimi", moonCalTitle: "Aylık Ay Evreleri", moonCalText: "Ayın bu ayki tüm evrelerini gör, günden güne takip et.", moonCalToday: "Bugün",
    eclipseTotalLunar: "Tam Ay Tutulması", eclipseTotalSolar: "Tam Güneş Tutulması", eclipsePartialLunar: "Parçalı Ay Tutulması",
    monthJan: "Ocak", monthFeb: "Şubat", monthMar: "Mart", monthApr: "Nisan", monthMay: "Mayıs", monthJun: "Haziran", monthJul: "Temmuz", monthAug: "Ağustos", monthSep: "Eylül", monthOct: "Ekim", monthNov: "Kasım", monthDec: "Aralık",
    wdMon: "Pt", wdTue: "Sa", wdWed: "Ça", wdThu: "Pe", wdFri: "Cu", wdSat: "Ct", wdSun: "Pz",

    // ML Derin Astroloji Bölümü TR
    deepEyebrow: "ML Astroloji Motoru", deepTitle: "Derin Astroloji & Doğum Haritası",
    deepText: "Doğum tarihinle astrolojik DNA'nı çöz. Makine öğrenmesi algoritması güneş burcu, ay burcu, yükselen burç, gezegen saati ve ay fazını birleştirerek sana özgü derin bir yorum üretiyor.",
    deepBirthLabel: "Doğum Tarihin", deepHourLabel: "Doğum Saatin (opsiyonel)",
    deepHourPh: "ör. 14:30", deepCalcBtn: "✦ Kozmik DNA'mı Çöz",
    deepNatalTitle: "Natal Haritanın Üç Sütunu",
    deepSunLabel: "Güneş Burcu", deepMoonLabel: "Ay Burcu", deepAscLabel: "Yükselen Burç",
    deepProfileTitle: "Kişilik Profil Radarı",
    deepReadingTitle: "ML ile Üretilmiş Günlük Derin Yorum",
    deepCatLove: "Aşk", deepCatLuck: "Şans", deepCatCareer: "Kariyer", deepCatHealth: "Sağlık", deepCatMoney: "Para",
    deepStatsTitle: "Kozmik Anlık Durum",
    deepPlanetHourLabel: "Şu Anki Gezegen Saati",
    deepMoonPhaseLabel: "Ay Fazı",
    deepRetrogradLabel: "Retrograd Durumu",
    deepAspectsLabel: "Önemli Gezegen Açıları",
    deepRetrogradNone: "✓ Tüm gezegenler direkt ilerliyor",
    deepTimelineTitle: "12 Aylık Enerji Tahmini",
    deepTimelineEnergy: "Genel", deepTimelineLove: "Aşk", deepTimelineCareer: "Kariyer", deepTimelineLuck: "Şans",
    deepInsightTitle: "Güçlü Yönler & Zorluklar",
    deepStrengthLabel: "Doğal Güçün", deepChallengeLabel: "Geliştirme Alanın",
    deepLuckyNum: "Bugünkü Şanslı Sayı", deepLuckyColor: "Bugünkü Şanslı Renk",
    deepEnergyScore: "Genel Enerji Skoru",
    deepMlBadge: "ML Motoru", deepMlNote: "Bu yorum güneş burcu, ay fazı, gezegen saati, mevsim ve natal harita verilerini birleştiren bir algoritma tarafından üretilmiştir.",
    deepDateRequired: "Lütfen doğum tarihini gir.",
    deepHoursLabel: "saat",
    navDeep: "Derin Analiz",

    // 5 Yeni Kozmik Özellik TR
    auraEyebrow: "Kozmik Frekans & Aura", auraTitle: "Günün Aura Kartı", auraText: "Burcunu ve günün enerjisini birleştir; bugün evrenle titreştiğin frekansı, aura rengini ve güç elementlerini keşfet.", auraSelectSign: "Burcunu Seç", auraScanBtn: "Auranı Tara & Kartı Üret", auraDownloadStoryBtn: "📲 Hikaye (9:16) Olarak İndir", auraPowerIntuition: "Sezgi Gücü", auraPowerAttraction: "Çekim / Manyetizma", auraPowerSerenity: "İçsel Dinginlik", auraMantraTitle: "Günün Mantrası", auraStoryDownloadedToast: "Aura kartın başarıyla hazırlandı ve indirildi ✨",
    auraSolfeggioUnit: "Hz Solfeggio Frekansı", auraCosmicGuideCanvas: "lunaris.web.app  ✦  Kozmik Rehberin",
    
    wishEyebrow: "Kolektif Gökyüzü", wishTitle: "Yıldız Galaksisi & Dilek Feneri", wishText: "Evrene niyetini fısılda, gökyüzünde parıldayan bir yıldıza dönüşsün. Başkalarının yıldızlarına tıklayarak ışık ve pozitif enerji gönder.", wishCategoryLabel: "Niyet Alanı:", wishCatLove: "💖 Aşk & Ruh Eşi", wishCatPeace: "🕊️ Huzur & Arınma", wishCatWealth: "💰 Bolluk & Bereket", wishCatHealth: "🌿 Şifa & Güç", wishCatFuture: "🌟 Gelecek & Başarı", wishInputPh: "Evrene bırakmak istediğin niyetini yaz...", wishSendBtn: "✦ Dileği Yıldızlara Fırlat", wishLightSentToast: "Yıldıza ışık ve pozitif enerji gönderildi ✨", wishModalTitle: "Kozmik Dilek Yıldızı", wishModalAuthor: "Niyet Sahibi:", wishModalLightBtn: "✦ Işık Gönder / Enerji Ver",
    
    orbitEyebrow: "Kozmik Sinerji", orbitTitle: "Yörünge Radarı & Çekim Analizi", orbitText: "İki ruh arasındaki çekimi, element dengesini ve 4 boyutlu sinerji radarını keşfet.", orbitSign1: "1. Kişinin Burcu", orbitSign2: "2. Kişinin Burcu", orbitCalcBtn: "🪐 Yörüngeyi Hesapla", orbitResonance: "Duygusal Rezonans", orbitMind: "Zihin & İletişim", orbitPassion: "Tutku & Manyetizma", orbitDestiny: "Kader & Karmik Bağ", orbitElementTitle: "Element Simyası", orbitAdviceTitle: "Kozmik Tavsiye",
    
    pendulumEyebrow: "Mistik Sarkaç", pendulumTitle: "Evet / Hayır Kehaneti", pendulumText: "Zihnini odakla, aklındaki soruyu tut ve ametist kristali sarkacını serbest bırak.", pendulumInputPh: "Zihnindeki soruyu buraya fısılda (örn: 'Bu adım benim için doğru mu?')", pendulumSwingBtn: "🔮 Sarkacı Sallandır", pendulumSwinging: "Kristal kozmik titreşimleri topluyor...", pendulumYes: "✦ KESİN EVET — Evren arkanda!", pendulumNo: "✦ HAYIR — Enerji henüz olgunlaşmadı.", pendulumWait: "✦ ZAMAN VAR — Acele etme, sabret.", pendulumAdvicePrefix: "Rehberlik:",
    
    moonRitualEyebrow: "Ay Döngüsü & Ritüel", moonRitualTitle: "Canlı Ay Fazı & Kozmik Ritüeller", moonRitualText: "O anki gerçek astronomik Ay fazını, Ay'ın bulunduğu burcu ve günün enerjisini yükseltecek niyet ritüellerini incele.", moonPhaseCurrent: "Şu Anki Ay Fazı", moonIlluminationLabel: "Aydınlanma", moonZodiacSignLabel: "Ay Burcu", moonRitualTitleLabel: "Günün Ritüeli & Meditasyonu", moonCrystalsLabel: "Enerji Taşları", moonIncenseLabel: "Aromaterapi & Tütsü", moonNextFullLabel: "Sonraki Dolunaya Kalan"
  },
  en: {
    brandTag: "Tarot & Astrology", heroEyebrow: "Cards & Stars",
    heroTitle: "The Secret of Cards, the Guidance of Stars",
    heroText: "Ancient tarot and the language of the sky, together in one place. Draw your cards today and hear what your sign is whispering.",
    heroCta: "Reveal My Fortune", heroCardName: "The Star", heroCardLabel: "Today's Star", moonLabel: "Moon Phase", nowLabel: "Right Now",
    starmapTitle: "Today's Star Map", starmapText: "Real images from across the universe, and what tonight's energy means for you.", starmapCreditPrefix: "Photo",
    posterLabel: "Sky Chart", posterSub: "Constellation Ruling Today",
    compatTitle: "Zodiac Compatibility", compatText: "Pick two signs and see what the universe says about the bond between you.", compatLabel1: "1st Sign", compatLabel2: "2nd Sign", compatBtn: "See the Match", compatScoreLabel: "Compatibility Score", tierHigh: "Written in the Stars", tierGood: "Strong Match", tierMid: "Worth the Work", tierLow: "Challenging, Not Impossible",
    
    // Auth & Login EN
    loginBtn: "Log In", authModalTitle: "Cosmic Portal", authModalSub: "Step into the celestial realm",
    authTabLogin: "Log In", authTabSignup: "Sign Up", authTabForgot: "Forgot Password",
    authUsernamePh: "Your Username", authEmailPh: "Your email address", authPasswordPh: "Your password", authPasswordMinPh: "Password (min 6 characters)",
    authCreateBtn: "Create Account", authGoogleBtn: "Continue with Google", authDemoBtn: "✨ Continue in Demo / Guest Mode",
    authForgotTitle: "Reset Password", authForgotSub: "Enter your registered email and we will send you a reset link.",
    authSendResetBtn: "Send Reset Link", authBackToLogin: "Back to Login",
    authResetSuccess: "Password reset link sent to your email ✨",
    authNotConfiguredNote: "Firebase is not configured yet. You can try the Demo Mode right now.",
    authErrNotConfigured: "Accounts aren't active yet.", authErrGeneric: "Something went wrong, try again.",
    authErrInUse: "This email is already registered.", authErrWeak: "Password must be at least 6 characters.",
    authErrInvalidEmail: "Enter a valid email.",
    authErrWrongPassword: "Incorrect password. Please try again.",
    authErrNotFound: "No account found with this email address.",
    authErrInvalidCred: "Incorrect email or password. You can create an account in the Sign Up tab.",
    authErrTooMany: "Too many failed attempts. Please wait a moment and try again.",
    authErrUserDisabled: "This account has been disabled.",
    authErrEmptyUsername: "Please choose a username.",
    authErrEmptyPassword: "Please enter your password.",
    authErrUnauthorizedDomain: "This domain must be added to Firebase Console 'Authorized Domains'.",
    authErrOpNotAllowed: "Google sign-in is not enabled in Firebase Console yet.",
    authErrPopupClosed: "Sign-in popup was closed.",
    authErrPopupBlocked: "Popup was blocked by your browser. Please allow popups.",
    toastWelcome: "Welcome, {name} ✨", toastLogout: "Logged out. May the stars guide you 🌙",
    prefLangLabel: "Preferred Language:",

    // Profile & History EN
    accountLabel: "My Account", logoutBtn: "Log Out",
    changeAvatarLabel: "Profile Picture:", uploadPhotoBtn: "📷 Upload Photo",
    presetAvatarsLabel: "Choose Cosmic Avatar:", avatarUpdatedToast: "Profile picture updated ✨",
    tabTarotHist: "🃏 Tarot Readings", tabHoroHist: "⭐ Horoscopes", tabWishesHist: "🌟 My Wishes",
    historyTitle: "Your Saved Readings",
    historyEmpty: "No saved tarot readings yet. Draw a spread and it'll be kept here.",
    horoHistoryEmpty: "No saved horoscopes yet. Pick your sign and click 'Save to Profile' to store it here.",
    wishesHistoryEmpty: "You haven't released a wish to the cosmos yet. Whisper your intent at the Wishfield to see your star shine here ✨",
    wishLightCountBadge: "{count} Light / Energy Sent", wishLightsLabel: "Light / Energy",
    historyLoading: "Loading celestial archives...", historyError: "Couldn't load your history.",
    saveHoroBtn: "✦ Save Today's Horoscope", horoSavedBadge: "Saved ✓",
    horoSavedToast: "{sign} reading saved to your profile ✨",

    // Preloader Quotes EN
    preloaderQuote1: "Cosmic energies are loading...",
    preloaderQuote2: "The stars are aligning for you...",
    preloaderQuote3: "Whispers of ancient symbols awaken...",

    featTitle: "What You'll Find Here",
    feat1Title: "22-Card Major Arcana", feat1Desc: "Draw a past-present-future spread from a uniquely designed deck and uncover what each card means.",
    feat2Title: "Horoscopes That Refresh Daily", feat2Desc: "Love, luck, daily life and money readings for all 12 signs, updated every day, just for you.",
    feat3Title: "Switch Between 3 Languages", feat3Desc: "Move between Turkish, English and Russian in one tap, and get your reading in whichever feels like home.",
    feat4Title: "Playful, Never Predictable", feat4Desc: "Tired of stiff fortune-telling clichés? Every sign gets its own witty, one-of-a-kind commentary here.",
    tarotTitle: "Draw Your Cards", tarotText: "Clear your mind, hold your question, and reveal your three-card spread: your past, present and future.",
    drawBtn: "Draw the Cards", redrawBtn: "Draw Again", comboTitle: "Your Combined Reading",
    tarotMlTitle: "✦ ML Neural Tarot Synthesis & Cosmic Resonance",
    tarotResonanceLabel: "Cosmic Resonance Score",
    tarotPlanetaryImpact: "Planetary Hour & Moon Phase Alignment",
    tarotAlchemyTitle: "Elemental Alchemy Distribution",
    tarotAdviceTitle: "🎯 ML Neural Action Directive",
    tarotMantraTitle: "🔮 Cosmic Daily Mantra",
    tarotEnergyLove: "Love", tarotEnergyCareer: "Career", tarotEnergyLuck: "Luck", tarotEnergyHealth: "Health & Spirit", tarotEnergyMoney: "Wealth",
    posPast: "Past", posPresent: "Present", posFuture: "Future",
    horoTitle: "Today's Horoscope", horoText: "Pick your sign and see what the universe has planned for you today.",
    todayLabel: "Today", selectPrompt: "Choose your sign above",
    luckyNumLabel: "Lucky Number", luckyColorLabel: "Lucky Color", energyLabel: "Energy",
    footerText: "LUNARIS is for entertainment purposes, trust your own intuition more than the stars.", footerCredit: "made with ✨",
    navTarot: "Tarot", navHoro: "Horoscope", navCompat: "Compatibility", navBlog: "Blog", navWall: "Community",
    blogEyebrow: "Mystic Notes", blogTitle: "LUNARIS Blog", blogText: "From moon phases to crystal energy, from the language of cards to the games planets play, written for you to read.", blogReadMore: "Read More", blogMinRead: "min read",
    
    // Community EN
    wallEyebrow: "Open to Everyone", wallTitle: "Community Wall", wallText: "Pick today's energy, share it in a few words, and let everyone under the same sky see it.",
    wallGateTitle: "Join the Community Wall",
    wallGateText: "Log in or create a free account to share whispers and connect with the community.",
    wallGateBtn: "Log In / Sign Up",
    wallAuthorTag: "Cosmic Wanderer",
    wallMessagePh: "What is the universe whispering to you today?", wallSubmitBtn: "Share", wallRefreshBtn: "Refresh Wall", wallLoading: "Loading whispers...", wallEmpty: "No one has written yet, be the first to leave a whisper.", wallLocalNote: "Firebase isn't configured, messages are saved in this browser for now.", wallSyncedNote: "Your message is shared with every visitor ✦", wallTextRequired: "Your message can't be empty.", wallLoginRequired: "Please log in to share on the community wall.", wallCooldown: "Take a breath, you can share again in a moment.", wallJustNow: "just now", wallMinAgo: "m ago", wallHourAgo: "h ago", wallDayAgo: "d ago",
    moodStarry: "Starry", moodLoved: "In Love", moodLucky: "Lucky", moodDreamy: "Dreamy", blogAccountNote: "Head back to the main site to see your past readings.",
    navTools: "Tools", toolsEyebrow: "Cosmic Birth Matrix", toolsTitle: "Astrological Birth Chart", toolsText: "Enter your birth date to decode your sacred numerology number, Eastern 5-element seal, and Western Sun sign energy balance.",
    toolsDateLabel: "Your Birth Date", toolsCalcBtn: "✦ Reveal My Cosmic Signature", toolsDateRequired: "Please choose your birth date.",
    numeroEyebrow: "Sacred Numerology", numeroTitle: "Your Life Path Number", numeroBadgePending: "✦ Life Path", numeroEmptyTitle: "Sacred Number Frequency", numeroEmpty: "Enter your birth date to decode your life path number, planetary resonance, and Solfeggio frequency.", numeroEmptyChip: "✦ 1 - 9 & Master Numbers (11, 22, 33)", numeroNote: "Numerology and birth analysis are based on ancient esoteric systems and astronomical calendar math.",
    chineseEyebrow: "Eastern Zodiac & Elements", chineseTitle: "Your Chinese Zodiac & 5 Elements", chineseBadgePending: "✦ 5 Elements Seal", chineseEmptyTitle: "Eastern Seal & 5 Elements", chineseEmpty: "Discover your 12 celestial animal totem, Yin/Yang polarity, and Wood, Fire, Earth, Metal, Water balance.", chineseEmptyChip: "✦ 12-Year Lunar Calendar Cycle", chineseNote: "The Chinese zodiac year turns over around January/February on the lunar calendar; if you were born near that boundary, your real year may match the previous one.",
    westernEyebrow: "Sun Sign & Element Balance", westernTitle: "Cosmic Birth Signature", westernBadgePending: "✦ Sun Chart", westernEmptyTitle: "Sun Signature & Energy Radar", westernEmpty: "Reveal your sun sign decans, intuitive depth, and magnetic aura energy balance.", westernEmptyChip: "✦ Zodiac Decans & 3D Energy Balance",
    matrixVibeLabel: "Planetary Vibration", matrixChakraLabel: "Cosmic Chakra", matrixLuckyNumLabel: "Lucky Numbers", matrixLuckyColLabel: "Aura Colors",
    matrixIntuition: "Intuition", matrixCharm: "Magnetism", matrixFocus: "Mental Focus",
    cosmicEyebrow: "Cosmic Calendar", cosmicTitle: "The Sky in 2026", cosmicText: "Mercury's retrograde periods and this year's eclipses — with real astronomical dates.", cosmicRetroActive: "Mercury is retrograde right now", cosmicRetroDirect: "Mercury is direct right now", cosmicDaysLeft: "days left", cosmicUntilNext: "until the next retrograde", cosmicRetroListTitle: "2026 Mercury Retrograde Periods", cosmicEclipseListTitle: "2026 Eclipses", cosmicNote: "Dates are specific to 2026 and based on widely reported astronomical/astrological sources.",
    moonCalEyebrow: "Moon Calendar", moonCalTitle: "Monthly Moon Phases", moonCalText: "See every phase the Moon moves through this month, day by day.", moonCalToday: "Today",
    eclipseTotalLunar: "Total Lunar Eclipse", eclipseTotalSolar: "Total Solar Eclipse", eclipsePartialLunar: "Partial Lunar Eclipse",
    monthJan: "January", monthFeb: "February", monthMar: "March", monthApr: "April", monthMay: "May", monthJun: "June", monthJul: "July", monthAug: "August", monthSep: "September", monthOct: "October", monthNov: "November", monthDec: "December",
    wdMon: "Mo", wdTue: "Tu", wdWed: "We", wdThu: "Th", wdFri: "Fr", wdSat: "Sa", wdSun: "Su",

    // ML Deep Astrology Section EN
    deepEyebrow: "ML Astrology Engine", deepTitle: "Deep Astrology & Birth Chart",
    deepText: "Decode your astrological DNA from your birth date. The machine learning algorithm combines your sun sign, moon sign, rising sign, planetary hour and moon phase to produce a reading uniquely tailored to you.",
    deepBirthLabel: "Your Birth Date", deepHourLabel: "Your Birth Time (optional)",
    deepHourPh: "e.g. 14:30", deepCalcBtn: "✦ Decode My Cosmic DNA",
    deepNatalTitle: "Three Pillars of Your Natal Chart",
    deepSunLabel: "Sun Sign", deepMoonLabel: "Moon Sign", deepAscLabel: "Rising Sign",
    deepProfileTitle: "Personality Profile Radar",
    deepReadingTitle: "ML-Generated Deep Daily Reading",
    deepCatLove: "Love", deepCatLuck: "Luck", deepCatCareer: "Career", deepCatHealth: "Health", deepCatMoney: "Money",
    deepStatsTitle: "Cosmic Status Right Now",
    deepPlanetHourLabel: "Current Planetary Hour",
    deepMoonPhaseLabel: "Moon Phase",
    deepRetrogradLabel: "Retrograde Status",
    deepAspectsLabel: "Key Planetary Aspects",
    deepRetrogradNone: "✓ All planets are moving direct",
    deepTimelineTitle: "12-Month Energy Forecast",
    deepTimelineEnergy: "Overall", deepTimelineLove: "Love", deepTimelineCareer: "Career", deepTimelineLuck: "Luck",
    deepInsightTitle: "Strengths & Growth Areas",
    deepStrengthLabel: "Your Natural Strength", deepChallengeLabel: "Your Growth Edge",
    deepLuckyNum: "Today's Lucky Number", deepLuckyColor: "Today's Lucky Color",
    deepEnergyScore: "Overall Energy Score",
    deepMlBadge: "ML Engine", deepMlNote: "This reading is generated by an algorithm that combines your sun sign, moon phase, planetary hour, season and natal chart data.",
    deepDateRequired: "Please enter your birth date.",
    deepHoursLabel: "hours",
    navDeep: "Deep Reading",

    // 5 New Cosmic Features EN
    auraEyebrow: "Cosmic Frequency & Aura", auraTitle: "Today's Aura Card", auraText: "Combine your sign and today's energy to reveal your resonance frequency, aura color and cosmic powers.", auraSelectSign: "Select Your Sign", auraScanBtn: "Scan Aura & Generate Card", auraDownloadStoryBtn: "Download Story (9:16)", auraPowerIntuition: "Intuition", auraPowerAttraction: "Magnetism", auraPowerSerenity: "Serenity", auraMantraTitle: "Daily Mantra", auraStoryDownloadedToast: "Aura card generated and downloaded ✨",
    auraSolfeggioUnit: "Hz Solfeggio Frequency", auraCosmicGuideCanvas: "lunaris.web.app  ✦  Your Cosmic Guide",
    wishEyebrow: "Collective Sky", wishTitle: "Constellation Wishfield", wishText: "Whisper your intention into the cosmos and watch it become a glowing star. Tap stars to send light.", wishCategoryLabel: "Category:", wishCatLove: "💖 Love & Soulmate", wishCatPeace: "🕊️ Peace & Serenity", wishCatWealth: "✨ Abundance & Wealth", wishCatHealth: "🌿 Healing & Health", wishCatFuture: "🚀 Future & Success", wishInputPh: "Write your intention for the cosmos...", wishSendBtn: "Launch Wish to Sky", wishLightSentToast: "Sent light and cosmic energy to star ✨", wishModalTitle: "Cosmic Wish Star", wishModalAuthor: "Dreamer:", wishModalLightBtn: "Send Light & Energy",
    orbitEyebrow: "Cosmic Synergy", orbitTitle: "Orbit Radar & Chemistry", orbitText: "Explore the magnetic chemistry, elemental harmony, and 4D synergy radar between two souls.", orbitSign1: "1st Person's Sign", orbitSign2: "2nd Person's Sign", orbitCalcBtn: "Calculate Orbit", orbitResonance: "Emotional Resonance", orbitMind: "Mind & Communication", orbitPassion: "Passion & Chemistry", orbitDestiny: "Destiny & Karmic Bond", orbitElementTitle: "Elemental Alchemy", orbitAdviceTitle: "Cosmic Advice",
    pendulumEyebrow: "Mystic Pendulum", pendulumTitle: "Yes / No Oracle", pendulumText: "Focus your mind, hold your question, and release the amethyst pendulum.", pendulumInputPh: "Whisper your question here...", pendulumSwingBtn: "Swing Pendulum", pendulumSwinging: "Crystal is gathering celestial vibration...", pendulumYes: "DEFINITE YES — The cosmos is with you!", pendulumNo: "NO — The energies do not align.", pendulumWait: "BE PATIENT — The timing is ripening.", pendulumAdvicePrefix: "Guidance:",
    moonRitualEyebrow: "Lunar Cycle & Ritual", moonRitualTitle: "Live Moon Phase & Ritual Guide", moonRitualText: "Explore the live Moon phase, its zodiac sign and spiritual rituals to elevate your vibration.", moonPhaseCurrent: "Current Moon Phase", moonIlluminationLabel: "Illumination", moonZodiacSignLabel: "Moon in Sign", moonRitualTitleLabel: "Daily Ritual & Meditation", moonCrystalsLabel: "Crystals & Gems", moonIncenseLabel: "Aromatherapy & Incense", moonNextFullLabel: "Next Full Moon"
  },
  ru: {
    brandTag: "Таро и Астрология", heroEyebrow: "Карты и звёзды",
    heroTitle: "Тайна карт, руководство звёзд",
    heroText: "Древнее Таро и язык неба — теперь в одном месте. Вытяни карты сегодня и услышь, что шепчет твой знак.",
    heroCta: "Узнать судьбу", heroCardName: "Звезда", heroCardLabel: "Звезда сегодня", moonLabel: "Фаза Луны", nowLabel: "Сейчас",
    starmapTitle: "Звёздная карта на сегодня", starmapText: "Реальные снимки вселенной и то, что означает энергия этой ночи.", starmapCreditPrefix: "Фото",
    posterLabel: "Карта неба", posterSub: "Созвездие дня",
    compatTitle: "Совместимость знаков", compatText: "Выбери два знака и узнай, что вселенная думает о связи между вами.", compatLabel1: "1-й знак", compatLabel2: "2-й знак", compatBtn: "Узнать совместимость", compatScoreLabel: "Уровень совместимости", tierHigh: "Судьбоносное соответствие", tierGood: "Сильная совместимость", tierMid: "Стоит постараться", tierLow: "Сложно, но не невозможно",
    
    // Auth & Login RU
    loginBtn: "Войти", authModalTitle: "Космический Портал", authModalSub: "Шагни в звёздный мир",
    authTabLogin: "Войти", authTabSignup: "Регистрация", authTabForgot: "Забыли пароль",
    authUsernamePh: "Ваше имя пользователя", authEmailPh: "Эл. почта", authPasswordPh: "Пароль", authPasswordMinPh: "Пароль (мин. 6 символов)",
    authCreateBtn: "Создать аккаунт", authGoogleBtn: "Продолжить с Google", authDemoBtn: "✨ Демо / Гостевой Режим",
    authForgotTitle: "Восстановление пароля", authForgotSub: "Введи эл. почту, и мы отправим ссылку для сброса.",
    authSendResetBtn: "Отправить ссылку", authBackToLogin: "Назад к входу",
    authResetSuccess: "Ссылка для сброса пароля отправлена на почту ✨",
    authNotConfiguredNote: "Firebase пока не настроен. Вы можете протестировать Демо-режим.",
    authErrNotConfigured: "Аккаунты пока не активны.", authErrGeneric: "Что-то пошло не так, попробуй снова.",
    authErrInUse: "Эта почта уже зарегистрирована.", authErrWeak: "Пароль должен быть не короче 6 символов.",
    authErrInvalidEmail: "Введи корректный адрес почты.",
    authErrWrongPassword: "Неверный пароль. Пожалуйста, попробуйте снова.",
    authErrNotFound: "Аккаунт с такой эл. почтой не найден.",
    authErrInvalidCred: "Неверная почта или пароль. Если у вас нет аккаунта, зарегистрируйтесь во вкладке «Регистрация».",
    authErrTooMany: "Слишком много неудачных попыток. Пожалуйста, подождите немного.",
    authErrUserDisabled: "Этот аккаунт отключен.",
    authErrEmptyUsername: "Пожалуйста, введите имя пользователя.",
    authErrEmptyPassword: "Пожалуйста, введите пароль.",
    authErrUnauthorizedDomain: "Этот домен должен быть добавлен в 'Authorized Domains' в Firebase Console.",
    authErrOpNotAllowed: "Вход через Google не включен в Firebase Console.",
    authErrPopupClosed: "Окно входа было закрыто.",
    authErrPopupBlocked: "Всплывающее окно заблокировано браузером.",
    toastWelcome: "Добро пожаловать, {name} ✨", toastLogout: "Вы вышли из аккаунта. Да пребудут с вами звёзды 🌙",
    prefLangLabel: "Предпочитаемый язык:",

    // Profile & History RU
    accountLabel: "Мой аккаунт", logoutBtn: "Выйти",
    changeAvatarLabel: "Фото профиля:", uploadPhotoBtn: "📷 Загрузить фото",
    presetAvatarsLabel: "Иконка профиля:", avatarUpdatedToast: "Фото профиля обновлено ✨",
    tabTarotHist: "🃏 Расклады Таро", tabHoroHist: "⭐ Гороскопы", tabWishesHist: "🌟 Мои Желания",
    historyTitle: "Твои сохранённые расклады",
    historyEmpty: "Пока нет сохранённых раскладов Таро.",
    horoHistoryEmpty: "Пока нет сохранённых гороскопов. Выберите знак и нажмите «Сохранить», чтобы добавить сюда.",
    wishesHistoryEmpty: "Вы ещё не запустили желание в космос. Загадайте намерение у Звёздного Фонаря, и ваша звезда засияет здесь ✨",
    wishLightCountBadge: "{count} Света / Энергии Отправлено", wishLightsLabel: "Света / Энергии",
    historyLoading: "Загрузка архивов...", historyError: "Не удалось загрузить историю.",
    saveHoroBtn: "✦ Сохранить гороскоп", horoSavedBadge: "Сохранено ✓",
    horoSavedToast: "Гороскоп для знака {sign} сохранён ✨",

    // Preloader Quotes RU
    preloaderQuote1: "Космическая энергия загружается...",
    preloaderQuote2: "Звёзды выстраиваются для тебя...",
    preloaderQuote3: "Пробуждается шёпот древних знаков...",

    featTitle: "Что вас ждёт",
    feat1Title: "22 карты Старших Арканов", feat1Desc: "Вытяни расклад прошлое-настоящее-будущее из уникальной колоды и узнай значение каждой карты.",
    feat2Title: "Гороскоп обновляется каждый день", feat2Desc: "Любовь, удача, будни и деньги для всех 12 знаков — каждый день по-новому, специально для тебя.",
    feat3Title: "Три языка без границ", feat3Desc: "Переключайся между турецким, английским и русским одним касанием — гадай на том языке, что ближе тебе.",
    feat4Title: "С юмором, а не по шаблону", feat4Desc: "Надоели скучные предсказания? Здесь у каждого знака свой характер и шутки в тему.",
    tarotTitle: "Вытяни карты", tarotText: "Успокой мысли, задай вопрос в уме — и открой расклад из трёх карт: прошлое, настоящее и будущее.",
    drawBtn: "Вытянуть карты", redrawBtn: "Вытянуть снова", comboTitle: "Совместное толкование карт",
    tarotMlTitle: "✦ Нейросетевой синтез Таро & Космический резонанс",
    tarotResonanceLabel: "Космический резонанс",
    tarotPlanetaryImpact: "Резонанс планетарного часа и фазы Луны",
    tarotAlchemyTitle: "Элементальное распределение алхимии",
    tarotAdviceTitle: "🎯 Нейросетевое руководство к действию",
    tarotMantraTitle: "🔮 Космическая мантра дня",
    tarotEnergyLove: "Любовь", tarotEnergyCareer: "Карьера", tarotEnergyLuck: "Удача", tarotEnergyHealth: "Исцеление и Дух", tarotEnergyMoney: "Изобилие",
    posPast: "Прошлое", posPresent: "Настоящее", posFuture: "Будущее",
    horoTitle: "Гороскоп на сегодня", horoText: "Выбери свой знак и узнай, что приготовила вселенная на сегодня.",
    todayLabel: "Сегодня", selectPrompt: "Выбери свой знак выше",
    luckyNumLabel: "Счастливое число", luckyColorLabel: "Счастливый цвет", energyLabel: "Энергия",
    footerText: "LUNARIS создан для развлечения — доверяй своей интуиции больше, чем звёздам.", footerCredit: "сделано с ✨",
    navTarot: "Таро", navHoro: "Гороскоп", navCompat: "Совместимость", navBlog: "Блог", navWall: "Сообщество",
    blogEyebrow: "Мистические заметки", blogTitle: "Блог LUNARIS", blogText: "От фаз Луны до энергии кристаллов, от языка карт до игр планет — то, что мы подготовили для тебя.", blogReadMore: "Читать дальше", blogMinRead: "мин. чтения",
    
    // Community RU
    wallEyebrow: "Открыто для всех", wallTitle: "Стена сообщества", wallText: "Выбери сегодняшнюю энергию, поделись в двух словах — пусть увидят все, кто под этим же небом.",
    wallGateTitle: "Присоединяйтесь к Стене",
    wallGateText: "Войдите или зарегистрируйтесь бесплатно, чтобы оставлять послания на стене.",
    wallGateBtn: "Войти / Регистрация",
    wallAuthorTag: "Космический странник",
    wallMessagePh: "Что вселенная шепчет тебе сегодня?", wallSubmitBtn: "Поделиться", wallRefreshBtn: "Обновить ленту", wallLoading: "Загружаем послания...", wallEmpty: "Пока никто не написал — оставь первое послание.", wallLocalNote: "Firebase не настроен, сообщения сохраняются в этом браузере.", wallSyncedNote: "Твоё сообщение видно всем посетителям ✦", wallTextRequired: "Сообщение не может быть пустым.", wallLoginRequired: "Пожалуйста, войдите, чтобы писать на стене.", wallCooldown: "Переведи дух — сможешь написать снова через пару минут.", wallJustNow: "только что", wallMinAgo: "мин назад", wallHourAgo: "ч назад", wallDayAgo: "дн назад",
    moodStarry: "Звёздное", moodLoved: "Влюблённое", moodLucky: "Удачное", moodDreamy: "Мечтательное", blogAccountNote: "Вернись на главный сайт, чтобы увидеть свои прошлые расклады.",
    navTools: "Инструменты", toolsEyebrow: "Космическая матрица", toolsTitle: "Астрологическая карта рождения", toolsText: "Введи дату рождения, чтобы узнать число сакральной нумерологии, печать 5 стихий восточного зодиака и баланс солнечного знака.",
    toolsDateLabel: "Твоя дата рождения", toolsCalcBtn: "✦ Раскрыть космический код", toolsDateRequired: "Пожалуйста, выбери дату рождения.",
    numeroEyebrow: "Сакральная нумерология", numeroTitle: "Число твоего жизненного пути", numeroBadgePending: "✦ Жизненный путь", numeroEmptyTitle: "Сакральная частота чисел", numeroEmpty: "Введи дату рождения, чтобы узнать число жизненного пути, планетарную вибрацию и частоту Сольфеджио.", numeroEmptyChip: "✦ 1 - 9 и Мастер-числа (11, 22, 33)", numeroNote: "Нумерология и анализ рождения основаны на древних эзотерических системах и астрономических расчётах.",
    chineseEyebrow: "Восточный зодиак и Стихии", chineseTitle: "Твой китайский знак и печать 5 стихий", chineseBadgePending: "✦ Печать 5 стихий", chineseEmptyTitle: "Восточная печать и 5 стихий", chineseEmpty: "Открой свой тотем 12 священных животных, полярность Инь/Ян и баланс стихий Дерева, Огня, Земли, Металла и Воды.", chineseEmptyChip: "✦ 12-летний лунный цикл", chineseNote: "Год по китайскому зодиаку меняется примерно в январе-феврале по лунному календарю; если ты родился близко к границе, твой настоящий год может совпадать с предыдущим.",
    westernEyebrow: "Солнечный знак и Баланс стихий", westernTitle: "Космическая подпись рождения", westernBadgePending: "✦ Солнечная карта", westernEmptyTitle: "Солнечный код и радар энергии", westernEmpty: "Узнай деканат своего знака зодиака, интуитивную глубину и баланс магнитной ауры.", westernEmptyChip: "✦ Деканаты зодиака и 3D баланс энергии",
    matrixVibeLabel: "Планетарная вибрация", matrixChakraLabel: "Космическая чакра", matrixLuckyNumLabel: "Счастливые числа", matrixLuckyColLabel: "Цвета ауры",
    matrixIntuition: "Интуиция", matrixCharm: "Магнетизм", matrixFocus: "Фокус и Воля",
    cosmicEyebrow: "Космический календарь", cosmicTitle: "Небо в 2026", cosmicText: "Периоды ретроградного Меркурия и затмения этого года — с реальными астрономическими датами.", cosmicRetroActive: "Меркурий сейчас ретрограден", cosmicRetroDirect: "Меркурий сейчас движется прямо", cosmicDaysLeft: "дней осталось", cosmicUntilNext: "до следующего ретро", cosmicRetroListTitle: "Ретроградные периоды Меркурия 2026", cosmicEclipseListTitle: "Затмения 2026", cosmicNote: "Даты указаны для 2026 года и основаны на широко публикуемых астрономических и астрологических источниках.",
    moonCalEyebrow: "Лунный календарь", moonCalTitle: "Фазы Луны по месяцам", moonCalText: "Смотри все фазы Луны в этом месяце, день за днём.", moonCalToday: "Сегодня",
    eclipseTotalLunar: "Полное лунное затмение", eclipseTotalSolar: "Полное солнечное затмение", eclipsePartialLunar: "Частичное лунное затмение",
    monthJan: "Январь", monthFeb: "Февраль", monthMar: "Март", monthApr: "Апрель", monthMay: "Май", monthJun: "Июнь", monthJul: "Июль", monthAug: "Август", monthSep: "Сентябрь", monthOct: "Октябрь", monthNov: "Ноябрь", monthDec: "Декабрь",
    wdMon: "Пн", wdTue: "Вт", wdWed: "Ср", wdThu: "Чт", wdFri: "Пт", wdSat: "Сб", wdSun: "Вс",

    // ML Раздел глубокой астрологии RU
    deepEyebrow: "ML Движок Астрологии", deepTitle: "Глубокая Астрология и Натальная Карта",
    deepText: "Расшифруй свою астрологическую ДНК по дате рождения. ML-алгоритм объединяет солнечный знак, лунный знак, асцендент, планетарный час и фазу Луны, создавая уникальный прогноз именно для тебя.",
    deepBirthLabel: "Дата рождения", deepHourLabel: "Время рождения (необязательно)",
    deepHourPh: "напр. 14:30", deepCalcBtn: "✦ Расшифровать мою космическую ДНК",
    deepNatalTitle: "Три опоры натальной карты",
    deepSunLabel: "Солнечный знак", deepMoonLabel: "Лунный знак", deepAscLabel: "Асцендент",
    deepProfileTitle: "Радар личностного профиля",
    deepReadingTitle: "Глубокий прогноз на основе ML",
    deepCatLove: "Любовь", deepCatLuck: "Удача", deepCatCareer: "Карьера", deepCatHealth: "Здоровье", deepCatMoney: "Деньги",
    deepStatsTitle: "Текущий космический статус",
    deepPlanetHourLabel: "Планетарный час",
    deepMoonPhaseLabel: "Фаза Луны",
    deepRetrogradLabel: "Ретроградность",
    deepAspectsLabel: "Ключевые аспекты планет",
    deepRetrogradNone: "✓ Все планеты движутся прямо",
    deepTimelineTitle: "Прогноз энергии на 12 месяцев",
    deepTimelineEnergy: "Общая", deepTimelineLove: "Любовь", deepTimelineCareer: "Карьера", deepTimelineLuck: "Удача",
    deepInsightTitle: "Сильные стороны и зоны роста",
    deepStrengthLabel: "Твоя природная сила", deepChallengeLabel: "Зона развития",
    deepLuckyNum: "Счастливое число дня", deepLuckyColor: "Счастливый цвет дня",
    deepEnergyScore: "Общий уровень энергии",
    deepMlBadge: "ML Движок", deepMlNote: "Этот прогноз создаётся алгоритмом, объединяющим данные о солнечном знаке, фазе Луны, планетарном часе, сезоне и натальной карте.",
    deepDateRequired: "Пожалуйста, введи дату рождения.",
    deepHoursLabel: "часов",
    navDeep: "Глубокий анализ",

    // 5 New Cosmic Features RU
    auraEyebrow: "Космическая частота и Аура", auraTitle: "Карта ауры на сегодня", auraText: "Соедини свой знак и энергию дня, чтобы узнать свою частоту, цвет ауры и космическую силу.", auraSelectSign: "Выбери свой знак", auraScanBtn: "Сканировать ауру", auraDownloadStoryBtn: "Скачать для сторис (9:16)", auraPowerIntuition: "Интуиция", auraPowerAttraction: "Притяжение", auraPowerSerenity: "Гармония", auraMantraTitle: "Мантра дня", auraStoryDownloadedToast: "Карта ауры создана и скачана ✨",
    auraSolfeggioUnit: "Гц Частота Сольфеджио", auraCosmicGuideCanvas: "lunaris.web.app  ✦  Твой Космический Проводник",
    wishEyebrow: "Коллективное небо", wishTitle: "Галактика желаний", wishText: "Прошепчи своё намерение вселенной, и оно станет сияющей звездой. Нажми на звёзды, чтобы послать свет.", wishCategoryLabel: "Категория:", wishCatLove: "💖 Любовь", wishCatPeace: "🕊️ Гармония", wishCatWealth: "💰 Изобилие", wishCatHealth: "🌿 Здоровье", wishCatFuture: "🌟 Будущее", wishInputPh: "Напиши своё желание...", wishSendBtn: "Запустить звезду", wishLightSentToast: "Свет отправлен звезде ✨", wishModalTitle: "Звезда желаний", wishModalAuthor: "Мечтатель:", wishModalLightBtn: "Послать свет",
    orbitEyebrow: "Космическая синергия", orbitTitle: "Орбитальный радар", orbitText: "Исследуй притяжение, баланс стихий и 4D-радар совместимости двух душ.", orbitSign1: "Знак 1-го", orbitSign2: "Знак 2-го", orbitCalcBtn: "Рассчитать орбиту", orbitResonance: "Эмоциональный резонанс", orbitMind: "Мысли и общение", orbitPassion: "Страсть и химия", orbitDestiny: "Судьба и карма", orbitElementTitle: "Алхимия стихий", orbitAdviceTitle: "Совет звёзд",
    pendulumEyebrow: "Мистический маятник", pendulumTitle: "Оракул Да / Нет", pendulumText: "Сконцентрируйся, задай вопрос и отпусти маятник.", pendulumInputPh: "Напиши вопрос...", pendulumSwingBtn: "Качнуть маятник", pendulumSwinging: "Кристалл собирает энергию...", pendulumYes: "ОДНОЗНАЧНО ДА — Вселенная с тобой!", pendulumNo: "НЕТ — Энергии не благоволят.", pendulumWait: "ПОДОЖДИ — Время ещё не пришло.", pendulumAdvicePrefix: "Наставление:",
    moonRitualEyebrow: "Лунный цикл и ритуалы", moonRitualTitle: "Фаза Луны и ритуалы дня", moonRitualText: "Узнай текущую фазу Луны, её знак зодиака и ритуалы дня.", moonPhaseCurrent: "Текущая фаза Луны", moonIlluminationLabel: "Освещённость", moonZodiacSignLabel: "Луна в знаке", moonRitualTitleLabel: "Ритуалы и медитация дня", moonCrystalsLabel: "Камни и кристаллы", moonIncenseLabel: "Ароматерапия и благовония", moonNextFullLabel: "До следующего полнолуния"
  }
};

/* ---- Active user session helper (Instant local storage recovery for F5) ---- */
function getActiveUser() {
  if (window.LunarisAuth && typeof window.LunarisAuth.getUser === "function") {
    const u = window.LunarisAuth.getUser();
    if (u) return u;
  }
  try {
    const raw = localStorage.getItem("lunaris_active_user") || localStorage.getItem("lunaris_local_user");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}
window.getActiveUser = getActiveUser;

/* ---- Language switching (DOM part shared by every page) ---- */
function applyLangToDOM(lang) {
  if (!lang || !UI[lang]) lang = "tr";
  state.lang = lang;
  document.documentElement.lang = lang;
  
  // Tercih edilen dili yerel hafızaya ve Firebase'e kaydet
  try {
    localStorage.setItem(PREFERRED_LANG_KEY, lang);
    if (window.LunarisAuth && typeof window.LunarisAuth.setPreferredLang === "function") {
      window.LunarisAuth.setPreferredLang(lang);
    }
  } catch (e) {}

  const activeUser = getActiveUser();

  // Tüm i18n etiketlerini güncelle (accountBtnLabel hariç — onu updateAccountUI yönetir)
  document.querySelectorAll("[data-i18n]").forEach(function(el) {
    if (el.id === "accountBtnLabel") {
      return; // accountBtnLabel'ı ASLA bu döngüde ezme!
    }
    const key = el.getAttribute("data-i18n");
    if (UI[lang] && UI[lang][key] !== undefined) el.textContent = UI[lang][key];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(function(el) {
    const key = el.getAttribute("data-i18n-ph");
    if (UI[lang] && UI[lang][key] !== undefined) el.setAttribute("placeholder", UI[lang][key]);
  });
  document.querySelectorAll(".lang-btn").forEach(function(b) {
    b.classList.toggle("active", b.dataset.lang === lang);
  });

  // Hesap butonunu ve oturum durumunu güncelle
  if (typeof window.updateAccountUI === "function") {
    window.updateAccountUI(activeUser);
  }

  // Dinamik açılır menü ve widget güncellemeleri
  if (typeof updateAuraSignSelect === "function") updateAuraSignSelect(lang);
  if (typeof updateOrbitSignSelects === "function") updateOrbitSignSelects(lang);
  if (typeof updateWishCategorySelect === "function") updateWishCategorySelect(lang);
  if (document.getElementById("moonRitualResult") && typeof renderMoonPhase === "function") {
    renderMoonPhase();
  }
  const auraResultEl = document.getElementById("auraResult");
  if (auraResultEl && auraResultEl.style.display === "block" && typeof scanAura === "function") {
    scanAura();
  }
  const orbitResultEl = document.getElementById("orbitResult");
  if (orbitResultEl && orbitResultEl.style.display === "block" && typeof calculateOrbit === "function") {
    calculateOrbit();
  }
  if (document.getElementById("wishesHistoryList") && typeof refreshUserWishes === "function") {
    refreshUserWishes();
  }
}


/* ==========================================================
   PRELOADER YÜKLENME ANİMASYONU MANTIĞI
   ========================================================== */
function initPreloader() {
  const preloader = document.getElementById("lunarisPreloader");
  if (!preloader) return;

  const currentLang = state.lang;
  applyLangToDOM(currentLang);

  const quoteEl = document.getElementById("preloaderQuote");
  const quotes = [
    UI[currentLang].preloaderQuote1,
    UI[currentLang].preloaderQuote2,
    UI[currentLang].preloaderQuote3
  ];
  let quoteIndex = 0;
  if (quoteEl) {
    quoteEl.textContent = quotes[0];
    const quoteInterval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quoteEl.style.opacity = "0";
      setTimeout(() => {
        if (quoteEl) {
          quoteEl.textContent = quotes[quoteIndex];
          quoteEl.style.opacity = "1";
        }
      }, 300);
    }, 1500);
  }

  const startTime = Date.now();
  const minDisplayTime = 1100;

  function dismiss() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDisplayTime - elapsed);

    setTimeout(() => {
      preloader.classList.add("preloader-hide");
      setTimeout(() => {
        preloader.remove();
      }, 900);
    }, remaining);
  }

  if (document.readyState === "complete") {
    dismiss();
  } else {
    window.addEventListener("load", dismiss);
    setTimeout(dismiss, 3000);
  }
}

/* ==========================================================
   TOAST BİLDİRİM SİSTEMİ
   ========================================================== */
function showToast(message, duration = 3500, type = "success") {
  let container = document.getElementById("lunarisToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "lunarisToastContainer";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  const isError = type === "error";
  const isWarning = type === "warning";
  toast.className = "lunaris-toast" + (isError ? " lunaris-toast-error" : isWarning ? " lunaris-toast-warning" : "");
  const icon = isError ? "✖" : isWarning ? "⚠" : "✦";
  const iconColor = isError ? "#ff6b8a" : isWarning ? "#f1c40f" : "var(--gold-bright)";
  toast.innerHTML = `<span style="color:${iconColor}; font-size:1.15rem; flex-shrink:0;">${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add("toast-in"));

  setTimeout(() => {
    toast.classList.remove("toast-in");
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 450);
  }, duration);
}

/* ==========================================================
   ICON SYSTEM
   ========================================================== */
const ICONS = {
  fool: '<line x1="4" y1="26" x2="36" y2="26"/><path d="M4,26 L15,13"/><circle cx="27" cy="13" r="6"/>',
  magician: '<circle cx="20" cy="15" r="7"/><line x1="20" y1="22" x2="20" y2="33"/><line x1="13" y1="33" x2="27" y2="33"/>',
  highpriestess: '<line x1="9" y1="9" x2="9" y2="31"/><line x1="31" y1="9" x2="31" y2="31"/><circle cx="20" cy="20" r="6"/>',
  empress: '<circle cx="20" cy="20" r="3"/><circle cx="20" cy="11" r="4.2"/><circle cx="27.8" cy="15.5" r="4.2"/><circle cx="27.8" cy="24.5" r="4.2"/><circle cx="20" cy="29" r="4.2"/><circle cx="12.2" cy="24.5" r="4.2"/><circle cx="12.2" cy="15.5" r="4.2"/>',
  emperor: '<line x1="12" y1="27" x2="16" y2="11"/><line x1="28" y1="27" x2="24" y2="11"/><line x1="20" y1="9" x2="20" y2="31"/>',
  hierophant: '<circle cx="13" cy="13" r="5.5"/><line x1="17" y1="17" x2="31" y2="31"/><line x1="27" y1="27" x2="31" y2="23"/><line x1="23" y1="23" x2="27" y2="19"/>',
  lovers: '<circle cx="15.5" cy="20" r="9"/><circle cx="24.5" cy="20" r="9"/>',
  chariot: '<circle cx="20" cy="20" r="9"/><line x1="20" y1="11" x2="20" y2="29"/><line x1="11" y1="20" x2="29" y2="20"/><line x1="13.4" y1="13.4" x2="26.6" y2="26.6"/><line x1="26.6" y1="13.4" x2="13.4" y2="26.6"/>',
  strength: '<circle cx="20" cy="15" r="6.5"/><circle cx="20" cy="25.5" r="6.5"/><path d="M8,32 Q20,38 32,32"/>',
  hermit: '<path d="M15,14 L25,14 L25,27 L15,27 Z"/><line x1="20" y1="7" x2="20" y2="14"/><line x1="20" y1="27" x2="20" y2="34"/><circle cx="20" cy="20.5" r="2"/>',
  wheel: '<circle cx="20" cy="20" r="11"/><line x1="20" y1="9" x2="20" y2="31"/><line x1="9" y1="20" x2="31" y2="20"/><line x1="12.2" y1="12.2" x2="27.8" y2="27.8"/><line x1="27.8" y1="12.2" x2="12.2" y2="27.8"/><circle cx="20" cy="20" r="2.6"/>',
  justice: '<line x1="20" y1="7" x2="20" y2="31"/><line x1="9" y1="14" x2="31" y2="14"/><path d="M5,23 L9,14 L13,23 Z"/><path d="M27,23 L31,14 L35,23 Z"/><line x1="14" y1="33" x2="26" y2="33"/>',
  hangedman: '<line x1="7" y1="9" x2="33" y2="9"/><line x1="20" y1="9" x2="20" y2="23"/><circle cx="20" cy="29" r="5.2"/><line x1="20" y1="14" x2="12" y2="8"/><line x1="20" y1="14" x2="28" y2="8"/>',
  death: '<ellipse cx="12" cy="15.5" rx="7" ry="4.6"/><ellipse cx="12" cy="24.5" rx="7" ry="4.6"/><ellipse cx="28" cy="15.5" rx="7" ry="4.6"/><ellipse cx="28" cy="24.5" rx="7" ry="4.6"/><line x1="20" y1="9" x2="20" y2="31"/>',
  temperance: '<path d="M8,12 L11,25 L17,25 L20,12"/><path d="M20,12 L23,25 L29,25 L32,12"/><path d="M15,9 Q20,3 25,9"/>',
  devil: '<ellipse cx="14.5" cy="15.5" rx="6.5" ry="4.2" transform="rotate(-32 14.5 15.5)"/><ellipse cx="25.5" cy="24.5" rx="6.5" ry="4.2" transform="rotate(-32 25.5 24.5)"/>',
  tower: '<path d="M13,33 L13,12 L27,12 L27,33"/><path d="M13,12 L20,4 L27,12"/><path d="M23,2 L17,15 L21,15 L15,24"/>',
  star: '<path d="M20,5 L23,16 L34,17 L25,23.5 L28,34 L20,27.5 L12,34 L15,23.5 L6,17 L17,16 Z"/><path d="M6,33 Q13,29 20,33 T34,33"/>',
  moon: '',
  sun: '<circle cx="20" cy="20" r="8"/><line x1="20" y1="4" x2="20" y2="10"/><line x1="20" y1="30" x2="20" y2="36"/><line x1="4" y1="20" x2="10" y2="20"/><line x1="30" y1="20" x2="36" y2="20"/><line x1="9" y1="9" x2="13" y2="13"/><line x1="27" y1="27" x2="31" y2="31"/><line x1="31" y1="9" x2="27" y2="13"/><line x1="13" y1="27" x2="9" y2="31"/>',
  judgement: '<path d="M9,20 L27,13 L27,27 Z"/><line x1="27" y1="20" x2="35" y2="20"/><line x1="31" y1="16" x2="31" y2="24"/>',
  world: '<circle cx="20" cy="20" r="6.5"/><ellipse cx="8" cy="20" rx="4.2" ry="9.5" transform="rotate(18 8 20)"/><ellipse cx="32" cy="20" rx="4.2" ry="9.5" transform="rotate(-18 32 20)"/>',
  love: '<circle cx="14" cy="16" r="6" fill="currentColor" stroke="none"/><circle cx="26" cy="16" r="6" fill="currentColor" stroke="none"/><path d="M7,19 L20,33 L33,19 Z" fill="currentColor" stroke="none"/>',
  luck: '<circle cx="16" cy="14" r="5.2"/><circle cx="24" cy="14" r="5.2"/><circle cx="16" cy="22.5" r="5.2"/><circle cx="24" cy="22.5" r="5.2"/><line x1="20" y1="22.5" x2="20" y2="33"/>',
  daily: '<circle cx="16" cy="18" r="7"/><line x1="16" y1="5" x2="16" y2="9"/><line x1="4" y1="18" x2="8" y2="18"/><line x1="7.3" y1="9.3" x2="10.1" y2="12.1"/><ellipse cx="26" cy="26" rx="10" ry="6"/>',
  money: '<circle cx="20" cy="13.5" r="7"/><line x1="20" y1="9" x2="20" y2="18"/><circle cx="20" cy="27" r="9"/><line x1="20" y1="21" x2="20" y2="33"/>',
  featTarot: '<rect x="10" y="6" width="20" height="28" rx="3"/><path d="M20,14 L22.3,18.8 L27.5,19.5 L23.7,23 L24.7,28.3 L20,25.7 L15.3,28.3 L16.3,23 L12.5,19.5 L17.7,18.8 Z"/>',
  featHoro: '<path d="M20,4 L23.4,16.6 L36,20 L23.4,23.4 L20,36 L16.6,23.4 L4,20 L16.6,16.6 Z"/>',
  featLang: '<circle cx="20" cy="20" r="14"/><ellipse cx="20" cy="20" rx="6" ry="14"/><line x1="6" y1="20" x2="34" y2="20"/>',
  featFun: '<circle cx="20" cy="20" r="14"/><circle cx="14" cy="17" r="1.9"/><circle cx="26" cy="17" r="1.9"/><path d="M12,24 Q20,30.5 28,24"/>',
  statNumber: '<line x1="15" y1="7" x2="10" y2="33"/><line x1="27" y1="7" x2="22" y2="33"/><line x1="7" y1="15" x2="33" y2="15"/><line x1="5" y1="25" x2="31" y2="25"/>',
  statColor: '<circle cx="20" cy="24" r="8" fill="currentColor" stroke="none"/><path d="M20,5 L26.5,18 L13.5,18 Z" fill="currentColor" stroke="none"/>',
  statEnergy: '<path d="M22,5 L9,22 L17,22 L15,35 L31,16 L21,16 Z" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="6" y="10" width="28" height="24" rx="2.5"/><line x1="6" y1="17" x2="34" y2="17"/><line x1="13" y1="5" x2="13" y2="13"/><line x1="27" y1="5" x2="27" y2="13"/>'
};

function icon(key, size, extraClass) {
  size = size || 26;
  if (key === "moon") return moonIconSVG(getMoonPhaseIndex(new Date()), "ic" + (iconUid++));
  const content = ICONS[key] || "";
  return '<svg class="icon-svg' + (extraClass ? " " + extraClass : "") + '" width="' + size + '" height="' + size + '" viewBox="0 0 40 40">' + content + '</svg>';
}

let iconUid = 0;
function moonIconSVG(phaseIndex, uid) {
  const offsets = [30, 19, 10, 4, 0, -4, -10, -19];
  const cx = 20 + offsets[phaseIndex];
  const clipId = "moonClip" + uid;
  return '<svg class="icon-svg moon-icon" viewBox="0 0 40 40">' +
    '<defs><clipPath id="' + clipId + '"><circle cx="20" cy="20" r="13"></circle></clipPath></defs>' +
    '<circle cx="20" cy="20" r="13" class="moon-dark" stroke="currentColor" stroke-width="1.5"></circle>' +
    '<circle cx="' + cx + '" cy="20" r="13" fill="currentColor" clip-path="url(#' + clipId + ')"></circle>' +
    '</svg>';
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}

function getMoonPhaseIndex(date) {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  let phase = (diffDays % synodic) / synodic;
  if (phase < 0) phase += 1;
  return Math.floor(phase * 8) % 8;
}

/* ==========================================================
   AMBIENT BACKGROUND (STARS, NEBULA, SHOOTING STARS)
   ========================================================== */
function createStars(n) {
  const field = document.getElementById("starfield");
  if (!field) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const size = Math.random() * 2.2 + 1;
    s.style.width = size + "px";
    s.style.height = size + "px";
    s.style.top = Math.random() * 100 + "%";
    s.style.left = Math.random() * 100 + "%";
    s.style.animationDelay = (Math.random() * 4) + "s";
    field.appendChild(s);
  }
}

function buildBgConstellation() {
  const svg = document.getElementById("bgConstellation");
  if (!svg) return;
  const w = window.innerWidth, h = window.innerHeight;
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  const points = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    points.push({ x: Math.random() * w, y: Math.random() * h * 0.75 });
  }
  let html = "";
  for (let i = 0; i < points.length; i++) {
    let nearest = -1, nearestDist = Infinity;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist && dist < w * 0.16) { nearestDist = dist; nearest = j; }
    }
    if (nearest !== -1) {
      html += '<line x1="' + points[i].x + '" y1="' + points[i].y + '" x2="' + points[nearest].x + '" y2="' + points[nearest].y + '"></line>';
    }
  }
  points.forEach(function(p) {
    html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="1.6"></circle>';
  });
  svg.innerHTML = html;
}

function spawnShootingStar() {
  const container = document.getElementById("shootingStars");
  if (!container) return;
  const star = document.createElement("div");
  star.className = "shooting-star";
  star.style.top = (Math.random() * 40) + "%";
  star.style.left = (Math.random() * 55 + 15) + "%";
  container.appendChild(star);
  setTimeout(function() { star.remove(); }, 1500);
}

function spawnSparkleBurst(x, y) {
  const wrap = document.createElement("div");
  wrap.className = "sparkle-burst";
  wrap.style.left = x + "px";
  wrap.style.top = y + "px";
  document.body.appendChild(wrap);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "sparkle-particle";
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 35 + Math.random() * 35;
    p.style.setProperty("--dx", (Math.cos(angle) * dist) + "px");
    p.style.setProperty("--dy", (Math.sin(angle) * dist) + "px");
    wrap.appendChild(p);
  }
  setTimeout(function() { wrap.remove(); }, 950);
}

function initSparkleTrail() {
  let lastTime = 0;
  document.addEventListener("mousemove", function(e) {
    const now = Date.now();
    if (now - lastTime < 80) return;
    lastTime = now;
    const dot = document.createElement("div");
    dot.className = "trail-sparkle";
    dot.style.left = e.clientX + "px";
    dot.style.top = e.clientY + "px";
    document.body.appendChild(dot);
    setTimeout(function() { dot.remove(); }, 700);
  });
}

/* 3D Mouse Tilt Effect for Hero Card */
function initCardTilt() {
  const card = document.querySelector(".hero-card");
  if (!card) return;
  const wrap = document.querySelector(".hero-art");
  if (!wrap) return;

  wrap.addEventListener("mousemove", (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = (y / rect.height) * -22;
    const rotY = (x / rect.width) * 22;
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
  });

  wrap.addEventListener("mouseleave", () => {
    card.style.transform = "rotate(-6deg) translateY(0)";
  });
}

/* ==========================================================
   SCROLL & NAV UX
   ========================================================== */
function initScrollReveal(selector) {
  const targets = document.querySelectorAll(selector);
  if (!("IntersectionObserver" in window)) {
    targets.forEach(function(el) { el.classList.add("visible"); });
    return;
  }
  targets.forEach(function(el) { el.classList.add("reveal"); });
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  targets.forEach(function(el) { observer.observe(el); });
  setTimeout(function() {
    targets.forEach(function(el) { el.classList.add("visible"); });
  }, 3000);
}

function toggleNav() {
  const nav = document.getElementById("siteNav");
  const btn = document.getElementById("navToggle");
  if (!nav || !btn) return;
  const open = nav.classList.toggle("open");
  btn.setAttribute("aria-expanded", open ? "true" : "false");
}

function closeNav() {
  const nav = document.getElementById("siteNav");
  const btn = document.getElementById("navToggle");
  if (nav) nav.classList.remove("open");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

function initNavSpy(sectionIds) {
  const links = {};
  document.querySelectorAll(".site-nav a").forEach(function(a) {
    const href = a.getAttribute("href") || "";
    if (href.charAt(0) !== "#") return;
    const id = href.slice(1);
    if (!links[id]) links[id] = [];
    links[id].push(a);
  });
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      const id = entry.target.id;
      if (!links[id]) return;
      links[id].forEach(function(a) { a.classList.toggle("active", entry.isIntersecting); });
    });
  }, { threshold: 0.3, rootMargin: "-80px 0px -55% 0px" });
  sectionIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function initToTopButton() {
  const btn = document.getElementById("toTopBtn");
  if (!btn) return;
  window.addEventListener("scroll", function() {
    btn.classList.toggle("visible", window.scrollY > 600);
  });
}

/* ==========================================================
   AUTHENTICATION MODAL & LOGIC
   ========================================================== */
function openAuthModal(initialTab = "login") {
  const errEl = document.getElementById("authError");
  if (errEl) errEl.textContent = "";
  const succEl = document.getElementById("authSuccess");
  if (succEl) succEl.style.display = "none";

  const configured = window.LunarisAuth && window.LunarisAuth.isConfigured();
  const noteEl = document.getElementById("authNote");
  if (noteEl) noteEl.style.display = configured ? "none" : "block";

  const modal = document.getElementById("authModalOverlay");
  if (modal) modal.style.display = "flex";

  switchAuthTab(initialTab);
}

function closeAuthModal() {
  const modal = document.getElementById("authModalOverlay");
  if (modal) modal.style.display = "none";
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  const isSignup = tab === "signup";
  const isForgot = tab === "forgot";

  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  if (tabLogin) tabLogin.classList.toggle("active", isLogin);
  if (tabSignup) tabSignup.classList.toggle("active", isSignup);

  const formLogin = document.getElementById("authFormLogin");
  const formSignup = document.getElementById("authFormSignup");
  const formForgot = document.getElementById("authFormForgot");
  const tabsWrap = document.querySelector(".auth-tabs");

  if (tabsWrap) tabsWrap.style.display = isForgot ? "none" : "flex";
  if (formLogin) formLogin.style.display = isLogin ? "flex" : "none";
  if (formSignup) formSignup.style.display = isSignup ? "flex" : "none";
  if (formForgot) formForgot.style.display = isForgot ? "flex" : "none";

  const errEl = document.getElementById("authError");
  if (errEl) errEl.textContent = "";
  const succEl = document.getElementById("authSuccess");
  if (succEl) succEl.style.display = "none";
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === "password";
  input.type = isPass ? "text" : "password";
  if (btnEl) {
    btnEl.innerHTML = isPass 
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  }
}

function translateAuthError(err, lang) {
  const code = (err && (err.code || err.message || "")) + "";
  if (code.indexOf("user-not-found") !== -1) return UI[lang].authErrNotFound;
  if (code.indexOf("wrong-password") !== -1) return UI[lang].authErrWrongPassword;
  if (code.indexOf("invalid-credential") !== -1) return UI[lang].authErrInvalidCred || UI[lang].authErrWrongPassword;
  if (code.indexOf("too-many-requests") !== -1) return UI[lang].authErrTooMany;
  if (code.indexOf("user-disabled") !== -1) return UI[lang].authErrUserDisabled;
  if (code.indexOf("unauthorized-domain") !== -1) return UI[lang].authErrUnauthorizedDomain;
  if (code.indexOf("operation-not-allowed") !== -1) return UI[lang].authErrOpNotAllowed;
  if (code.indexOf("popup-closed-by-user") !== -1) return UI[lang].authErrPopupClosed;
  if (code.indexOf("popup-blocked") !== -1) return UI[lang].authErrPopupBlocked;
  if (code.indexOf("empty-username") !== -1) return UI[lang].authErrEmptyUsername;
  if (code.indexOf("email-already-in-use") !== -1) return UI[lang].authErrInUse;
  if (code.indexOf("weak-password") !== -1) return UI[lang].authErrWeak;
  if (code.indexOf("invalid-email") !== -1) return UI[lang].authErrInvalidEmail;
  if (code === "not-configured") return UI[lang].authErrNotConfigured;
  return UI[lang].authErrGeneric;
}

function triggerAuthError(msg) {
  // Show as a centered popup toast instead of inline
  showToast(msg, 4500, "error");
  // Also update the inline element for accessibility
  const errEl = document.getElementById("authError");
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.remove("shake");
    void errEl.offsetWidth;
    errEl.classList.add("shake");
  }
}

async function doLogin() {
  const lang = state.lang;
  const email = (document.getElementById("loginEmail").value || "").trim();
  const password = document.getElementById("loginPassword").value || "";
  
  if (!email) {
    triggerAuthError(UI[lang].authErrInvalidEmail);
    return;
  }
  if (!password) {
    triggerAuthError(UI[lang].authErrEmptyPassword);
    return;
  }

  try {
    const user = await window.LunarisAuth.login(email, password);
    closeAuthModal();
    const name = (user && (user.displayName || user.username || user.email.split("@")[0])) || "Gezgin";
    showToast(UI[state.lang].toastWelcome.replace("{name}", name));
  } catch (e) {
    triggerAuthError(translateAuthError(e, lang));
  }
}

async function doSignup() {
  const lang = state.lang;
  const username = (document.getElementById("signupUsername")?.value || "").trim();
  const email = (document.getElementById("signupEmail").value || "").trim();
  const password = document.getElementById("signupPassword").value || "";

  if (!username) {
    triggerAuthError(UI[lang].authErrEmptyUsername);
    return;
  }
  if (!email || !email.includes("@")) {
    triggerAuthError(UI[lang].authErrInvalidEmail);
    return;
  }
  if (password.length < 6) {
    triggerAuthError(UI[lang].authErrWeak);
    return;
  }

  try {
    const user = await window.LunarisAuth.signup(username, email, password);
    closeAuthModal();
    const displayName = (user && (user.displayName || user.username || user.email.split("@")[0])) || username;
    showToast(UI[state.lang].toastWelcome.replace("{name}", displayName));
  } catch (e) {
    triggerAuthError(translateAuthError(e, lang));
  }
}

async function doGoogleLogin() {
  const lang = state.lang;
  try {
    const user = await window.LunarisAuth.loginWithGoogle();
    closeAuthModal();
    const name = (user && (user.displayName || user.username || user.email.split("@")[0])) || "Gezgin";
    showToast(UI[state.lang].toastWelcome.replace("{name}", name));
  } catch (e) {
    triggerAuthError(translateAuthError(e, lang));
  }
}

async function doForgotPassword() {
  const lang = state.lang;
  const email = (document.getElementById("forgotEmail")?.value || "").trim();
  if (!email || !email.includes("@")) {
    triggerAuthError(UI[lang].authErrInvalidEmail);
    return;
  }

  try {
    await window.LunarisAuth.resetPassword(email);
    const succEl = document.getElementById("authSuccess");
    if (succEl) {
      succEl.textContent = UI[lang].authResetSuccess;
      succEl.style.display = "block";
    }
  } catch (e) {
    triggerAuthError(translateAuthError(e, lang));
  }
}

async function doDemoLogin() {
  const lang = state.lang;
  try {
    const user = await window.LunarisAuth.loginDemo("astral.gezgin@lunaris.app", "demo123", "KozmikGezgin");
    closeAuthModal();
    showToast(UI[state.lang].toastWelcome.replace("{name}", user.displayName || user.username));
  } catch (e) {
    triggerAuthError(translateAuthError(e, lang));
  }
}

async function doLogout() {
  const lang = state.lang;
  if (window.LunarisAuth && typeof window.LunarisAuth.logout === "function") {
    await window.LunarisAuth.logout();
  } else {
    try {
      localStorage.removeItem("lunaris_active_user");
      localStorage.removeItem("lunaris_local_user");
    } catch(e){}
    if (typeof window.updateAccountUI === "function") {
      window.updateAccountUI(null);
    }
  }
  closeAccountModal();
  showToast(UI[lang].toastLogout);
}

function handleAccountClick() {
  const user = getActiveUser();
  if (user) {
    openAccountModal();
  } else {
    openAuthModal("login");
  }
}

/* ==========================================================
   PROFILE & PHOTO UPLOAD MANAGEMENT
   ========================================================== */
async function setProfilePhoto(photoURL) {
  const lang = state.lang;
  if (!window.LunarisAuth) return;
  const ok = await window.LunarisAuth.updateProfilePicture(photoURL);
  if (ok) {
    showToast(UI[lang].avatarUpdatedToast || "Profil fotoğrafın güncellendi ✨");
    if (typeof window.loadWallPosts === "function") {
      window.loadWallPosts(false);
    }
  }
}

function handleCustomPhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    showToast("Fotoğraf boyutu 8MB'dan küçük olmalıdır.");
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext("2d");
      const minDim = Math.min(img.width, img.height);
      const startX = (img.width - minDim) / 2;
      const startY = (img.height - minDim) / 2;
      ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, 160, 160);
      const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setProfilePhoto(compressedDataUrl);
    };
    img.onerror = function() {
      setProfilePhoto(e.target.result);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

window.setProfilePhoto = setProfilePhoto;
window.handleCustomPhotoUpload = handleCustomPhotoUpload;

function openAccountModal(initialTab = "tarot") {
  const user = getActiveUser();
  if (!user) {
    openAuthModal("login");
    return;
  }

  const username = user.displayName || user.username || (user.email ? user.email.split("@")[0] : "Gezgin");
  const usernameEl = document.getElementById("accountUsername");
  if (usernameEl) usernameEl.textContent = "@" + username;

  const emailEl = document.getElementById("accountEmail");
  if (emailEl) emailEl.textContent = user.email || "";

  const avatarEl = document.getElementById("accountAvatarLarge");
  if (avatarEl) {
    if (user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" class="account-avatar-img" alt="Avatar">`;
    } else {
      avatarEl.textContent = username.charAt(0).toUpperCase();
    }
  }

  const modal = document.getElementById("accountModalOverlay");
  if (modal) modal.style.display = "flex";

  switchAccountTab(initialTab);
}

function closeAccountModal() {
  const modal = document.getElementById("accountModalOverlay");
  if (modal) modal.style.display = "none";
}

function switchAccountTab(tab) {
  state.activeAccountTab = tab;
  const isTarot = tab === "tarot";
  const isHoro = tab === "horoscope";
  const isWishes = tab === "wishes";

  const btnTarot = document.getElementById("tabAccountTarot");
  const btnHoro = document.getElementById("tabAccountHoro");
  const btnWishes = document.getElementById("tabAccountWishes");
  if (btnTarot) btnTarot.classList.toggle("active", isTarot);
  if (btnHoro) btnHoro.classList.toggle("active", isHoro);
  if (btnWishes) btnWishes.classList.toggle("active", isWishes);

  const listTarot = document.getElementById("readingHistoryList");
  const listHoro = document.getElementById("horoHistoryList");
  const listWishes = document.getElementById("wishesHistoryList");
  if (listTarot) listTarot.style.display = isTarot ? "block" : "none";
  if (listHoro) listHoro.style.display = isHoro ? "block" : "none";
  if (listWishes) listWishes.style.display = isWishes ? "block" : "none";

  if (isTarot) {
    refreshUserReadings();
  } else if (isHoro) {
    refreshUserHoroscopes();
  } else if (isWishes) {
    refreshUserWishes();
  }
}

function formatHistoryDate(dateVal) {
  try {
    const d = new Date(dateVal);
    const lang = state.lang;
    const locale = lang === "tr" ? "tr-TR" : (lang === "ru" ? "ru-RU" : "en-US");
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

async function refreshUserReadings() {
  const listEl = document.getElementById("readingHistoryList");
  if (!listEl) return;
  const lang = state.lang || "tr";
  listEl.innerHTML = '<p class="history-loading">' + (UI[lang].historyLoading || "Yükleniyor...") + '</p>';

  try {
    const readings = await window.LunarisAuth.loadReadings();
    if (!readings || readings.length === 0) {
      listEl.innerHTML = '<p class="history-empty">' + (UI[lang].historyEmpty || "Henüz kaydedilmiş falınız bulunmuyor.") + '</p>';
      return;
    }

    let html = "";
    readings.forEach((r) => {
      const dateStr = formatHistoryDate(r.createdAt);
      let cardsHtml = "";
      let mlInfo = null;

      if (Array.isArray(r.cards) && r.cards.length >= 3) {
        if (window.LunarisML && typeof window.LunarisML.interpretTarotSpread === "function") {
          try {
            const readingDate = r.createdAt ? new Date(r.createdAt) : new Date();
            mlInfo = window.LunarisML.interpretTarotSpread(r.cards, lang, { date: readingDate });
          } catch (e) {}
        }

        r.cards.forEach((cKey, idx) => {
          const posLabel = idx === 0 ? UI[lang].posPast : (idx === 1 ? UI[lang].posPresent : UI[lang].posFuture);
          let cardName = cKey;
          let cardIcon = "✦";
          let cardNum = "";
          if (window.LunarisML && typeof window.LunarisML.getTarotCard === "function") {
            const cMeta = window.LunarisML.getTarotCard(cKey, lang);
            cardName = cMeta.name;
            cardIcon = cMeta.icon;
            cardNum = cMeta.num;
          }
          cardsHtml += `
            <span class="history-card-pill">
              <span class="hcp-pos">${posLabel}:</span>
              <span class="hcp-icon">${cardIcon}</span>
              <span class="hcp-num">${cardNum}</span>
              <strong class="hcp-name">${cardName}</strong>
            </span>
          `;
        });
      }

      const tarotBadgeTitle = lang === "tr" ? "Tarot Açılımı" : (lang === "ru" ? "Расклад Таро" : "Tarot Reading");
      const resLabel = lang === "tr" ? "Rezonans" : (lang === "ru" ? "Резонанс" : "Resonance");

      let metaBadgesHtml = "";
      if (mlInfo) {
        metaBadgesHtml += `<span class="history-res-badge">✦ %${mlInfo.resonanceScore} ${resLabel}</span>`;
        if (mlInfo.alchemyDescription) {
          metaBadgesHtml += `<span class="history-elem-badge">${mlInfo.alchemyDescription.split(':')[0]}</span>`;
        }
      }

      // Formatting text with markdown bold replacements for clean HTML
      let readingText = (mlInfo ? mlInfo.synthesisNarrative : (r.comboText || ""))
        .replace(/\*\*(.*?)\*\*/g, '<strong class="hist-bold">$1</strong>')
        .replace(/\n\n/g, '<br><br>');

      let directiveHtml = "";
      if (mlInfo && mlInfo.actionDirective) {
        directiveHtml = `
          <div class="history-directive-box">
            <span class="hdb-tag">${UI[lang].tarotAdviceTitle || "🎯 Eylem Rehberi"}:</span>
            <span class="hdb-text">${mlInfo.actionDirective}</span>
          </div>
        `;
      }

      html += `
        <div class="history-item-card tarot-hist-item">
          <div class="history-card-header">
            <div class="history-sign-badge">🃏 <span>${tarotBadgeTitle}</span></div>
            <div class="history-meta-right">
              ${metaBadgesHtml}
              <div class="history-date-badge">${dateStr}</div>
            </div>
          </div>
          <div class="history-cards-pills">${cardsHtml}</div>
          <div class="history-reading-text">${readingText}</div>
          ${directiveHtml}
        </div>
      `;
    });
    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = '<p class="history-empty">' + UI[lang].historyError + '</p>';
  }
}

async function refreshUserHoroscopes() {
  const listEl = document.getElementById("horoHistoryList");
  if (!listEl) return;
  const lang = state.lang;
  listEl.innerHTML = '<p class="history-loading">' + UI[lang].historyLoading + '</p>';

  try {
    const horos = await window.LunarisAuth.loadHoroscopes();
    if (!horos || horos.length === 0) {
      listEl.innerHTML = '<p class="history-empty">' + UI[lang].horoHistoryEmpty + '</p>';
      return;
    }

    let html = "";
    horos.forEach((h) => {
      const dateStr = formatHistoryDate(h.createdAt);
      const signName = (h.signName && typeof h.signName === "object") ? (h.signName[lang] || h.signName.tr) : (h.signName || "");

      html += `
        <div class="history-item-card">
          <div class="history-card-header">
            <div class="history-sign-badge">${h.glyph || "⭐"} <span>${signName}</span></div>
            <div class="history-date-badge">${dateStr}</div>
          </div>
          <div class="history-stats-row">
            <span class="history-stat-tag"><strong>${UI[lang].luckyNumLabel}:</strong> ${h.luckyNum || "-"}</span>
            <span class="history-stat-tag"><strong>${UI[lang].luckyColorLabel}:</strong> ${h.luckyColor || "-"}</span>
            <span class="history-stat-tag"><strong>${UI[lang].energyLabel}:</strong> ${h.energy || "-"}</span>
          </div>
          <div class="history-horo-grid">
            <div class="history-horo-cell"><strong>${UI[lang].moodLoved || "Aşk"}</strong> ${h.love || ""}</div>
            <div class="history-horo-cell"><strong>${UI[lang].moodLucky || "Şans"}</strong> ${h.luck || ""}</div>
            <div class="history-horo-cell"><strong>${UI[lang].nowLabel || "Günlük"}</strong> ${h.daily || ""}</div>
            <div class="history-horo-cell"><strong>${UI[lang].luckyNumLabel || "Para"}</strong> ${h.money || ""}</div>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = '<p class="history-empty">' + UI[lang].historyError + '</p>';
  }
}

async function refreshUserWishes() {
  const listEl = document.getElementById("wishesHistoryList");
  if (!listEl) return;
  const lang = state.lang;
  listEl.innerHTML = '<p class="history-loading">' + UI[lang].historyLoading + '</p>';

  try {
    if (!window.LunarisWishes || !window.LunarisWishes.loadMyWishes) {
      listEl.innerHTML = '<p class="history-empty">' + UI[lang].wishesHistoryEmpty + '</p>';
      return;
    }
    const wishes = await window.LunarisWishes.loadMyWishes();
    if (!wishes || wishes.length === 0) {
      listEl.innerHTML = '<p class="history-empty">' + UI[lang].wishesHistoryEmpty + '</p>';
      return;
    }

    const catLabels = {
      love: UI[lang].wishCatLove || "💖 Aşk & Ruh Eşi",
      peace: UI[lang].wishCatPeace || "🕊️ Huzur & Arınma",
      wealth: UI[lang].wishCatWealth || "💰 Bolluk & Bereket",
      health: UI[lang].wishCatHealth || "🌿 Şifa & Güç",
      future: UI[lang].wishCatFuture || "🌟 Gelecek & Başarı"
    };

    let html = "";
    wishes.forEach((w) => {
      const dateStr = formatHistoryDate(w.createdAt);
      const catText = catLabels[w.category] || "✨ Dilek";
      const lightCount = w.lightCount || 1;
      const lightBadgeText = (UI[lang].wishLightCountBadge || "{count} Işık / Enerji Verildi").replace("{count}", lightCount);

      html += `
        <div class="history-item-card wish-history-card" style="border-left-color: ${w.color || '#FFD166'};">
          <div class="history-card-header">
            <div class="history-sign-badge" style="color: ${w.color || '#FFD166'};">🌟 <span>${catText}</span></div>
            <div class="history-date-badge">${dateStr}</div>
          </div>
          <p class="history-reading-text" style="font-size:1rem; color:var(--parchment); font-style:italic;">“${w.text || ""}”</p>
          <div class="history-wish-footer">
            <span class="history-wish-light-badge" style="border-color: ${w.color || '#FFD166'};">
              ✨ <strong>${lightCount}</strong> ${UI[lang].wishLightsLabel || "Işık / Enerji"}
            </span>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = '<p class="history-empty">' + UI[lang].historyError + '</p>';
  }
}

/* ==========================================================
   UI GLOBAL UPDATER (HEADER & WALL AUTH GATE & AVATARS)
   ========================================================== */
window.updateAccountUI = function(user) {
  if (!user) {
    user = getActiveUser();
  }
  const label = document.getElementById("accountBtnLabel");
  const btn = document.getElementById("accountBtn");
  const userPhoto = user && user.photoURL ? user.photoURL : null;

  if (label && btn) {
    if (user) {
      const displayName = user.displayName || user.username || (user.email ? user.email.split("@")[0] : "Kozmik Gezgin");
      label.textContent = displayName;
      label.removeAttribute("data-i18n");
      btn.classList.add("logged-in");
      btn.setAttribute("data-user-name", displayName);

      let existingImg = btn.querySelector(".account-avatar-img");
      if (userPhoto) {
        if (!existingImg) {
          const img = document.createElement("img");
          img.className = "account-avatar-img";
          img.style.width = "22px";
          img.style.height = "22px";
          img.style.marginRight = "6px";
          img.style.borderRadius = "50%";
          img.style.objectFit = "cover";
          img.src = userPhoto;
          btn.insertBefore(img, label);
        } else {
          existingImg.src = userPhoto;
        }
      } else if (existingImg) {
        existingImg.remove();
      }
    } else {
      label.setAttribute("data-i18n", "loginBtn");
      label.textContent = (UI[state.lang] && UI[state.lang].loginBtn) ? UI[state.lang].loginBtn : "Giriş Yap";
      btn.classList.remove("logged-in");
      btn.removeAttribute("data-user-name");
      const existingImg = btn.querySelector(".account-avatar-img");
      if (existingImg) existingImg.remove();
    }
  }

  const avatarEl = document.getElementById("accountAvatarLarge");
  if (avatarEl) {
    if (user && user.photoURL) {
      avatarEl.innerHTML = `<img src="${user.photoURL}" class="account-avatar-img" alt="Avatar">`;
    } else if (user) {
      const name = user.displayName || user.username || (user.email ? user.email.split("@")[0] : "G");
      avatarEl.textContent = name.charAt(0).toUpperCase();
    } else {
      avatarEl.textContent = "✦";
    }
  }

  const usernameEl = document.getElementById("accountUsername");
  if (usernameEl && user) {
    const name = user.displayName || user.username || (user.email ? user.email.split("@")[0] : "Gezgin");
    usernameEl.textContent = "@" + name;
  }
  const emailEl = document.getElementById("accountEmail");
  if (emailEl && user) {
    emailEl.textContent = user.email || "";
  }

  // Topluluk Duvarı Giriş Kapısı / Composer Ayarı
  const wallGate = document.getElementById("wallAuthGate");
  const wallInner = document.getElementById("wallComposerInner");
  const wallAuthorDisplay = document.getElementById("wallAuthorDisplay");
  const wallUserAvatar = document.getElementById("wallUserAvatar");

  if (wallGate && wallInner) {
    if (user) {
      wallGate.style.display = "none";
      wallInner.style.display = "block";
      if (wallAuthorDisplay) {
        wallAuthorDisplay.textContent = user.displayName || user.username || (user.email ? user.email.split("@")[0] : "Gezgin");
      }
      if (wallUserAvatar) {
        if (user.photoURL) {
          wallUserAvatar.innerHTML = `<img src="${user.photoURL}" class="account-avatar-img" alt="Avatar">`;
        } else {
          const name = user.displayName || user.username || "G";
          wallUserAvatar.textContent = name.charAt(0).toUpperCase();
        }
      }
    } else {
      wallGate.style.display = "block";
      wallInner.style.display = "none";
    }
  }
};

/* ==========================================================
   ZODIAC TRANSLATION REGISTRY
   ========================================================== */
const ZODIAC_I18N = [
  { key: "aries", glyph: "♈", name: { tr: "Koç", en: "Aries", ru: "Овен" } },
  { key: "taurus", glyph: "♉", name: { tr: "Boğa", en: "Taurus", ru: "Телец" } },
  { key: "gemini", glyph: "♊", name: { tr: "İkizler", en: "Gemini", ru: "Близнецы" } },
  { key: "cancer", glyph: "♋", name: { tr: "Yengeç", en: "Cancer", ru: "Рак" } },
  { key: "leo", glyph: "♌", name: { tr: "Aslan", en: "Leo", ru: "Лев" } },
  { key: "virgo", glyph: "♍", name: { tr: "Başak", en: "Virgo", ru: "Дева" } },
  { key: "libra", glyph: "♎", name: { tr: "Terazi", en: "Libra", ru: "Весы" } },
  { key: "scorpio", glyph: "♏", name: { tr: "Akrep", en: "Scorpio", ru: "Скорпион" } },
  { key: "sagittarius", glyph: "♐", name: { tr: "Yay", en: "Sagittarius", ru: "Стрелец" } },
  { key: "capricorn", glyph: "♑", name: { tr: "Oğlak", en: "Capricorn", ru: "Козерог" } },
  { key: "aquarius", glyph: "♒", name: { tr: "Kova", en: "Aquarius", ru: "Водолей" } },
  { key: "pisces", glyph: "♓", name: { tr: "Balık", en: "Pisces", ru: "Рыбы" } }
];

function updateAuraSignSelect(lang) {
  const sel = document.getElementById("auraSignSelect");
  if (!sel) return;
  const currentVal = sel.value;
  let html = `<option value="" disabled ${!currentVal ? "selected" : ""} data-i18n="auraSelectSign">${UI[lang].auraSelectSign || "Burcunu Seç"}</option>`;
  ZODIAC_I18N.forEach(function(z) {
    const sName = z.name[lang] || z.name.tr;
    html += `<option value="${z.key}" ${currentVal === z.key ? "selected" : ""}>${z.glyph} ${sName}</option>`;
  });
  sel.innerHTML = html;
}

function updateOrbitSignSelects(lang) {
  const s1 = document.getElementById("orbitSign1");
  const s2 = document.getElementById("orbitSign2");
  if (s1) {
    const v1 = s1.value;
    let h1 = `<option value="" disabled ${!v1 ? "selected" : ""} data-i18n="orbitSign1">${UI[lang].orbitSign1 || "1. Kişinin Burcu"}</option>`;
    ZODIAC_I18N.forEach(function(z) {
      const sName = z.name[lang] || z.name.tr;
      h1 += `<option value="${z.key}" ${v1 === z.key ? "selected" : ""}>${z.glyph} ${sName}</option>`;
    });
    s1.innerHTML = h1;
  }
  if (s2) {
    const v2 = s2.value;
    let h2 = `<option value="" disabled ${!v2 ? "selected" : ""} data-i18n="orbitSign2">${UI[lang].orbitSign2 || "2. Kişinin Burcu"}</option>`;
    ZODIAC_I18N.forEach(function(z) {
      const sName = z.name[lang] || z.name.tr;
      h2 += `<option value="${z.key}" ${v2 === z.key ? "selected" : ""}>${z.glyph} ${sName}</option>`;
    });
    s2.innerHTML = h2;
  }
}

function updateWishCategorySelect(lang) {
  const sel = document.getElementById("wishCategory");
  if (!sel) return;
  const currentVal = sel.value || "love";
  const CATS = [
    { key: "love", icon: "💖", labelKey: "wishCatLove" },
    { key: "peace", icon: "🕊️", labelKey: "wishCatPeace" },
    { key: "wealth", icon: "💰", labelKey: "wishCatWealth" },
    { key: "health", icon: "🌿", labelKey: "wishCatHealth" },
    { key: "future", icon: "🌟", labelKey: "wishCatFuture" }
  ];
  let html = "";
  CATS.forEach(function(c) {
    html += `<option value="${c.key}" ${currentVal === c.key ? "selected" : ""}>${UI[lang][c.labelKey] || c.key}</option>`;
  });
  sel.innerHTML = html;
}

/* ==========================================================
   AURA & FREQUENCY SCANNER ENGINE
   ========================================================== */
const AURA_DATA = {
  aries: { hue: 0, freq: 396, mantra: { tr: "Ben cesaret ve ateşle doluyum.", en: "I am filled with courage and fire.", ru: "Я наполнен мужеством и огнём." }, element: "fire" },
  taurus: { hue: 130, freq: 417, mantra: { tr: "Ben bereketli toprakla kök saldım.", en: "I am rooted in abundant earth.", ru: "Я укоренён в благодатной земле." }, element: "earth" },
  gemini: { hue: 50, freq: 528, mantra: { tr: "Rüzgar gibi özgür ve ceviğim.", en: "I am free and agile like the wind.", ru: "Я свободен и быстр, как ветер." }, element: "air" },
  cancer: { hue: 200, freq: 639, mantra: { tr: "Ay ışığıyla duygu okyanusuma dalıyorum.", en: "I dive into my ocean of emotion by moonlight.", ru: "Я погружаюсь в океан чувств при свете Луны." }, element: "water" },
  leo: { hue: 35, freq: 741, mantra: { tr: "Güneş gibi parlıyorum, ışığım her yere ulaşıyor.", en: "I shine like the sun, my light reaches everywhere.", ru: "Я сияю, как Солнце, мой свет озаряет всё." }, element: "fire" },
  virgo: { hue: 90, freq: 852, mantra: { tr: "Düzenim ve sezgim mükemmel uyum içinde.", en: "My order and intuition are in perfect harmony.", ru: "Мой порядок и интуиция находятся в гармонии." }, element: "earth" },
  libra: { hue: 280, freq: 528, mantra: { tr: "Denge ve zarafet içimde yaşıyor.", en: "Balance and grace live within me.", ru: "Баланс и красота живут во мне." }, element: "air" },
  scorpio: { hue: 320, freq: 396, mantra: { tr: "Derinliklerimde dönüşüm gücü saklanıyor.", en: "The power of transformation hides in my depths.", ru: "В моих глубинах скрыта сила трансформации." }, element: "water" },
  sagittarius: { hue: 270, freq: 417, mantra: { tr: "Oku fırlatıyorum, evren yolumu açıyor.", en: "I launch my arrow, the universe opens my path.", ru: "Я выпускаю стрелу, и Вселенная открывает мне путь." }, element: "fire" },
  capricorn: { hue: 160, freq: 639, mantra: { tr: "Dağıma tırmanıyorum, zirve beni bekliyor.", en: "I climb my mountain, the summit awaits.", ru: "Я поднимаюсь на вершину, и она ждёт меня." }, element: "earth" },
  aquarius: { hue: 190, freq: 741, mantra: { tr: "Geleceği hayal ediyor ve yaratıyorum.", en: "I imagine and create the future.", ru: "Я мечтаю о будущем и созидаю его." }, element: "air" },
  pisces: { hue: 240, freq: 852, mantra: { tr: "Kozmik okyanustan ilham alıyorum.", en: "I draw inspiration from the cosmic ocean.", ru: "Я черпаю вдохновение из космического океана." }, element: "water" }
};

function getElementName(key, lang) {
  const map = {
    fire: { tr: "Ateş", en: "Fire", ru: "Огонь" },
    earth: { tr: "Toprak", en: "Earth", ru: "Земля" },
    air: { tr: "Hava", en: "Air", ru: "Воздух" },
    water: { tr: "Su", en: "Water", ru: "Вода" }
  };
  return (map[key] || map.fire)[lang] || map.fire.tr;
}

function generateAura(signKey) {
  const lang = state.lang;
  const data = AURA_DATA[signKey];
  if (!data) return null;
  const dayHash = new Date().toDateString().split("").reduce((a,b) => a + b.charCodeAt(0), 0);
  const hueShift = (data.hue + (dayHash % 60) - 30 + 360) % 360;
  const saturation = 70 + (dayHash % 20);
  const lightness = 40 + (dayHash % 15);
  const auraColor = `hsl(${hueShift}, ${saturation}%, ${lightness}%)`;
  const auraName = getAuraName(hueShift, lang);
  const intuition = 60 + ((dayHash + data.freq) % 35);
  const attraction = 55 + ((dayHash * 3 + data.hue) % 40);
  const serenity = 50 + ((dayHash * 7 + data.freq) % 45);
  return {
    signKey, auraColor, auraName, frequency: data.freq,
    intuition, attraction, serenity,
    mantra: data.mantra[lang] || data.mantra.tr,
    element: data.element, hue: hueShift
  };
}

function getAuraName(hue, lang) {
  const names = {
    tr: ["Ateş Kırmızısı", "Altın Portakal", "Güneş Sarısı", "Zümrüt Yeşili", "Okyanus Mavisi", "Gece Çividi", "Mistik Mor", "Gül Pembesi"],
    en: ["Fire Red", "Golden Orange", "Sun Yellow", "Emerald Green", "Ocean Blue", "Night Indigo", "Mystic Purple", "Rose Pink"],
    ru: ["Огненно-красный", "Золотисто-оранжевый", "Солнечно-жёлтый", "Изумрудно-зелёный", "Океанический синий", "Ночной индиго", "Мистический фиолетовый", "Нежно-розовый"]
  };
  const idx = Math.floor(hue / 45) % 8;
  return (names[lang] || names.tr)[idx];
}

function renderAuraResult(aura) {
  const lang = state.lang;
  const el = document.getElementById("auraResult");
  if (!el || !aura) return;
  const zInfo = ZODIAC_I18N.find(z => z.key === aura.signKey);
  const glyph = zInfo ? zInfo.glyph : "✨";
  
  const FREQ_NAMES = {
    396: { tr: "Kök & Arınma", en: "Root & Purification", ru: "Корень и Очищение" },
    417: { tr: "Değişim & Akış", en: "Change & Flow", ru: "Изменение и Поток" },
    528: { tr: "Dönüşüm & Mucize", en: "Transformation & Miracle", ru: "Трансформация и Чудо" },
    639: { tr: "Bağlantı & Kalp", en: "Connection & Heart", ru: "Связь и Сердце" },
    741: { tr: "Sezgi & İfade", en: "Intuition & Expression", ru: "Интуиция и Выражение" },
    852: { tr: "Ruhsal Uyanış", en: "Spiritual Awakening", ru: "Духовное Пробуждение" }
  };
  const freqName = (FREQ_NAMES[aura.frequency] || FREQ_NAMES[852])[lang] || (FREQ_NAMES[aura.frequency] || FREQ_NAMES[852]).tr;
  const elementName = getElementName(aura.element, lang);

  el.innerHTML = `
    <div class="aura-card-preview" id="auraCardPreview" style="--aura-color: ${aura.auraColor};">
      <div class="aura-card-glow-bg"></div>
      <div class="aura-card-corner tl">✧</div>
      <div class="aura-card-corner tr">✧</div>
      <div class="aura-card-corner bl">✧</div>
      <div class="aura-card-corner br">✧</div>

      <div class="aura-top-badge-row">
        <span class="aura-sign-badge">${glyph} ${elementName}</span>
        <span class="aura-solfeggio-badge">✧ ${aura.frequency} Hz • ${freqName} ✧</span>
      </div>

      <div class="aura-visual-container">
        <div class="aura-sacred-orbit"></div>
        <div class="aura-sacred-ring"></div>
        <div class="aura-orb"></div>
        <div class="aura-center-glyph">${glyph}</div>
      </div>

      <div class="aura-card-info">
        <h3 class="aura-color-name">${aura.auraName}</h3>
        <div class="aura-freq-chip">
          <span>⚡ ${aura.frequency} ${UI[lang].auraSolfeggioUnit || "Hz Solfeggio Frekansı"}</span>
        </div>

        <div class="aura-bars">
          <div class="aura-bar-item">
            <span class="aura-bar-title">${UI[lang].auraPowerIntuition}</span>
            <div class="aura-bar"><div class="aura-bar-fill" style="width:${aura.intuition}%; background: linear-gradient(90deg, ${aura.auraColor}, var(--gold-bright));"></div></div>
            <span class="aura-bar-pct">${aura.intuition}%</span>
          </div>
          <div class="aura-bar-item">
            <span class="aura-bar-title">${UI[lang].auraPowerAttraction}</span>
            <div class="aura-bar"><div class="aura-bar-fill" style="width:${aura.attraction}%; background: linear-gradient(90deg, ${aura.auraColor}, #FF7B90);"></div></div>
            <span class="aura-bar-pct">${aura.attraction}%</span>
          </div>
          <div class="aura-bar-item">
            <span class="aura-bar-title">${UI[lang].auraPowerSerenity}</span>
            <div class="aura-bar"><div class="aura-bar-fill" style="width:${aura.serenity}%; background: linear-gradient(90deg, ${aura.auraColor}, #06D6A0);"></div></div>
            <span class="aura-bar-pct">${aura.serenity}%</span>
          </div>
        </div>

        <div class="aura-mantra">
          <div class="aura-mantra-head">${UI[lang].auraMantraTitle}</div>
          <div class="aura-mantra-quote">“${aura.mantra}”</div>
        </div>
      </div>
    </div>
    <button class="btn-primary aura-download-btn" onclick="downloadAuraCard()" data-i18n="auraDownloadStoryBtn">${UI[lang].auraDownloadStoryBtn}</button>
  `;
  el.style.display = "block";
}

function downloadAuraCard() {
  const card = document.getElementById("auraCardPreview");
  if (!card) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  // Deep cosmic background
  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
  grad.addColorStop(0, "#080414");
  grad.addColorStop(0.3, "#180a30");
  grad.addColorStop(0.7, "#120624");
  grad.addColorStop(1, "#06030e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Starry cosmic dust
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  for (let s = 0; s < 120; s++) {
    const sx = Math.random() * 1080;
    const sy = Math.random() * 1920;
    const sr = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sacred gold frame
  ctx.strokeStyle = "rgba(212, 175, 106, 0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, 980, 1820);
  ctx.strokeStyle = "rgba(212, 175, 106, 0.75)";
  ctx.lineWidth = 1;
  ctx.strokeRect(65, 65, 950, 1790);

  // Ornate corners
  ctx.fillStyle = "#F0C674";
  ctx.font = "36px serif";
  ctx.textAlign = "center";
  ctx.fillText("✧", 80, 90);
  ctx.fillText("✧", 1000, 90);
  ctx.fillText("✧", 80, 1835);
  ctx.fillText("✧", 1000, 1835);

  // Brand header
  ctx.fillStyle = "#D4AF6A";
  ctx.font = "bold 44px 'Cinzel', serif, Georgia";
  ctx.letterSpacing = "6px";
  ctx.fillText("L U N A R I S", 540, 160);

  ctx.fillStyle = "rgba(212, 175, 106, 0.75)";
  ctx.font = "20px sans-serif";
  const auraCardTitle = state.lang === "ru" ? "КОСМИЧЕСКАЯ КАРТА АУРЫ ДНЯ" : (state.lang === "en" ? "TODAY'S COSMIC AURA CARD" : "GÜNÜN KOZMİK AURA KARTI");
  ctx.fillText(auraCardTitle, 540, 205);

  // Aura orb glowing background
  const auraColor = card.style.getPropertyValue("--aura-color") || "#B580FF";
  const orbGrad = ctx.createRadialGradient(540, 600, 20, 540, 600, 320);
  orbGrad.addColorStop(0, auraColor);
  orbGrad.addColorStop(0.5, "rgba(181, 128, 255, 0.4)");
  orbGrad.addColorStop(1, "transparent");
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(540, 680, 420, 0, Math.PI * 2);
  ctx.fill();

  // Sacred Ring on Canvas
  ctx.strokeStyle = "rgba(240, 198, 116, 0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(540, 680, 220, 0, Math.PI * 2);
  ctx.stroke();

  // Center Glyph
  const glyphEl = card.querySelector(".aura-center-glyph");
  const glyphText = glyphEl ? glyphEl.textContent : "♈";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 130px sans-serif";
  ctx.fillText(glyphText, 540, 725);

  // Aura Color Name
  const nameEl = card.querySelector(".aura-color-name");
  ctx.fillStyle = "#F0C674";
  ctx.font = "bold 58px 'Cinzel', serif, Georgia";
  ctx.fillText(nameEl ? nameEl.textContent : "Kozmik Aura", 540, 1080);

  // Frequency
  const freqEl = card.querySelector(".aura-freq-chip");
  ctx.fillStyle = "#E8DCC8";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(freqEl ? freqEl.textContent.trim() : "741 Hz", 540, 1150);

  // Mantra Box
  const mantraEl = card.querySelector(".aura-mantra-quote");
  if (mantraEl) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.strokeStyle = "rgba(212, 175, 106, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(140, 1260, 800, 260, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#D4AF6A";
    ctx.font = "bold 24px sans-serif";
    const mantraLabel = state.lang === "ru" ? "М А Н Т Р А   Д Н Я" : (state.lang === "en" ? "D A I L Y   M A N T R A" : "G Ü N Ü N   M A N T R A S I");
    ctx.fillText(mantraLabel, 540, 1320);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "italic 32px Georgia, serif";
    const text = mantraEl.textContent.replace(/^["“]/, "").replace(/["”]$/, "");
    // Simple wrap
    ctx.fillText(`“${text}”`, 540, 1410, 720);
  }

  // Footer Tag
  ctx.fillStyle = "rgba(212, 175, 106, 0.6)";
  ctx.font = "22px sans-serif";
  ctx.fillText(UI[state.lang].auraCosmicGuideCanvas || "lunaris.web.app  ✦  Kozmik Rehberin", 540, 1760);

  const link = document.createElement("a");
  link.download = "lunaris-aura-karti.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  showToast(UI[state.lang].auraStoryDownloadedToast || "Aura kartın indirildi ✨");
}

window.scanAura = function() {
  const sel = document.getElementById("auraSignSelect");
  if (!sel) return;
  const signKey = sel.value;
  if (!signKey) return;
  const aura = generateAura(signKey);
  renderAuraResult(aura);
};

/* ==========================================================
   EVET / HAYIR SARKAC MOTORU (PENDULUM ENGINE)
   ========================================================== */
const PENDULUM_CARDS = {
  tr: [
    "Sezgilerin seni doğru yolda tutuyor.",
    "Sabır, şu anki en büyük kozmik gücün.",
    "Bu karar kalp çakranı açarak verilmeli.",
    "Evren zamanlamayı mükemmel ayarlıyor.",
    "Geçmiş deneyimlerin yoluna ışık tutuyor.",
    "Korkuyu bırak, güven, yolun açık."
  ],
  en: [
    "Your intuition is keeping you on the right path.",
    "Patience is your greatest cosmic power now.",
    "This decision must be made by opening your heart chakra.",
    "The universe is timing everything perfectly.",
    "Past experiences are illuminating the way forward.",
    "Release fear, have faith, your path is clear."
  ],
  ru: [
    "Ваша интуиция ведёт вас по верному пути.",
    "Терпение — ваша величайшая космическая сила сейчас.",
    "Это решение должно быть принято с открытым сердцем.",
    "Вселенная идеально рассчитывает время.",
    "Прошлый опыт освещает путь вперёд.",
    "Отпустите страх, верьте — ваш путь открыт."
  ]
};

window.swingPendulum = function() {
  const lang = state.lang;
  const input = document.getElementById("pendulumInput");
  const resultEl = document.getElementById("pendulumResult");
  const pendulumVisual = document.getElementById("pendulumVisual");
  if (!resultEl) return;
  
  const question = input ? input.value.trim() : "";
  
  resultEl.innerHTML = `<div class="pendulum-swinging">${UI[lang].pendulumSwinging}</div>`;
  if (pendulumVisual) pendulumVisual.classList.add("swinging");
  
  setTimeout(function() {
    if (pendulumVisual) pendulumVisual.classList.remove("swinging");
    const seed = Date.now() + question.length * 7 + (question.charCodeAt(0) || 42);
    const roll = seed % 100;
    let verdict, verdictClass;
    if (roll < 40) { verdict = UI[lang].pendulumYes; verdictClass = "verdict-yes"; }
    else if (roll < 70) { verdict = UI[lang].pendulumNo; verdictClass = "verdict-no"; }
    else { verdict = UI[lang].pendulumWait; verdictClass = "verdict-wait"; }
    
    const cards = PENDULUM_CARDS[lang] || PENDULUM_CARDS.tr;
    const advice = cards[seed % cards.length];
    
    resultEl.innerHTML = `
      <div class="pendulum-verdict ${verdictClass}">${verdict}</div>
      <p class="pendulum-advice"><strong>${UI[lang].pendulumAdvicePrefix}</strong> ${advice}</p>
    `;
  }, 3000);
};

/* ==========================================================
   CANLI AY FAZI HESAPLAYICI (MOON PHASE ENGINE)
   ========================================================== */
function calculateMoonPhase(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let c = Math.floor(365.25 * (year + 4716));
  let e = Math.floor(30.6001 * (month < 3 ? month + 13 : month + 1));
  const jd = c + e + day - 1524.5;
  const daySinceNew = jd - 2451549.5;
  const newMoons = daySinceNew / 29.53058770576;
  const phase = newMoons - Math.floor(newMoons);
  const ageDays = phase * 29.53;
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
  
  let phaseName, phaseEmoji;
  if (ageDays < 1.85) { phaseName = { tr: "Yeni Ay", en: "New Moon", ru: "Новолуние" }; phaseEmoji = "🌑"; }
  else if (ageDays < 7.38) { phaseName = { tr: "Hilal (Büyüyen)", en: "Waxing Crescent", ru: "Растущий серп" }; phaseEmoji = "🌒"; }
  else if (ageDays < 9.23) { phaseName = { tr: "İlk Dördün", en: "First Quarter", ru: "Первая четверть" }; phaseEmoji = "🌓"; }
  else if (ageDays < 14.77) { phaseName = { tr: "Büyüyen Ay", en: "Waxing Gibbous", ru: "Растущая луна" }; phaseEmoji = "🌔"; }
  else if (ageDays < 16.61) { phaseName = { tr: "Dolunay", en: "Full Moon", ru: "Полнолуние" }; phaseEmoji = "🌕"; }
  else if (ageDays < 22.15) { phaseName = { tr: "Küçülen Ay", en: "Waning Gibbous", ru: "Убывающая луна" }; phaseEmoji = "🌖"; }
  else if (ageDays < 24.0) { phaseName = { tr: "Son Dördün", en: "Last Quarter", ru: "Последняя четверть" }; phaseEmoji = "🌗"; }
  else { phaseName = { tr: "Hilal (Küçülen)", en: "Waning Crescent", ru: "Убывающий серп" }; phaseEmoji = "🌘"; }
  
  const moonSignsI18n = [
    { tr: "Koç", en: "Aries", ru: "Овен" },
    { tr: "Boğa", en: "Taurus", ru: "Телец" },
    { tr: "İkizler", en: "Gemini", ru: "Близнецы" },
    { tr: "Yengeç", en: "Cancer", ru: "Рак" },
    { tr: "Aslan", en: "Leo", ru: "Лев" },
    { tr: "Başak", en: "Virgo", ru: "Дева" },
    { tr: "Terazi", en: "Libra", ru: "Весы" },
    { tr: "Akrep", en: "Scorpio", ru: "Скорпион" },
    { tr: "Yay", en: "Sagittarius", ru: "Стрелец" },
    { tr: "Oğlak", en: "Capricorn", ru: "Козерог" },
    { tr: "Kova", en: "Aquarius", ru: "Водолей" },
    { tr: "Balık", en: "Pisces", ru: "Рыбы" }
  ];
  const signIdx = Math.floor((ageDays / 29.53) * 12) % 12;

  return { phaseName, phaseEmoji, illumination, ageDays: Math.round(ageDays * 10) / 10, moonSignI18n: moonSignsI18n[signIdx], signIdx };
}

const MOON_RITUALS = {
  tr: [
    { ritual: "Yeni başlangıçlara niyet et, mum yak ve 3 dileği kağıda yaz.", crystals: "Aytaşı, Labradorit", incense: "Adaçayı, Lavanta" },
    { ritual: "Büyüyen enerjiyle aksiyona geç, küçük adımlar at.", crystals: "Sitrin, Kaplan Gözü", incense: "Portakal, Bergamot" },
    { ritual: "Engellerle yüzleş, cesaretini topla.", crystals: "Karneliyan, Kırmızı Jasper", incense: "Gül, Sandal Ağacı" },
    { ritual: "Emeklerini görmeye başla, motivasyonu yükselt.", crystals: "Yeşil Aventurin, Pirit", incense: "Okaliptus, Nane" },
    { ritual: "Tamamlanan döngüleri kutla. Şükret ve bırakmaya hazırlan.", crystals: "Selenit, Ametist", incense: "Günlük, Mısır" },
    { ritual: "Artık hizmet etmeyenleri serbest bırak.", crystals: "Obsidyen, Dumanlı Kuvars", incense: "Palo Santo, Servi" },
    { ritual: "İç gözlem yap, ne öğrendiğini yaz.", crystals: "Lapis Lazuli, Florit", incense: "Yasemin, Sandal" },
    { ritual: "Dinlen, meditasyon yap, yeni döngü için enerji topla.", crystals: "Akuamarin, Ay Taşı", incense: "Lavanta, Rezene" }
  ],
  en: [
    { ritual: "Set intentions for new beginnings, light a candle, write 3 wishes on paper.", crystals: "Moonstone, Labradorite", incense: "Sage, Lavender" },
    { ritual: "Take action with growing energy, take small steps forward.", crystals: "Citrine, Tiger's Eye", incense: "Orange, Bergamot" },
    { ritual: "Face your obstacles and gather courage.", crystals: "Carnelian, Red Jasper", incense: "Rose, Sandalwood" },
    { ritual: "Recognize your efforts and elevate your motivation.", crystals: "Green Aventurine, Pyrite", incense: "Eucalyptus, Mint" },
    { ritual: "Celebrate completed cycles. Give thanks and prepare to release.", crystals: "Selenite, Amethyst", incense: "Frankincense, Myrrh" },
    { ritual: "Release what no longer serves you.", crystals: "Obsidian, Smoky Quartz", incense: "Palo Santo, Cypress" },
    { ritual: "Reflect inward and write down what you have learned.", crystals: "Lapis Lazuli, Fluorite", incense: "Jasmine, Sandalwood" },
    { ritual: "Rest, meditate, gather energy for the new cycle.", crystals: "Aquamarine, Moonstone", incense: "Lavender, Fennel" }
  ],
  ru: [
    { ritual: "Поставь намерения для нового начала, зажги свечу, запиши 3 желания.", crystals: "Лунный камень, Лабрадорит", incense: "Шалфей, Лаванда" },
    { ritual: "Действуй с растущей энергией, делай маленькие шаги вперёд.", crystals: "Цитрин, Тигровый глаз", incense: "Апельсин, Бергамот" },
    { ritual: "Встречай препятствия лицом к лицу и собирай мужество.", crystals: "Сердолик, Красный яшма", incense: "Роза, Сандал" },
    { ritual: "Признай свои усилия и повышай мотивацию.", crystals: "Зелёный авантюрин, Пирит", incense: "Эвкалипт, Мята" },
    { ritual: "Отмечай завершённые циклы. Будь благодарен и готовься отпустить.", crystals: "Селенит, Аметист", incense: "Ладан, Смирна" },
    { ritual: "Отпусти то, что больше не служит тебе.", crystals: "Обсидиан, Дымчатый кварц", incense: "Пало Санто, Кипарис" },
    { ritual: "Обратись внутрь себя и запиши, чему ты научился.", crystals: "Лазурит, Флюорит", incense: "Жасмин, Сандал" },
    { ritual: "Отдыхай, медитируй, накапливай энергию для нового цикла.", crystals: "Аквамарин, Лунный камень", incense: "Лаванда, Фенхель" }
  ]
};

function renderMoonPhase() {
  const lang = state.lang;
  const el = document.getElementById("moonRitualResult");
  if (!el) return;
  const moon = calculateMoonPhase(new Date());
  const ritualList = MOON_RITUALS[lang] || MOON_RITUALS.tr;
  const ritualData = ritualList[Math.min(Math.floor(moon.ageDays / 3.7), 7)];
  const moonSignText = moon.moonSignI18n ? (moon.moonSignI18n[lang] || moon.moonSignI18n.tr) : "-";

  el.innerHTML = `
    <div class="moon-phase-display">
      <div class="moon-orb-large">${moon.phaseEmoji}</div>
      <div class="moon-phase-info">
        <div class="moon-phase-name">${moon.phaseName[lang] || moon.phaseName.tr}</div>
        <div class="moon-stats">
          <span>${UI[lang].moonIlluminationLabel}: <strong>${moon.illumination}%</strong></span>
          <span>${UI[lang].moonZodiacSignLabel}: <strong>${moonSignText}</strong></span>
        </div>
      </div>
    </div>
    <div class="moon-ritual-card">
      <h4>${UI[lang].moonRitualTitleLabel}</h4>
      <p>${ritualData.ritual}</p>
      <div class="moon-ritual-tags">
        <span class="ritual-tag">${UI[lang].moonCrystalsLabel}: ${ritualData.crystals}</span>
        <span class="ritual-tag">${UI[lang].moonIncenseLabel}: ${ritualData.incense}</span>
      </div>
    </div>
  `;
}

/* ==========================================================
   KOZMIK SINERJI & YORUNGE RADARI (ORBIT RADAR ENGINE)
   ========================================================== */
const ORBIT_ELEMENT_MAP = { aries:"fire",taurus:"earth",gemini:"air",cancer:"water",leo:"fire",virgo:"earth",libra:"air",scorpio:"water",sagittarius:"fire",capricorn:"earth",aquarius:"air",pisces:"water" };
const ORBIT_ELEMENT_COMPAT = { "fire-fire":85,"fire-air":92,"fire-earth":55,"fire-water":45,"air-air":80,"air-earth":50,"air-water":60,"earth-earth":88,"earth-water":90,"water-water":82 };

function getElementName(element, lang) {
  const MAP = {
    fire:  { tr: "Ateş", en: "Fire",  ru: "Огонь" },
    earth: { tr: "Toprak", en: "Earth", ru: "Земля" },
    air:   { tr: "Hava",  en: "Air",   ru: "Воздух" },
    water: { tr: "Su",    en: "Water", ru: "Вода" }
  };
  return (MAP[element] || MAP.fire)[lang] || (MAP[element] || MAP.fire).tr;
}

function calcOrbitSynergy(sign1, sign2) {
  const lang = state.lang;
  const e1 = ORBIT_ELEMENT_MAP[sign1] || "fire";
  const e2 = ORBIT_ELEMENT_MAP[sign2] || "water";
  const pair = [e1, e2].sort().join("-");
  const baseCompat = ORBIT_ELEMENT_COMPAT[pair] || 65;
  const dayHash = new Date().toDateString().split("").reduce((a,b) => a + b.charCodeAt(0), 0);
  const resonance = Math.min(99, baseCompat + (dayHash % 12) - 5);
  const mind = Math.min(99, 50 + ((dayHash * 3 + sign1.length * 7) % 45));
  const passion = Math.min(99, 55 + ((dayHash * 5 + sign2.length * 11) % 40));
  const destiny = Math.min(99, 45 + ((dayHash * 2 + (sign1.charCodeAt(0) + sign2.charCodeAt(0))) % 50));
  return { resonance, mind, passion, destiny, element1: e1, element2: e2 };
}

window.calculateOrbit = function() {
  const lang = state.lang;
  const s1 = document.getElementById("orbitSign1");
  const s2 = document.getElementById("orbitSign2");
  const resultEl = document.getElementById("orbitResult");
  if (!s1 || !s2 || !resultEl) return;
  const sign1 = s1.value; const sign2 = s2.value;
  if (!sign1 || !sign2) return;
  const syn = calcOrbitSynergy(sign1, sign2);
  const avg = Math.round((syn.resonance + syn.mind + syn.passion + syn.destiny) / 4);
  
  resultEl.innerHTML = `
    <div class="orbit-visual">
      <div class="orbit-planet p1" style="--orbit-color: var(--gold);">${sign1.charAt(0).toUpperCase()}</div>
      <div class="orbit-ring"></div>
      <div class="orbit-planet p2" style="--orbit-color: var(--amethyst);">${sign2.charAt(0).toUpperCase()}</div>
    </div>
    <div class="orbit-radar-grid">
      <div class="radar-item"><span>${UI[lang].orbitResonance}</span><div class="radar-bar"><div class="radar-fill" style="width:${syn.resonance}%;"></div></div><span>${syn.resonance}%</span></div>
      <div class="radar-item"><span>${UI[lang].orbitMind}</span><div class="radar-bar"><div class="radar-fill" style="width:${syn.mind}%;"></div></div><span>${syn.mind}%</span></div>
      <div class="radar-item"><span>${UI[lang].orbitPassion}</span><div class="radar-bar"><div class="radar-fill" style="width:${syn.passion}%;"></div></div><span>${syn.passion}%</span></div>
      <div class="radar-item"><span>${UI[lang].orbitDestiny}</span><div class="radar-bar"><div class="radar-fill" style="width:${syn.destiny}%;"></div></div><span>${syn.destiny}%</span></div>
    </div>
    <div class="orbit-score">
      <div class="orbit-score-circle" style="--score: ${avg};">${avg}%</div>
      <div class="orbit-element-badge">${UI[lang].orbitElementTitle}: ${getElementName(syn.element1, lang)} + ${getElementName(syn.element2, lang)}</div>
    </div>
  `;
  resultEl.style.display = "block";
};

/* ==========================================================
   YILDIZ GALAKSISI & DILEK FENERI (STARFIELD WISHES ENGINE)
   ========================================================== */
window.initConstellationWishes = function() {
  const canvas = document.getElementById("wishStarfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 400;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  let wishes = [];
  let hoveredWish = null;
  
  function drawStarfield() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background stars
    for (let i = 0; i < 80; i++) {
      const sx = (i * 137.5 + 50) % canvas.width;
      const sy = (i * 97.3 + 30) % canvas.height;
      const brightness = 0.2 + Math.sin(Date.now() / 1000 + i) * 0.15;
      ctx.fillStyle = `rgba(255,255,255,${brightness})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1, 0, Math.PI * 2); ctx.fill();
    }
    // Wish stars
    wishes.forEach(function(w) {
      const x = (w.x / 100) * canvas.width;
      const y = (w.y / 100) * canvas.height;
      const pulse = 1 + Math.sin(Date.now() / 800 + w.x) * 0.3;
      const size = (w.size || 3) * pulse;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
      glow.addColorStop(0, w.color || "#FFD166");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 4, y - size * 4, size * 8, size * 8);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(drawStarfield);
  }
  
  // Load wishes
  if (window.LunarisWishes) {
    window.LunarisWishes.loadWishes().then(function(loaded) {
      wishes = loaded;
      drawStarfield();
    });
  } else {
    drawStarfield();
  }
  
  // Click handler
  canvas.addEventListener("click", function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    wishes.forEach(function(w) {
      const wx = (w.x / 100) * canvas.width;
      const wy = (w.y / 100) * canvas.height;
      if (Math.abs(mx - wx) < 15 && Math.abs(my - wy) < 15) {
        showWishModal(w);
      }
    });
  });
  
  window._wishStarfield = { wishes: wishes, addWish: function(w) { wishes.push(w); } };
};

function showWishModal(wish) {
  const lang = state.lang;
  let modal = document.getElementById("wishModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "wishModal";
    modal.className = "modal-overlay";
    modal.style.display = "none";
    modal.onclick = function(e) { if (e.target === modal) modal.style.display = "none"; };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-box wish-modal-box">
      <button class="modal-close" onclick="document.getElementById('wishModal').style.display='none'">x</button>
      <div class="wish-star-glow" style="color:${wish.color};">&#10022;</div>
      <h3>${UI[lang].wishModalTitle}</h3>
      <p class="wish-modal-text">"${wish.text}"</p>
      <p class="wish-modal-author">${UI[lang].wishModalAuthor} ${wish.author}</p>
      <div class="wish-light-count">${wish.lightCount || 1} &#10022;</div>
      <button class="btn-primary" onclick="sendLightToWish('${wish.id}')">${UI[lang].wishModalLightBtn}</button>
    </div>
  `;
  modal.style.display = "flex";
}

window.sendLightToWish = function(wishId) {
  if (window.LunarisWishes) {
    window.LunarisWishes.sendLight(wishId).then(function() {
      showToast(UI[state.lang].wishLightSentToast);
      document.getElementById("wishModal").style.display = "none";
    });
  }
};

window.submitWish = function() {
  const lang = state.lang;
  const textEl = document.getElementById("wishInput");
  const catEl = document.getElementById("wishCategory");
  if (!textEl) return;
  const text = textEl.value.trim();
  if (!text) { textEl.focus(); return; }
  const category = catEl ? catEl.value : "love";
  
  if (window.LunarisWishes) {
    window.LunarisWishes.sendWish(text, category).then(function(newWish) {
      textEl.value = "";
      if (window._wishStarfield) window._wishStarfield.addWish(newWish);
      showToast(UI[lang].wishLightSentToast);
    });
  }
};

function initAuthKeyListeners() {
  const loginInputs = ["loginEmail", "loginPassword"];
  loginInputs.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doLogin();
        }
      });
    }
  });

  const signupInputs = ["signupUsername", "signupEmail", "signupPassword"];
  signupInputs.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doSignup();
        }
      });
    }
  });

  const forgotInput = document.getElementById("forgotEmail");
  if (forgotInput) {
    forgotInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doForgotPassword();
      }
    });
  }
}

/* Global Initialization */
document.addEventListener("DOMContentLoaded", function() {
  initPreloader();
  updateAccountUI();
  initAuthKeyListeners();
  createStars(55);
  buildBgConstellation();
  initSparkleTrail();
  initCardTilt();
  initToTopButton();
  setInterval(function() {
    if (Math.random() < 0.65) spawnShootingStar();
  }, 4500);

  let resizeTimer;
  window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildBgConstellation, 400);
  });

  // Initialize new features if their containers exist
  if (document.getElementById("wishStarfield")) window.initConstellationWishes();
  if (document.getElementById("moonRitualResult")) renderMoonPhase();
});
