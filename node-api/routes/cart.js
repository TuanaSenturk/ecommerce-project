// ============================================================
// routes/cart.js — Sepet İşlemleri
// ============================================================

const express = require('express');
const db = require('../db');

const router = express.Router();

// ------------------------------------------------------------
// POST /cart
// Sepete ürün ekle. Aynı ürün zaten varsa adedini artır.
// Body: { user_id, product_id, quantity }
// ------------------------------------------------------------
router.post('/', async (req, res, next) => {
  try {
    const { user_id, product_id, quantity } = req.body;
    const qty = quantity || 1;

    if (!user_id || !product_id) {
      return res.status(400).json({ error: 'user_id ve product_id zorunludur' });
    }

    // Ürün gerçekten var mı ve stok yeterli mi?
    const product = await db.query('SELECT stock FROM products WHERE id = $1', [product_id]);
    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    if (product.rows[0].stock < qty) {
      return res.status(400).json({ error: 'Yetersiz stok' });
    }

    // ON CONFLICT: aynı (user_id, product_id) zaten varsa adedi topla.
    // Bu, schema.sql'deki UNIQUE kısıtlaması sayesinde çalışır.
    const result = await db.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3
       RETURNING *`,
      [user_id, product_id, qty]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /cart/:userId
// Bir kullanıcının sepetini ürün detaylarıyla birlikte getir.
// İki tabloyu JOIN ile birleştiriyoruz.
// ------------------------------------------------------------
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      `SELECT c.id          AS cart_item_id,
              c.quantity,
              p.id          AS product_id,
              p.name,
              p.price,
              p.image_url,
              (c.quantity * p.price) AS line_total
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1
       ORDER BY c.added_at`,
      [userId]
    );

    // Toplam tutarı JavaScript tarafında hesapla
    const total = result.rows.reduce(
      (sum, row) => sum + Number(row.line_total),
      0
    );

    res.json({ items: result.rows, total: total.toFixed(2) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// DELETE /cart/:cartItemId
// Sepetten tek bir kalemi sil.
// ------------------------------------------------------------
router.delete('/:cartItemId', async (req, res, next) => {
  try {
    const { cartItemId } = req.params;

    const result = await db.query(
      'DELETE FROM cart_items WHERE id = $1 RETURNING *',
      [cartItemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sepet kalemi bulunamadı' });
    }

    res.json({ message: 'Silindi', deleted: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
