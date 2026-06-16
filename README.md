# E-Ticaret Uygulaması — Ölçeklenebilir Sistem

Node.js, Python ve PostgreSQL kullanan, AWS üzerinde otomatik ölçeklenebilir bir e-ticaret backend projesi. Amaç bu teknolojilerin birbiriyle nasıl haberleştiğini öğrenmek.

## Mimari

```
Kullanıcı
   │
   ▼
AWS Elastic Load Balancer
   │
   ├──────────────┬──────────────┐
   ▼              ▼              
Node.js API    Python Servisi   
(ürün, sepet,  (öneri,          
 sipariş,      istatistik)      
 auth)            │              
   │              │              
   └──────┬───────┘              
          ▼                      
   PostgreSQL (AWS RDS)          
          │
          ▼
       AWS S3 (görseller)
```

- **Node.js (Express):** Ana API — ürün, sepet, sipariş, kimlik doğrulama.
- **Python (Flask):** Yardımcı servis — ürün önerisi ve satış istatistikleri.
- **PostgreSQL:** İki servisin de paylaştığı ortak veritabanı.
- İki backend birbirine **REST API** ile bağlanır (Node.js, Python servisini HTTP ile çağırır).

## Teknoloji Yığını

| Katman        | Teknoloji                          |
|---------------|------------------------------------|
| Backend 1     | Node.js + Express                  |
| Backend 2     | Python + Flask                     |
| Veritabanı    | PostgreSQL                         |
| Bulut         | AWS (EC2, RDS, S3, ELB, Auto Scaling) |

## Klasör Yapısı

```
ecommerce-project/
├── database/
│   ├── schema.sql          # Tablolar
│   └── seed.sql            # Örnek veriler
├── node-api/
│   ├── index.js            # Express giriş noktası
│   ├── db.js               # PostgreSQL bağlantısı
│   ├── routes/
│   │   ├── products.js
│   │   ├── auth.js
│   │   ├── cart.js
│   │   └── orders.js
│   ├── package.json
│   └── .env.example
├── python-service/
│   ├── app.py              # Flask servisi
│   ├── db.py               # PostgreSQL bağlantısı
│   ├── requirements.txt
│   └── .env.example
├── tests/
│   └── api-tests.http      # API test istekleri
└── README.md
```

---

## Lokal Kurulum (Windows)

### 1. Veritabanını oluştur

pgAdmin'i aç veya komut satırından `psql` kullan.

```bash
# ecommerce adında boş bir veritabanı oluştur
psql -U postgres -c "CREATE DATABASE ecommerce;"

# Tabloları oluştur
psql -U postgres -d ecommerce -f database/schema.sql

# Örnek verileri ekle
psql -U postgres -d ecommerce -f database/seed.sql
```

### 2. Node.js API'yi çalıştır

```bash
cd node-api
copy .env.example .env        # sonra .env içindeki DB_PASSWORD'ü düzenle
npm install
npm start
```

API şurada çalışır: `http://localhost:3000`

### 3. Python servisini çalıştır (ayrı bir terminal)

```bash
cd python-service
copy .env.example .env        # DB_PASSWORD'ü düzenle
pip install -r requirements.txt
python app.py
```

Servis şurada çalışır: `http://localhost:5000`

### 4. Test et

`tests/api-tests.http` dosyasını VS Code'da aç (REST Client eklentisiyle) ve istekleri sırayla gönder. Önerilen sıra: ürünleri listele → giriş yap → sepete ekle → sipariş oluştur → istatistiklere bak.

---

## API Endpoint'leri

### Node.js (port 3000)

| Method | Yol                      | Açıklama                          |
|--------|--------------------------|-----------------------------------|
| GET    | `/products`              | Tüm ürünler (`?category=` filtre) |
| GET    | `/products/:id`          | Tek ürün + Python'dan öneriler    |
| POST   | `/products`              | Yeni ürün ekle                    |
| POST   | `/auth/register`         | Kayıt                             |
| POST   | `/auth/login`            | Giriş                             |
| POST   | `/cart`                  | Sepete ekle                       |
| GET    | `/cart/:userId`          | Sepeti görüntüle                  |
| DELETE | `/cart/:cartItemId`      | Sepetten sil                      |
| POST   | `/orders`                | Sepetten sipariş oluştur          |
| GET    | `/orders/:userId`        | Kullanıcının siparişleri          |
| GET    | `/orders/detail/:orderId`| Sipariş detayı                    |

### Python (port 5000)

| Method | Yol                  | Açıklama               |
|--------|----------------------|------------------------|
| GET    | `/recommend/:id`     | Ürün önerileri         |
| GET    | `/stats/sales`       | Satış istatistikleri   |

---

## AWS'e Taşıma (Özet)

1. **RDS:** PostgreSQL instance oluştur (db.t3.micro, Free Tier). `schema.sql` ve `seed.sql`'i RDS'e uygula. `.env` içindeki `DB_HOST`'u RDS endpoint'i yap.
2. **EC2:** Bir Linux/Windows instance aç, kodları kopyala, Node.js ve Python'u kur, iki servisi de başlat.
3. **S3:** Ürün görselleri için bir bucket aç; `image_url` alanlarını S3 linkleriyle güncelle.
4. **ELB + Auto Scaling:** İki EC2 instance'ını bir hedef grubuna (target group) ekle, Load Balancer'ı `/health` endpoint'iyle sağlık kontrolüne bağla, Auto Scaling grubu tanımla.

> Detaylı AWS adımlarını projeyi lokalde çalıştırdıktan sonra ekleyeceğiz.

## Dış Veri Kaynağı

Ürün görselleri için telifsiz placeholder servisi kullanıldı: **https://placehold.co** (API anahtarı gerektirmez). AWS S3 kurulunca kendi görsellerinle değiştirilebilir.

## Güvenlik Notları

- Şifreler `bcrypt` ile hash'lenir, düz metin saklanmaz.
- SQL sorguları parametrelidir (`$1`, `%s`) — SQL injection'a karşı korur.
- `.env` dosyası `.gitignore`'dadır; gizli bilgiler Git'e gönderilmez.
