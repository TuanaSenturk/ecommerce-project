// ============================================================
// db.js — PostgreSQL Bağlantısı
// ============================================================
// "pg" kütüphanesinin Pool yapısını kullanıyoruz.
// Pool, birden fazla bağlantıyı yeniden kullanır; her istekte
// yeni bağlantı açıp kapatmaktan çok daha verimlidir.
// ============================================================

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // AWS RDS'e bağlanırken SSL gerekebilir. Lokalde kapalı.
  ssl: { rejectUnauthorized: false }
});

// Bağlantıyı bir kez test et (uygulama açılışında bilgi verir)
pool.connect()
  .then(client => {
    console.log('✓ PostgreSQL bağlantısı başarılı.');
    client.release();
  })
  .catch(err => {
    console.error('✗ PostgreSQL bağlantı hatası:', err.message);
  });

// query: her yerde kullanacağımız kısayol fonksiyonu.
// Parametreli sorgu kullanıyoruz ($1, $2...) çünkü bu SQL injection'ı önler.
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
