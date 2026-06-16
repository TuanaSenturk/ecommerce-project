-- ============================================================
-- Örnek Başlangıç Verisi (Seed Data)
-- ============================================================
-- schema.sql çalıştırıldıktan SONRA çalıştır:
--   psql -U postgres -d ecommerce -f seed.sql
--
-- Görsel URL'leri için ücretsiz placeholder servisi kullanıyoruz:
--   Kaynak: https://placehold.co  (telifsiz, anahtar gerektirmez)
-- AWS S3 kurulduğunda bu URL'leri kendi S3 linklerinle değiştirebilirsin.
-- ============================================================

-- Örnek ürünler
INSERT INTO products (name, description, price, stock, category, image_url) VALUES
('Kablosuz Kulaklık',     'Bluetooth 5.0, gürültü engelleme özellikli.', 749.90,  50, 'elektronik', 'https://placehold.co/300x300?text=Kulaklik'),
('Mekanik Klavye',        'RGB aydınlatmalı, mavi switch.',              999.00,  30, 'elektronik', 'https://placehold.co/300x300?text=Klavye'),
('USB-C Hub',             '7 portlu, HDMI ve kart okuyuculu.',           459.50,  80, 'elektronik', 'https://placehold.co/300x300?text=Hub'),
('Pamuklu Tişört',        '%100 pamuk, unisex.',                          199.90, 120, 'giyim',      'https://placehold.co/300x300?text=Tisort'),
('Spor Ayakkabı',         'Hafif tabanlı, günlük kullanım.',             1299.00,  40, 'giyim',      'https://placehold.co/300x300?text=Ayakkabi'),
('Termos Matara',         '500 ml, paslanmaz çelik.',                     249.90,  90, 'ev',         'https://placehold.co/300x300?text=Termos'),
('Masa Lambası',          'LED, kademeli parlaklık ayarı.',               379.00,  60, 'ev',         'https://placehold.co/300x300?text=Lamba'),
('Defter Seti',           '3 adet, çizgili, A5 boyut.',                    89.90, 200, 'kirtasiye',  'https://placehold.co/300x300?text=Defter'),
('Roller Kalem',          '0.7 mm, siyah, 5 adet.',                        59.90, 300, 'kirtasiye',  'https://placehold.co/300x300?text=Kalem'),
('Powerbank 20000mAh',    'Hızlı şarj destekli, çift çıkış.',             649.00,  45, 'elektronik', 'https://placehold.co/300x300?text=Powerbank');

-- Örnek kullanıcı
-- NOT: Bu şifre hash'i "123456" parolasının bcrypt karşılığıdır (test amaçlı).
-- Gerçek kullanıcılar /auth/register endpoint'i üzerinden kayıt olacak.
INSERT INTO users (name, email, password) VALUES
('Test Kullanıcı', 'test@example.com', '$2b$10$CpgV5EP8eIW8VW.5EcVPdeGsI3ef6kZsqstxfQvC4ntcoemJCVuWi');

SELECT 'Örnek veriler eklendi.' AS sonuc,
       (SELECT COUNT(*) FROM products) AS urun_sayisi,
       (SELECT COUNT(*) FROM users)    AS kullanici_sayisi;
