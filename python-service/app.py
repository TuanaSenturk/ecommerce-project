# ============================================================
# app.py — Python Flask Servisi
# ============================================================
# İki iş yapar:
#   1. /recommend/<id>  → bir ürüne benzer ürünleri önerir
#   2. /stats/sales     → satış istatistikleri üretir
#
# Node.js bu servise HTTP üzerinden istek atar. Yani iki backend
# birbiriyle REST API ile konuşur — projenin öğretici çekirdeği.
#
# Çalıştırmak için:  python app.py
# ============================================================

import os
from decimal import Decimal

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import db

load_dotenv()

app = Flask(__name__)
CORS(app)  # Node.js / tarayıcıdan gelen isteklere izin ver


def to_serializable(rows):
    """NUMERIC kolonları Decimal olarak gelir; JSON bunu bilmez.
    Decimal'leri float'a çeviriyoruz ki jsonify çalışsın."""
    for row in rows:
        for key, value in row.items():
            if isinstance(value, Decimal):
                row[key] = float(value)
    return rows


# ------------------------------------------------------------
# Sağlık kontrolü (AWS Load Balancer için)
# ------------------------------------------------------------
@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "python-service"})


# ------------------------------------------------------------
# GET /recommend/<product_id>
# Basit öneri mantığı: aynı kategorideki diğer ürünleri,
# fiyat olarak en yakın olanları öner.
#
# (Bu gerçek bir makine öğrenmesi modeli değil — amaç Python
#  tarafında veriyle iş yapıldığını ve sonucun Node.js'e
#  döndüğünü göstermek.)
# ------------------------------------------------------------
@app.route("/recommend/<int:product_id>")
def recommend(product_id):
    # Önce hedef ürünün kategori ve fiyatını bul
    target = db.query(
        "SELECT category, price FROM products WHERE id = %s",
        (product_id,),
    )

    if not target:
        return jsonify({"error": "Ürün bulunamadı", "recommendations": []}), 404

    category = target[0]["category"]
    price = target[0]["price"]

    # Aynı kategorideki diğer ürünleri, fiyat farkına göre sırala
    recommendations = db.query(
        """
        SELECT id, name, price, image_url,
               ABS(price - %s) AS price_diff
        FROM products
        WHERE category = %s
          AND id <> %s
        ORDER BY price_diff ASC
        LIMIT 3
        """,
        (price, category, product_id),
    )

    return jsonify({
        "product_id": product_id,
        "category": category,
        "recommendations": to_serializable(recommendations),
    })


# ------------------------------------------------------------
# GET /stats/sales
# Satış istatistikleri: toplam ciro, sipariş sayısı,
# en çok satan ürünler.
# ------------------------------------------------------------
@app.route("/stats/sales")
def sales_stats():
    # Genel özet
    summary = db.query(
        """
        SELECT COUNT(*)              AS toplam_siparis,
               COALESCE(SUM(total),0) AS toplam_ciro
        FROM orders
        """
    )

    # En çok satan ilk 5 ürün (sipariş kalemlerinden)
    top_products = db.query(
        """
        SELECT p.name,
               SUM(oi.quantity)               AS satilan_adet,
               SUM(oi.quantity * oi.unit_price) AS toplam_gelir
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        GROUP BY p.name
        ORDER BY satilan_adet DESC
        LIMIT 5
        """
    )

    return jsonify({
        "ozet": to_serializable(summary)[0] if summary else {},
        "en_cok_satanlar": to_serializable(top_products),
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"✓ Python servisi çalışıyor: http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
