-- ============================================================
-- E-Ticaret Veritabanı Şeması (PostgreSQL)
-- ============================================================
-- Bu dosya tabloları sıfırdan oluşturur.
-- Çalıştırmak için (pgAdmin Query Tool veya psql):
--   psql -U postgres -d ecommerce -f schema.sql
-- ============================================================

-- Var olan tabloları temizle (tekrar tekrar çalıştırabilmek için)
-- DİKKAT: Sıra önemli, çünkü tablolar birbirine bağlı (foreign key).
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- Kullanıcılar
-- ------------------------------------------------------------
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    -- Şifreyi ASLA düz metin saklamıyoruz. bcrypt hash'i tutuyoruz.
    password    VARCHAR(255)        NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Ürünler
-- ------------------------------------------------------------
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200)   NOT NULL,
    description TEXT,
    -- Fiyatta NUMERIC kullanıyoruz; para için float kullanmak yuvarlama hatası yapar.
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
    category    VARCHAR(80),
    -- Görsel AWS S3'te tutulacak; burada sadece URL saklıyoruz.
    image_url   VARCHAR(500),
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Sepet kalemleri
-- Her satır: "şu kullanıcının sepetinde şu üründen şu kadar var".
-- ------------------------------------------------------------
CREATE TABLE cart_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at    TIMESTAMP DEFAULT NOW(),
    -- Aynı ürün sepete iki kez ayrı satır olarak girmesin.
    UNIQUE (user_id, product_id)
);

-- ------------------------------------------------------------
-- Siparişler (sipariş başlığı)
-- ------------------------------------------------------------
CREATE TABLE orders (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total       NUMERIC(10, 2) NOT NULL,
    status      VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Sipariş kalemleri (siparişin içindeki her ürün)
-- Fiyatı burada da saklıyoruz çünkü ürünün fiyatı sonradan
-- değişse bile siparişin o anki fiyatı sabit kalmalı.
-- ------------------------------------------------------------
CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC(10, 2) NOT NULL
);

-- ------------------------------------------------------------
-- Performans için indeksler
-- Sık sorgulanan kolonlara indeks koymak aramayı hızlandırır.
-- ------------------------------------------------------------
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_cart_user        ON cart_items(user_id);
CREATE INDEX idx_orders_user      ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Bilgi mesajı
SELECT 'Tablolar başarıyla oluşturuldu.' AS sonuc;
