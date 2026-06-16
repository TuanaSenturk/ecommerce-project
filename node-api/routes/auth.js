// ============================================================
// routes/auth.js — Kayıt ve Giriş
// ============================================================
// Şifreleri bcrypt ile hash'liyoruz. Düz metin şifre saklamak
// büyük bir güvenlik hatasıdır — bcrypt tek yönlüdür, geri çözülmez.
//
// NOT: Gerçek bir projede giriş sonrası JWT token üretip her
// istekte doğrularsın. Bu okul projesinde basit tutmak için
// giriş başarılıysa sadece kullanıcı bilgisini döndürüyoruz.
// ============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// ------------------------------------------------------------
// POST /auth/register
// Body: { name, email, password }
// ------------------------------------------------------------
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email ve password zorunludur' });
    }

    // E-posta zaten kayıtlı mı?
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
    }

    // Şifreyi hash'le (10 = işlem zorluğu / "salt rounds")
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`, // şifreyi GERİ DÖNDÜRMÜYORUZ
      [name, email, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /auth/login
// Body: { email, password }
// ------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email ve password zorunludur' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      // Kullanıcı yok — ama "kullanıcı yok" demiyoruz (güvenlik için
      // saldırgana hangi e-postaların kayıtlı olduğunu sızdırmayalım).
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    const user = result.rows[0];

    // Girilen şifreyi, kayıtlı hash ile karşılaştır
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
    }

    // Başarılı — şifre alanını çıkararak döndür
    res.json({
      message: 'Giriş başarılı',
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
