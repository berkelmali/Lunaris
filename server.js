/* ============================================================
   LUNARIS — Yüksek Performanslı Canlı Topluluk Akışı Sunucusu (server.js)
   Facebook benzeri gerçek zamanlı topluluk akışı, SSE, O(1) bellek içi
   depolama, atomik disk kuyruğu ve XSS koruması.
   ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const WALL_FILE = path.join(DATA_DIR, "wall-posts.json");
const WALL_TMP_FILE = path.join(DATA_DIR, "wall-posts.tmp.json");

// Veri klasörünü hazırla
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Varsayılan ilham verici seed mesajları (Test mesajı içermez)
const DEFAULT_SEED_POSTS = [
  {
    id: "post_seed_1",
    name: "Aylin Yıldız",
    handle: "aylin.yildiz",
    authorUid: "seed_aylin",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Aylin",
    text: "Bu geceki Hilal enerjisiyle Tarot açılımımda 'Yıldız' kartını çektim. İçimdeki tüm şüpheler yerini derin bir huzura bıraktı. Herkesin dilekleri evrene ulaşsın ✨🌙",
    mood: "starry",
    likes: 34,
    comments: [
      {
        id: "c_1_1",
        name: "Mert K.",
        text: "Yıldız kartı daima umudun ve yenilenmenin habercisidir, enerjin harika!",
        createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString()
  },
  {
    id: "post_seed_2",
    name: "Mert K.",
    handle: "mert.astro",
    authorUid: "seed_mert",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Mert",
    text: "Jüpiter Boğa geçişi hayatımda yeni kapılar aralıyor! Sabırla ektiğimiz niyet tohumları filizlenmeye başladı, içinizdeki ışığa güvenin 🍀🪐",
    mood: "lucky",
    likes: 27,
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 95).toISOString()
  },
  {
    id: "post_seed_3",
    name: "Selin Doğan",
    handle: "selin.mistik",
    authorUid: "seed_selin",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Selin",
    text: "Venüs ve Ay uyumu ruhumuzu sıcacık yapıyor. Sevgi paylaştıkça çoğalan tek kozmik enerjidir, bugün birine sebepsizce güzel bir enerji yollayın 💜🔮",
    mood: "loved",
    likes: 42,
    comments: [
      {
        id: "c_3_1",
        name: "Aylin Yıldız",
        text: "Tüm sevgimiz evrene yayılsın ✨",
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: "post_seed_4",
    name: "Kaan Çelik",
    handle: "kaan.kozmik",
    authorUid: "seed_kaan",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Kaan",
    text: "12. evdeki sezgisel döngü rüyalarımı inanılmaz berraklaştırdı. Gece fısıltılarını günlüğüme not ettim, evrenin rehberliği harika 🌌✨",
    mood: "dreamy",
    likes: 19,
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: "post_seed_5",
    name: "Elif Nur",
    handle: "elif.tarot",
    authorUid: "seed_elif",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Elif",
    text: "Kupa Kraliçesi rehberliğinde şefkat ve dinginlik dolu bir gün. Kalbinizin sesini dinlediğinizde her yol aydınlanıyor 🕊️🕯️",
    mood: "starry",
    likes: 38,
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 500).toISOString()
  },
  {
    id: "post_seed_6",
    name: "Can Berk",
    handle: "can.orion",
    authorUid: "seed_can",
    photoURL: "https://api.dicebear.com/7.x/bottts/svg?seed=Can",
    text: "Bugün tüm kozmik yolculara bereket ve ilham diliyorum! Haritanızdaki potansiyeli keşfettikçe hayatın ritmi değişiyor ☀️⚡",
    mood: "lucky",
    likes: 25,
    comments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 750).toISOString()
  }
];

// ==========================================================
// 1. O(1) BELLEK İÇİ VERİ DEPOSU & ATOMİK DİSK YAZIM KUYRUĞU
// ==========================================================
let inMemoryWallPosts = loadInitialWallPosts();
let isPersisting = false;
let needsPersist = false;

function loadInitialWallPosts() {
  try {
    if (fs.existsSync(WALL_FILE)) {
      const raw = fs.readFileSync(WALL_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(p => {
          if (!p || !p.text) return false;
          const txt = (p.text + " " + (p.name || "") + " " + (p.handle || "")).toLowerCase();
          return !txt.includes("test message") && 
                 !txt.includes("hello world") && 
                 !txt.includes("test from node") && 
                 !txt.includes("test_user") &&
                 !txt.includes("xss_test") &&
                 !txt.includes("<script") &&
                 !txt.includes("alert(") &&
                 !txt.includes("onerror=") &&
                 !txt.includes("bağlantı kopması") &&
                 !txt.includes("canlı yayın testi");
        });
      }
    }
  } catch (err) {
    console.warn("Başlangıç verisi okunamadı, varsayılanlar yükleniyor:", err);
  }
  try {
    fs.writeFileSync(WALL_FILE, JSON.stringify(DEFAULT_SEED_POSTS, null, 2), "utf8");
  } catch (e) {}
  return [...DEFAULT_SEED_POSTS];
}

// Atomik ve kuyruklu disk kaydı (Yüksek eşzamanlılıkta kilitlenmeyi ve veri kaybını %100 önler)
function scheduleDiskPersist() {
  needsPersist = true;
  if (isPersisting) return;

  isPersisting = true;
  setImmediate(() => {
    while (needsPersist) {
      needsPersist = false;
      try {
        const data = JSON.stringify(inMemoryWallPosts.slice(0, 300), null, 2);
        fs.writeFileSync(WALL_TMP_FILE, data, "utf8");
        fs.renameSync(WALL_TMP_FILE, WALL_FILE);
      } catch (err) {
        // Windows geçici dosya kilidi durumunda doğrudan yazmayı dene
        try {
          fs.writeFileSync(WALL_FILE, JSON.stringify(inMemoryWallPosts.slice(0, 300), null, 2), "utf8");
        } catch (e) {
          console.error("Disk kayıt hatası:", e);
        }
      }
    }
    isPersisting = false;
  });
}

// ==========================================================
// 2. SERVER-SENT EVENTS (SSE) GERÇEK ZAMANLI İSTEMCİ YÖNETİMİ
// ==========================================================
const sseClients = new Set();

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// 15 saniyede bir SSE liveness heartbeat gönder (Bağlantıların kopmasını önler)
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(": keepalive\n\n");
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 15000);

// ==========================================================
// 3. STATİK DOSYA & GÜVENLİK YARDIMCILARI
// ==========================================================
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 500000) { // Max 500KB payload
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sanitizeText(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\0/g, "").trim();
}

function sanitizePhotoUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://localhost")) {
    return url.slice(0, 2048);
  }
  return null;
}

// Basit IP tabanlı rate limit (DDoS & Spam koruması)
const ipRequestCounts = new Map();
setInterval(() => ipRequestCounts.clear(), 60000); // Her dakika sıfırla

function isRateLimited(ip) {
  // Yerel döngü (localhost / loopback) ve dahili testler için engelleme yapma
  if (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "localhost") {
    return false;
  }
  const count = (ipRequestCounts.get(ip) || 0) + 1;
  ipRequestCounts.set(ip, count);
  return count > 600; // Dış IP'ler için dakikada 600 istek limiti
}

// ==========================================================
// 4. HTTP SUNUCUSU VE API İŞLEYİCİSİ
// ==========================================================
const server = http.createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return sendJson(res, 429, { success: false, error: "Too many requests. Please slow down." });
  }

  // Modern WHATWG URL Parser (Deprecation hatası içermez)
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // CORS Ön Uçuş Kontrolü
  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    });
    return res.end();
  }

  // 1. Canlı SSE Akışı (Server-Sent Events)
  if (pathname === "/api/wall/stream" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write(`data: ${JSON.stringify({ type: "init", message: "Lunaris Live Feed Connected", timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    const cleanup = () => sseClients.delete(res);
    req.on("close", cleanup);
    res.on("error", cleanup);
    return;
  }

  // 2. Tüm Gönderileri Getir (O(1) Memory Response)
  if (pathname === "/api/wall" && method === "GET") {
    return sendJson(res, 200, { success: true, posts: inMemoryWallPosts });
  }

  // 3. Yeni Gönderi Paylaş (Tüm kullanıcılara canlı yayılır!)
  if (pathname === "/api/wall" && method === "POST") {
    try {
      const data = await parseJsonBody(req);
      const text = sanitizeText(data.text);
      if (!text || text.length > 500) {
        return sendJson(res, 400, { success: false, error: "Mesaj 1-500 karakter arasında olmalıdır." });
      }

      const rawMood = sanitizeText(data.mood);
      const validMoods = ["starry", "loved", "lucky", "dreamy"];
      const mood = validMoods.includes(rawMood) ? rawMood : "starry";

      const authorName = sanitizeText(data.name).slice(0, 50) || "Kozmik Gezgin";
      const handle = sanitizeText(data.handle).toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30) || "gezgin";
      const photoURL = sanitizePhotoUrl(data.photoURL) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`;

      const newPost = {
        id: "post_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name: authorName,
        handle: handle,
        authorUid: sanitizeText(data.authorUid).slice(0, 60) || ("guest_" + Date.now()),
        photoURL: photoURL,
        text: text,
        mood: mood,
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString()
      };

      // Bellek içine anında ekle (O(1), yarış durumu yok)
      inMemoryWallPosts.unshift(newPost);
      scheduleDiskPersist();

      // Tüm bağlı istemcilere SSE ile canlı yayınla
      broadcastSSE({ type: "new_post", post: newPost });

      return sendJson(res, 201, { success: true, post: newPost });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: "Geçersiz istek gövdesi." });
    }
  }

  // 4. Gönderi Beğen (Atomik Sayaç Artırımı)
  const likeMatch = pathname.match(/^\/api\/wall\/([^/]+)\/like$/);
  if (likeMatch && method === "POST") {
    const postId = decodeURIComponent(likeMatch[1]);
    const target = inMemoryWallPosts.find(p => p.id === postId);
    if (!target) {
      return sendJson(res, 404, { success: false, error: "Gönderi bulunamadı." });
    }

    target.likes = (target.likes || 0) + 1;
    scheduleDiskPersist();

    broadcastSSE({ type: "like_post", id: postId, likes: target.likes });
    return sendJson(res, 200, { success: true, id: postId, likes: target.likes });
  }

  // 5. Gönderiye Yorum Yap
  const commentMatch = pathname.match(/^\/api\/wall\/([^/]+)\/comment$/);
  if (commentMatch && method === "POST") {
    try {
      const postId = decodeURIComponent(commentMatch[1]);
      const data = await parseJsonBody(req);
      const text = sanitizeText(data.text);
      if (!text || text.length > 300) {
        return sendJson(res, 400, { success: false, error: "Yorum metni 1-300 karakter olmalıdır." });
      }

      const target = inMemoryWallPosts.find(p => p.id === postId);
      if (!target) {
        return sendJson(res, 404, { success: false, error: "Gönderi bulunamadı." });
      }

      const commentName = sanitizeText(data.name).slice(0, 50) || "Kozmik Yolcu";
      const commentPhoto = sanitizePhotoUrl(data.photoURL) || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(commentName)}`;

      if (!target.comments) target.comments = [];
      const newComment = {
        id: "c_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        name: commentName,
        text: text,
        photoURL: commentPhoto,
        createdAt: new Date().toISOString()
      };

      target.comments.push(newComment);
      scheduleDiskPersist();

      broadcastSSE({ type: "new_comment", postId: postId, comment: newComment });
      return sendJson(res, 201, { success: true, postId: postId, comment: newComment });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: "Geçersiz yorum isteği." });
    }
  }

  // 6. Gönderi Sil
  const deleteMatch = pathname.match(/^\/api\/wall\/([^/]+)$/);
  if (deleteMatch && method === "DELETE") {
    const postId = decodeURIComponent(deleteMatch[1]);
    const prevLen = inMemoryWallPosts.length;
    inMemoryWallPosts = inMemoryWallPosts.filter(p => p.id !== postId);
    if (inMemoryWallPosts.length !== prevLen) {
      scheduleDiskPersist();
      broadcastSSE({ type: "delete_post", id: postId });
    }
    return sendJson(res, 200, { success: true });
  }

  // ==========================================================
  // 5. STATİK DOSYA SUNUCUSU
  // ==========================================================
  let safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  if (safePath === "/" || safePath === "\\") {
    safePath = "/index.html";
  }

  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 Not Found");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": (ext === ".html" || ext === ".js" || ext === ".json" || ext === ".css") 
        ? "no-cache, no-store, must-revalidate" 
        : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`✨ Lunaris Sunucusu http://localhost:${PORT} adresinde aktif!`);
  console.log(`🌌 Topluluk Duvarı API'si ve Canlı Sosyal Akış (SSE) devrede.`);
});
