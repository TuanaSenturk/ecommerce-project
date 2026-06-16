// ============================================================
// routes/products.js — Ürün Endpoint'leri
// ============================================================

const express = require('express');
const axios = require('axios');
const db = require('../db');

const router = express.Router();

// ------------------------------------------------------------
// GET /products
// Tüm ürünleri listele. İsteğe bağlı ?category=elektronik filtresi.
// ------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;

    let result;
    if (category) {
      result = await db.query(
        'SELECT * FROM products WHERE category = $1 ORDER BY id',
        [category]
      );
    } else {
      result = await db.query('SELECT * FROM products ORDER BY id');
    }

    res.json(result.rows);
  } catch (err) {
    next(err); // hatayı index.js'deki genel yakalayıcıya gönder
  }
});

// ------------------------------------------------------------
// GET /products/:id
// Tek bir ürünü getir. Ayrıca Python servisinden öneri çeker.
// Bu, Node.js ile Python'un nasıl haberleştiğini gösteren ana yer.
// ------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const product = result.rows[0];

    // --- Python servisinden öneri al ---
    // Python servisi kapalıysa uygulama çökmemeli; bu yüzden try/catch.
    let recommendations = [];
    try {
      const pyUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
      const recResponse = await axios.get(`${pyUrl}/recommend/${id}`, {
        timeout: 2000, // 2 saniyede cevap gelmezse vazgeç
      });
      recommendations = recResponse.data.recommendations || [];
    } catch (pyErr) {
      console.warn('Python servisi cevap vermedi, öneriler boş döndü.');
    }

    res.json({ product, recommendations });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /products
// Yeni ürün ekle (basit yönetici işlevi).
// Body: { name, description, price, stock, category, image_url }
// ------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { name, description, price, stock, category, image_url } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: 'name ve price zorunludur' });
    }

    const result = await db.query(
      `INSERT INTO products (name, description, price, stock, category, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, price, stock || 0, category, image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
