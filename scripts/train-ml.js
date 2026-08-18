#!/usr/bin/env node
/* ==========================================================
   LUNARIS — MLP Eğitim Scripti (train-ml.js)
   Firestore'dan kullanıcı feedback verilerini çeker,
   gerçek backpropagation ile MLP eğitir,
   ml-weights.json dosyasına kaydeder.

   Kullanım:
     node train-ml.js            — Tam eğitim
     node train-ml.js --test     — Sentetik veriyle test
   ========================================================== */

const fs = require('fs');
const path = require('path');

/* ══════════════════════════════════════════════════
   MLP TRAINER — Gerçek Backpropagation ile
   Mimari: Input(16) → Hidden1(12) → Hidden2(8) → Output(6)
   ══════════════════════════════════════════════════ */

class MLPTrainer {
  constructor(sizes) {
    this.sizes = sizes; // [16, 12, 8, 6]
    this.W = [];
    this.B = [];

    // Xavier initialization
    for (let l = 0; l < sizes.length - 1; l++) {
      const fanIn = sizes[l], fanOut = sizes[l + 1];
      const limit = Math.sqrt(6.0 / (fanIn + fanOut));
      this.W.push(
        Array.from({ length: fanOut }, () =>
          Array.from({ length: fanIn }, () => (Math.random() * 2 - 1) * limit)
        )
      );
      this.B.push(new Array(fanOut).fill(0));
    }
  }

  /* Aktivasyon fonksiyonları */
  leakyRelu(x) { return x > 0 ? x : 0.01 * x; }
  leakyReluDeriv(x) { return x > 0 ? 1.0 : 0.01; }
  sigmoid(x) { return 1.0 / (1.0 + Math.exp(-Math.max(-500, Math.min(500, x)))); }
  sigmoidDeriv(y) { return y * (1.0 - y); }

  /* Matris × Vektör çarpımı */
  matVec(mat, vec) {
    return mat.map(row => row.reduce((s, w, i) => s + w * (vec[i] || 0), 0));
  }

  /* Forward Pass — ara değerleri saklayarak */
  forward(input) {
    const activations = [input.slice()];
    const zValues = [];
    let a = input.slice();

    for (let l = 0; l < this.W.length; l++) {
      const z = this.matVec(this.W[l], a).map((v, i) => v + this.B[l][i]);
      zValues.push(z);
      const isLast = (l === this.W.length - 1);
      a = z.map(v => isLast ? this.sigmoid(v) : this.leakyRelu(v));
      activations.push(a);
    }

    return { output: a, activations, zValues };
  }

  /* ★ Backpropagation — Gerçek gradyan hesabı ★ */
  backward(fwd, target, lr) {
    const { activations, zValues } = fwd;
    const L = this.W.length;
    const deltas = new Array(L);

    // Output katmanı delta: dL/dz = (output - target) * sigmoid'(output)
    const outA = activations[L];
    deltas[L - 1] = outA.map((o, i) => (o - target[i]) * this.sigmoidDeriv(o));

    // Hidden katmanları geriye doğru propagate et
    for (let l = L - 2; l >= 0; l--) {
      deltas[l] = new Array(this.sizes[l + 1]).fill(0);
      for (let j = 0; j < this.sizes[l + 1]; j++) {
        let sum = 0;
        for (let k = 0; k < this.sizes[l + 2]; k++) {
          sum += this.W[l + 1][k][j] * deltas[l + 1][k];
        }
        deltas[l][j] = sum * this.leakyReluDeriv(zValues[l][j]);
      }
    }

    // Ağırlık güncellemesi (SGD)
    for (let l = 0; l < L; l++) {
      for (let j = 0; j < this.W[l].length; j++) {
        for (let k = 0; k < this.W[l][j].length; k++) {
          this.W[l][j][k] -= lr * deltas[l][j] * activations[l][k];
        }
        this.B[l][j] -= lr * deltas[l][j];
      }
    }
  }

  /* MSE Loss fonksiyonu */
  mse(output, target) {
    let sum = 0;
    for (let i = 0; i < output.length; i++) {
      sum += (output[i] - target[i]) * (output[i] - target[i]);
    }
    return sum / output.length;
  }

  /* Eğitim döngüsü — Mini-batch SGD */
  train(dataset, epochs, batchSize, lr) {
    let bestLoss = Infinity;
    let bestWeights = null;
    const lrDecay = 0.995;

    for (let ep = 0; ep < epochs; ep++) {
      // Shuffle dataset
      const shuffled = dataset.slice().sort(() => Math.random() - 0.5);
      let totalLoss = 0;
      let sampleCount = 0;

      for (let b = 0; b < shuffled.length; b += batchSize) {
        const batch = shuffled.slice(b, b + batchSize);
        batch.forEach(sample => {
          const fwd = this.forward(sample.input);
          totalLoss += this.mse(fwd.output, sample.target);
          sampleCount++;
          this.backward(fwd, sample.target, lr);
        });
      }

      const avgLoss = totalLoss / sampleCount;

      // Best model checkpoint
      if (avgLoss < bestLoss) {
        bestLoss = avgLoss;
        bestWeights = this.exportWeights();
      }

      // Learning rate decay
      lr *= lrDecay;

      if (ep % 10 === 0 || ep === epochs - 1) {
        const bar = '█'.repeat(Math.round((ep / epochs) * 30)).padEnd(30, '░');
        console.log(`  [${bar}] Epoch ${String(ep).padStart(3)}: loss = ${avgLoss.toFixed(6)}  lr = ${lr.toFixed(6)}`);
      }
    }

    // En iyi ağırlıkları yükle
    if (bestWeights) {
      this.loadWeights(bestWeights);
    }

    return bestLoss;
  }

  /* Doğruluk hesabı — yönelim doğru mu? */
  accuracy(dataset) {
    let correct = 0;
    dataset.forEach(sample => {
      const fwd = this.forward(sample.input);
      // Her kategori için: tahmin yönü (yüksek/düşük) target ile uyuşuyor mu?
      let match = true;
      for (let i = 0; i < fwd.output.length; i++) {
        const predHigh = fwd.output[i] >= 0.5;
        const targetHigh = sample.target[i] >= 0.5;
        if (predHigh !== targetHigh) { match = false; break; }
      }
      if (match) correct++;
    });
    return correct / dataset.length;
  }

  /* Ağırlıkları export et */
  exportWeights() {
    return {
      W1: this.W[0].map(r => r.slice()),
      B1: this.B[0].slice(),
      W2: this.W[1].map(r => r.slice()),
      B2: this.B[1].slice(),
      W3: this.W[2].map(r => r.slice()),
      B3: this.B[2].slice()
    };
  }

  /* Ağırlıkları yükle */
  loadWeights(w) {
    this.W[0] = w.W1.map(r => r.slice());
    this.B[0] = w.B1.slice();
    this.W[1] = w.W2.map(r => r.slice());
    this.B[1] = w.B2.slice();
    this.W[2] = w.W3.map(r => r.slice());
    this.B[2] = w.B3.slice();
  }
}


/* ══════════════════════════════════════════════════
   VERİ DÖNÜŞÜMÜ
   Firestore feedback → eğitim dataset'i
   ══════════════════════════════════════════════════ */

const CATEGORY_ORDER = ['love', 'luck', 'career', 'health', 'money', 'daily'];

function feedbackToDataset(feedbackDocs) {
  const dataset = [];
  const sampleHashCounts = {};

  feedbackDocs.forEach(doc => {
    const d = doc;

    // 1. Bot / Hızlı Tıklama Filtresi: 1.5 saniyeden kısa okumalar gürültüdür
    const readDuration = typeof d.readDuration === 'number' ? d.readDuration : 0;
    if (readDuration < 1.5) return;

    // 2. Vektör Bütünlük Kontrolü
    const signVec = d.signVector;
    const tempVec = d.temporalVector;
    if (!Array.isArray(signVec) || !Array.isArray(tempVec) || signVec.length !== 8 || tempVec.length !== 8) return;
    const input = signVec.concat(tempVec);

    // 3. Spam / Manipülasyon Filtresi (Aynı imzadan max 3 kayıt kabul et)
    const sampleHash = d.signKey + '_' + d.category + '_' + Math.round((d.score || 0) * 10);
    sampleHashCounts[sampleHash] = (sampleHashCounts[sampleHash] || 0) + 1;
    if (sampleHashCounts[sampleHash] > 3) return;

    // 4. Target oluşturma
    const baseScores = Array.isArray(d.mlScores) && d.mlScores.length === 6 ? d.mlScores : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const catIdx = CATEGORY_ORDER.indexOf(d.category);
    if (catIdx === -1) return;

    const target = baseScores.map((s, i) => {
      const base = typeof s === 'number' ? s : 0.5;
      if (i === catIdx) {
        if (d.rating === 1) {
          // 👍 → Skoru kontrollü yükselt
          const boost = readDuration > 15 ? 0.14 : 0.10;
          return Math.min(0.92, base + boost);
        } else {
          // 👎 → Skoru kontrollü düşür
          return Math.max(0.08, base - 0.12);
        }
      }
      return base;
    });

    dataset.push({ input, target });
  });

  return dataset;
}


/* ══════════════════════════════════════════════════
   SENTETİK VERİ ÜRETİCİ (Test modu için)
   ══════════════════════════════════════════════════ */

function generateSyntheticData(count) {
  console.log(`🧪 ${count} sentetik feedback üretiliyor...`);
  const signVectors = {
    aries:  [0.95, 0.20, 0.90, 0.30, 0.65, 0.25, 0.95, 0.20],
    taurus: [0.30, 0.95, 0.20, 0.95, 0.55, 0.40, 0.40, 0.65],
    gemini: [0.75, 0.30, 0.80, 0.45, 0.95, 0.55, 0.55, 0.45],
    cancer: [0.45, 0.70, 0.35, 0.60, 0.65, 0.80, 0.35, 0.95],
    leo:    [0.90, 0.55, 0.75, 0.40, 0.85, 0.35, 0.90, 0.50],
    virgo:  [0.50, 0.85, 0.30, 0.95, 0.60, 0.65, 0.55, 0.70]
  };
  const signs = Object.keys(signVectors);
  const data = [];

  for (let i = 0; i < count; i++) {
    const sign = signs[i % signs.length];
    const signVec = signVectors[sign];
    const tempVec = Array.from({ length: 8 }, () => 0.3 + Math.random() * 0.5);
    const cat = CATEGORY_ORDER[i % CATEGORY_ORDER.length];
    const catIdx = CATEGORY_ORDER.indexOf(cat);

    // Basit kural: burcun güçlü olduğu boyut yüksekse, ilgili kategori de yüksek olmalı
    const strength = signVec.reduce((s, v, j) => s + v * tempVec[j], 0) / 8;
    const baseScore = 0.3 + strength * 0.5;
    const mlScores = CATEGORY_ORDER.map(() => 0.3 + Math.random() * 0.4);
    mlScores[catIdx] = baseScore;

    // Rating: skor yüksekse kullanıcı muhtemelen beğendi
    const rating = (baseScore > 0.55 && Math.random() > 0.3) ? 1 : (Math.random() > 0.6 ? 1 : 0);

    data.push({
      signVector: signVec,
      temporalVector: tempVec,
      category: cat,
      mlScores: mlScores,
      rating: rating,
      readDuration: 5 + Math.random() * 30
    });
  }

  return data;
}


/* ══════════════════════════════════════════════════
   ANA AKIŞ
   ══════════════════════════════════════════════════ */

async function main() {
  const isTest = process.argv.includes('--test');
  const outputPath = path.resolve(__dirname, '..', 'ml-weights.json');

  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  🧠 LUNARIS ML — Eğitim Pipeline v1.0     ║');
  console.log('║  Gerçek Backpropagation ile MLP Eğitimi    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  let feedbackData;

  if (isTest) {
    // ═══ TEST MODU: Sentetik veriyle eğitim ═══
    console.log('🧪 TEST MODU — Sentetik veri kullanılıyor');
    feedbackData = generateSyntheticData(200);
  } else {
    // ═══ GERÇEK MOD: Firestore'dan veri çek ═══
    console.log('📥 Firestore\'dan feedback verileri çekiliyor...');
    try {
      const admin = require('firebase-admin');

      // Service account veya Application Default Credentials
      if (!admin.apps.length) {
        // Önce service account dosyasını dene
        const saPath = path.resolve(__dirname, 'serviceAccountKey.json');
        if (fs.existsSync(saPath)) {
          const sa = require(saPath);
          admin.initializeApp({ credential: admin.credential.cert(sa) });
          console.log('   🔑 Service account ile bağlandı');
        } else {
          // GOOGLE_APPLICATION_CREDENTIALS veya gcloud auth
          admin.initializeApp({ projectId: 'lunaris-1' });
          console.log('   🔑 Application Default Credentials ile bağlandı');
          console.log('   💡 İpucu: "gcloud auth application-default login" çalıştır');
        }
      }

      const firestore = admin.firestore();
      const snap = await firestore.collection('ml_feedback').get();
      console.log(`   📊 ${snap.size} feedback bulundu`);

      if (snap.size < 30) {
        console.log('');
        console.log('⚠️  Minimum 30 feedback gerekli. Henüz yeterli veri yok.');
        console.log('   💡 Test modu için: node train-ml.js --test');
        console.log('');
        process.exit(0);
      }

      feedbackData = [];
      snap.forEach(doc => feedbackData.push(doc.data()));
    } catch (err) {
      console.error('❌ Firestore bağlantı hatası:', err.message);
      console.log('');
      console.log('   💡 Çözümler:');
      console.log('   1. gcloud auth application-default login');
      console.log('   2. Service account key dosyasını scripts/serviceAccountKey.json olarak kaydet');
      console.log('   3. Test modu: node train-ml.js --test');
      console.log('');
      process.exit(1);
    }
  }

  // Veriyi eğitim formatına dönüştür
  const dataset = feedbackToDataset(feedbackData);
  console.log(`   🔄 ${dataset.length} eğitim örneği hazırlandı`);

  if (dataset.length < 10) {
    console.log('⚠️  Yeterli geçerli veri yok (minimum 10).');
    process.exit(0);
  }

  // Train/Validation split (%80/%20)
  const splitIdx = Math.floor(dataset.length * 0.8);
  const shuffled = dataset.sort(() => Math.random() - 0.5);
  const trainSet = shuffled.slice(0, splitIdx);
  const valSet = shuffled.slice(splitIdx);

  console.log(`   📊 Eğitim: ${trainSet.length} örnek, Doğrulama: ${valSet.length} örnek`);
  console.log('');

  // MLP eğit
  console.log('🧠 MLP eğitimi başlıyor...');
  console.log(`   Mimari: [16] → [12] → [8] → [6]`);
  console.log(`   Aktivasyonlar: LeakyReLU → LeakyReLU → Sigmoid`);
  console.log('');

  const mlp = new MLPTrainer([16, 12, 8, 6]);
  const finalLoss = mlp.train(trainSet, 150, Math.min(32, trainSet.length), 0.01);

  // Validation doğruluğu
  const trainAcc = mlp.accuracy(trainSet);
  const valAcc = valSet.length > 0 ? mlp.accuracy(valSet) : trainAcc;

  console.log('');
  console.log('📊 Eğitim Sonuçları:');
  console.log(`   Final Loss     : ${finalLoss.toFixed(6)}`);
  console.log(`   Train Accuracy : ${(trainAcc * 100).toFixed(1)}%`);
  console.log(`   Val Accuracy   : ${(valAcc * 100).toFixed(1)}%`);

  // Ağırlıkları kaydet
  const weights = mlp.exportWeights();
  const output = {
    version: Date.now(),
    trainedAt: new Date().toISOString(),
    sampleCount: dataset.length,
    finalLoss: parseFloat(finalLoss.toFixed(6)),
    trainAccuracy: parseFloat((trainAcc * 100).toFixed(1)),
    valAccuracy: parseFloat((valAcc * 100).toFixed(1)),
    architecture: [16, 12, 8, 6],
    activations: ['leakyRelu', 'leakyRelu', 'sigmoid'],
    weights: weights
  };

  fs.writeFileSync(outputPath, JSON.stringify(output));
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);

  console.log('');
  console.log('✅ Eğitim tamamlandı!');
  console.log(`   📄 ${outputPath}`);
  console.log(`   📦 Dosya boyutu: ${fileSizeKB} KB`);
  console.log('');
  console.log('🚀 Yayınlamak için:');
  console.log('   cd .. && firebase deploy --only hosting');
  console.log('');
}

main().catch(err => {
  console.error('❌ Hata:', err);
  process.exit(1);
});
