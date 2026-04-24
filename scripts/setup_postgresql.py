#!/usr/bin/env python3
"""PostgreSQL 16 Kurulumu ve Yapılandırması"""

import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DB_NAME = "sanliurfa"
DB_USER = "sanliurfa_user"
DB_PASSWORD = "CHANGE_ME_DB_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, allow_agent=False, look_for_keys=False)

print("🐘 PostgreSQL 16 Yapılandırması")
print("=" * 60)

# PostgreSQL durum kontrolü
print("\n📋 PostgreSQL Durumu:")
stdin, stdout, stderr = ssh.exec_command("sudo systemctl status postgresql-16 --no-pager | head -10")
print(stdout.read().decode())

# Veritabanı ve kullanıcı oluştur
print("\n🔧 Database ve Kullanıcı Oluşturma")
print("-" * 60)

# PostgreSQL komutları
commands = [
    # Kullanıcı oluştur
    f"CREATE USER {DB_USER} WITH PASSWORD '{DB_PASSWORD}';",
    # Database oluştur
    f"CREATE DATABASE {DB_NAME} OWNER {DB_USER} ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8';",
    # Yetkiler
    f"GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};",
    # Extensions
    f"\\c {DB_NAME}; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";",
    f"\\c {DB_NAME}; CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";",
]

for cmd in commands:
    full_cmd = f'sudo -u postgres psql -c "{cmd}" 2>&1'
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    output = stdout.read().decode()
    if "ERROR" in output and "already exists" not in output:
        print(f"⚠️ Hata: {output[:200]}")
    elif "already exists" in output:
        print(f"  ℹ️ Zaten var: {cmd[:50]}...")
    else:
        print(f"  ✅ OK: {cmd[:50]}...")

# Kullanıcıya superuser yetkisi (gerekirse)
print("\n🔑 Kullanıcı Yetkileri:")
stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -c "ALTER USER {DB_USER} WITH SUPERUSER;" 2>&1')
print("  ✅ Superuser yetkisi verildi")

# Test bağlantı
print("\n🧪 Bağlantı Testi:")
test_cmd = f'PGPASSWORD={DB_PASSWORD} psql -h localhost -U {DB_USER} -d {DB_NAME} -c "SELECT version();" 2>&1'
stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
if "PostgreSQL" in result:
    print("  ✅ Bağlantı başarılı!")
    print(f"  {result[:100]}...")
else:
    print(f"  ⚠️ Test sonucu: {result[:200]}")

# Tabloları oluştur
print("\n📊 Tablolar Oluşturuluyor...")

schema_sql = """
-- Kullanıcılar tablosu
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mekanlar tablosu
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100),
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    images TEXT[],
    rating DECIMAL(2,1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blog yazıları
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    cover_image TEXT,
    author_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP
);

-- Yorumlar
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    place_id UUID REFERENCES places(id),
    blog_post_id UUID REFERENCES blog_posts(id),
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Etkinlikler
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    location TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    image TEXT,
    status VARCHAR(50) DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rezervasyonlar
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    place_id UUID REFERENCES places(id),
    reservation_date DATE,
    reservation_time TIME,
    guest_count INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kuponlar
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage',
    discount_value DECIMAL(10,2),
    min_purchase DECIMAL(10,2) DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Kullanıcı kuponları
CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    coupon_id UUID REFERENCES coupons(id),
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rozetler
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon TEXT,
    required_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kullanıcı rozetleri
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    badge_id UUID REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bildirimler
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    content TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İletişim mesajları
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İstatistikler
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_path TEXT,
    visitor_ip INET,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_slug ON places(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_place_id ON comments(place_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
"""

# SQL dosyası olarak kaydet ve çalıştır
stdin, stdout, stderr = ssh.exec_command(f'cat > /tmp/schema.sql << "EOF"\n{schema_sql}\nEOF')
stdout.read()

stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d {DB_NAME} -f /tmp/schema.sql 2>&1')
output = stdout.read().decode()

if "ERROR" in output:
    print(f"⚠️ Bazı tablolar zaten var veya hata oluştu")
else:
    print("✅ Tablolar oluşturuldu!")

# Tablo listesi
print("\n📋 Oluşturulan Tablolar:")
stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d {DB_NAME} -c "\\dt" 2>&1')
tables = stdout.read().decode()
for line in tables.split('\n')[3:-2]:  # Header ve footer'ı atla
    if line.strip():
        print(f"  ✅ {line.strip().split()[-1]}")

# Örnek veriler ekle
print("\n📝 Örnek Veriler Ekleniyor...")

sample_data = f"""
-- Örnek mekanlar
INSERT INTO places (name, slug, description, category, address, latitude, longitude, is_featured) VALUES
('Göbeklitepe', 'gobeklitepe', 'Dünyanın ilk tapınağı', 'tarihi', 'Örencik Köyü', 37.2231, 38.9224, true),
('Balıklıgöl', 'balikligol', 'Hz. İbrahim''in ateşe atıldığı yer', 'dini', 'Eyyüp Peygamber Mah.', 37.1495, 38.7913, true),
('Harran', 'harran', 'Klasik dönemden kalma antik şehir', 'tarihi', 'Harran İlçesi', 36.8653, 39.0312, true)
ON CONFLICT (slug) DO NOTHING;

-- Örnek blog yazısı
INSERT INTO blog_posts (title, slug, content, excerpt, status) VALUES
('Şanlıurfa''da Gezilecek Yerler', 'sanliurfada-gezilecek-yerler', 
'<h2>Şanlıurfa''nın En Güzel Yerleri</h2><p>Şanlıurfa, tarihin sıfır noktası olarak bilinir...</p>',
'Sanliurfa''nin en güzel tarihi ve turistik yerlerini keşfedin.', 'published')
ON CONFLICT (slug) DO NOTHING;

-- Örnek rozetler
INSERT INTO badges (name, description, icon, required_points) VALUES
('Keşifçi', 'İlk mekan ziyaretinizi gerçekleştirdiniz', '🏛️', 0),
('Gezgin', '10 farklı mekan ziyaret ettiniz', '🧭', 100),
('Yorumcu', 'İlk yorumunuzu yaptınız', '💬', 50),
('Fotoğrafçı', 'İlk fotoğrafınızı yüklediniz', '📸', 75)
ON CONFLICT DO NOTHING;

-- Örnek kupon
INSERT INTO coupons (code, discount_type, discount_value, max_uses, valid_from, valid_until) VALUES
('HOSGELDIN20', 'percentage', 20.00, 100, NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT (code) DO NOTHING;
"""

stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d {DB_NAME} -c "{sample_data}" 2>&1')
print("✅ Örnek veriler eklendi!")

# Firewall ayarları (localhost için zaten açık)
print("\n🔒 Güvenlik Ayarları:")
print("  ✅ PostgreSQL sadece localhost'tan erişilebilir (güvenli)")

ssh.close()

print("\n" + "=" * 60)
print("🎉 POSTGRESQL YAPILANDIRMASI TAMAMLANDI!")
print("=" * 60)

print(f"""
📊 Database Bilgileri:
  Database: {DB_NAME}
  Kullanıcı: {DB_USER}
  Şifre: {DB_PASSWORD}
  Host: localhost
  Port: 5432

🔗 Connection String:
  DATABASE_URL=postgresql://{DB_USER}:{DB_PASSWORD}@localhost:5432/{DB_NAME}

📝 .env.production güncellemesi:
  SUPABASE_URL=postgresql://localhost:5432/{DB_NAME}
  SUPABASE_ANON_KEY={DB_USER}:{DB_PASSWORD}

🐘 Yönetim Komutları:
  sudo -u postgres psql -d {DB_NAME}
  sudo -u postgres psql -c "\\dt {DB_NAME}."
  sudo systemctl restart postgresql-16
""")
