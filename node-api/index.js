// ============================================================
// index.js — Node.js API Giriş Noktası
// ============================================================
// Bu dosya Express sunucusunu başlatır ve tüm route'ları bağlar.
// Çalıştırmak için:  npm start
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Route dosyalarını içe aktar
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');

const app = express();

// --- Middleware ---
app.use(cors());          // Tarayıcıdan gelen isteklere izin ver
app.use(express.json());  // Gelen JSON body'leri otomatik ayrıştır
app.use(express.static(path.join(__dirname, 'public'))); // HTML arayüzü

// Basit bir istek günlükçüsü (her isteği konsola yazar — öğrenirken faydalı)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

// --- Sağlık kontrolü ---
// AWS Load Balancer bu adrese istek atıp sunucunun ayakta olup
// olmadığını anlar. ELB için kritik bir endpoint'tir.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'node-api', time: new Date() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'E-Ticaret Node.js API çalışıyor',
    endpoints: ['/products', '/auth', '/cart', '/orders', '/health'],
  });
});

// --- Route'ları bağla ---
app.use('/products', productsRouter);
app.use('/auth', authRouter);
app.use('/cart', cartRouter);
app.use('/orders', ordersRouter);

// --- 404 (bulunamayan adres) ---
app.use((req, res) => {
  res.status(404).json({ error: 'Adres bulunamadı' });
});

// --- Genel hata yakalayıcı ---
// Route'larda yakalanmayan hatalar buraya düşer.
app.use((err, req, res, next) => {
  console.error('HATA:', err.message);
  res.status(500).json({ error: 'Sunucu hatası', detail: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Node.js API çalışıyor: http://localhost:${PORT}`);
});
