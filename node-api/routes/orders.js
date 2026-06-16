// ============================================================
// routes/orders.js — Sipariş İşlemleri
// ============================================================
// Sipariş oluşturmak birden fazla tabloyu aynı anda değiştirir:
//   1. orders     → sipariş başlığı eklenir
//   2. order_items → her ürün satırı eklenir
//   3. products   → stok düşürülür
//   4. cart_items → sepet temizlenir
//
// Bunların HEPSİ ya birlikte başarılı olmalı ya da hiçbiri olmamalı.
// Yarıda kalırsa (örn. stok düştü ama sipariş kaydı oluşmadı) veri bozulur.
// Bu yüzden TRANSACTION kullanıyoruz: BEGIN ... COMMIT / ROLLBACK.
// ============================================================

const express = require('express');
const db = require('../db');

const router = express.Router();

// ------------------------------------------------------------
// POST /orders
// Kullanıcının sepetini siparişe çevirir.
// Body: { user_id }
// ------------------------------------------------------------
router.post('/', async (req, res, next) => {
  // Transaction için havuzdan tek bir bağlantı (client) alıyoruz.
  const client = await db.pool.connect();

  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'user_id zorunludur' });
    }

    // Sepeti oku
    const cart = await client.query(
      `SELECT c.product_id, c.quantity, p.price, p.stock, p.name
       FROM cart_items c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = $1`,
      [user_id]
    );

    if (cart.rows.length === 0) {
      return res.status(400).json({ error: 'Sepet boş' });
    }

    // Stok kontrolü — sipariş oluşturmadan önce
    for (const item of cart.rows) {
      if (item.stock < item.quantity) {
        return res.status(400).json({
          error: `Yetersiz stok: ${item.name} (stok: ${item.stock}, istenen: ${item.quantity})`,
        });
      }
    }

    // Toplam tutar
    const total = cart.rows.reduce(
      (sum, item) => sum + item.quantity * Number(item.price),
      0
    );

    // ---------- TRANSACTION BAŞLA ----------
    await client.query('BEGIN');

    // 1. Sipariş başlığı
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, created_at`,
      [user_id, total.toFixed(2)]
    );
    const orderId = orderResult.rows[0].id;

    // 2. Sipariş kalemleri + 3. stok düşürme
    for (const item of cart.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // 4. Sepeti temizle
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [user_id]);

    await client.query('COMMIT');
    // ---------- TRANSACTION BİTTİ ----------

    res.status(201).json({
      message: 'Sipariş oluşturuldu',
      order_id: orderId,
      total: total.toFixed(2),
      created_at: orderResult.rows[0].created_at,
    });
  } catch (err) {
    // Herhangi bir adım patlarsa tüm değişiklikleri geri al
    await client.query('ROLLBACK');
    next(err);
  } finally {
    // Bağlantıyı her durumda havuza geri ver — yoksa bağlantı sızar
    client.release();
  }
});

// ------------------------------------------------------------
// GET /orders/:userId
// Bir kullanıcının tüm siparişlerini listele.
// ------------------------------------------------------------
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const orders = await db.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(orders.rows);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /orders/detail/:orderId
// Bir siparişin içindeki ürünleri getir.
// ------------------------------------------------------------
router.get('/detail/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const items = await db.query(
      `SELECT oi.quantity, oi.unit_price, p.name,
              (oi.quantity * oi.unit_price) AS line_total
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    res.json({ order_id: orderId, items: items.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
