# ============================================================
# db.py — PostgreSQL Bağlantısı (Python tarafı)
# ============================================================
# psycopg2 ile bağlanıyoruz. Node.js ile AYNI veritabanını
# kullanıyoruz — bu, iki dilin ortak veri üzerinden nasıl
# çalıştığını gösteren temel nokta.
# ============================================================

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()


def get_connection():
    """Yeni bir veritabanı bağlantısı döndürür.

    Not: Basitlik için her istekte yeni bağlantı açıyoruz.
    Gerçek projede bağlantı havuzu (connection pool) kullanılır.
    """
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "ecommerce"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        sslmode="require",
    )


def query(sql, params=None):
    """SQL çalıştırır ve sonucu sözlük (dict) listesi olarak döndürür.

    RealDictCursor sayesinde sonuçlar {'kolon': deger} biçiminde gelir,
    bu da JSON'a çevirmeyi kolaylaştırır.
    """
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
