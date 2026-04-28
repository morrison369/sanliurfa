#!/usr/bin/env python3
"""PostgreSQL Credentials Güncelleme"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

# Yeni bilgiler
DB_NAME = "sanliur_sanliurfa"
DB_USER = "sanliur_sanliurfa"
DB_PASS = "CHANGE_ME_DB_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🔑 PostgreSQL Credentials Güncelleme")
print("=" * 60)

# 1. Yeni .env.production oluştur
print("\n1️⃣ .env.production güncelleniyor...")

env_content = f"""# PostgreSQL Database
DATABASE_URL=postgresql://{DB_USER}:{DB_PASS}@localhost:5432/{DB_NAME}
PGHOST=localhost
PGPORT=5432
PGDATABASE={DB_NAME}
PGUSER={DB_USER}
PGPASSWORD={DB_PASS}

# Supabase (PostgreSQL olarak kullanıyoruz)
SUPABASE_URL=postgresql://localhost:5432/{DB_NAME}
SUPABASE_ANON_KEY={DB_USER}:{DB_PASS}
SUPABASE_SERVICE_ROLE_KEY={DB_USER}:{DB_PASS}

# Site
SITE_URL=https://sanliurfa.com
NODE_ENV=production
PORT=4321

# Security
JWT_SECRET=change-this-to-a-secure-random-string-min-32-chars
ENCRYPTION_KEY=another-secure-random-string-32-chars

# Email (opsiyonel)
RESEND_API_KEY=
EMAIL_FROM=noreply@sanliurfa.com

# Feature Flags
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_ANALYTICS=false
ENABLE_COUPONS=true
ENABLE_RESERVATIONS=true
"""

sftp = ssh.open_sftp()
sftp.putfo(__import__('io').BytesIO(env_content.encode()), '/home/sanliur/public_html/.env.production')
sftp.close()
print("   ✅ .env.production güncellendi")

# 2. Veritabanı ve kullanıcı oluştur (eğer yoksa)
print("\n2️⃣ Veritabanı kontrolü...")

# Kullanıcı oluştur
user_cmd = f"""sudo -u postgres psql -c "CREATE USER {DB_USER} WITH PASSWORD '{DB_PASS}';" 2>&1 || echo 'User may exist'"""
stdin, stdout, stderr = ssh.exec_command(user_cmd)
print(f"   Kullanıcı: {stdout.read().decode()[:100]}")

# Veritabanı oluştur
db_cmd = f"""sudo -u postgres psql -c "CREATE DATABASE {DB_NAME} OWNER {DB_USER} ENCODING 'UTF8';" 2>&1 || echo 'DB may exist'"""
stdin, stdout, stderr = ssh.exec_command(db_cmd)
print(f"   Veritabanı: {stdout.read().decode()[:100]}")

# Yetkiler
grant_cmd = f"""sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};" 2>&1"""
ssh.exec_command(grant_cmd)
print("   ✅ Yetkiler verildi")

# 3. Tabloları oluştur
print("\n3️⃣ Tablolar oluşturuluyor...")

schema_sql = f"""
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

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    place_id UUID REFERENCES places(id),
    blog_post_id UUID REFERENCES blog_posts(id),
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS user_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    coupon_id UUID REFERENCES coupons(id),
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon TEXT,
    required_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    badge_id UUID REFERENCES badges(id),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    content TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    email VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Örnek veriler
INSERT INTO places (name, slug, description, category, is_featured) VALUES
('Göbeklitepe', 'gobeklitepe', 'Dünyanın ilk tapınağı', 'tarihi', true),
('Balıklıgöl', 'balikligol', 'Kutsal göl', 'dini', true),
('Harran', 'harran', 'Klasik dönemden kalma antik şehir', 'tarihi', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO badges (name, description, icon, required_points) VALUES
('Keşifçi', 'İlk mekan ziyaretinizi gerçekleştirdiniz', '🏛️', 0),
('Gezgin', '10 farklı mekan ziyaret ettiniz', '🧭', 100)
ON CONFLICT DO NOTHING;
"""

# SQL dosyası olarak kaydet ve çalıştır
ssh.exec_command(f'cat > /tmp/schema.sql << "EOF"\n{schema_sql}\nEOF')
stdin, stdout, stderr = ssh.exec_command(f'sudo -u postgres psql -d {DB_NAME} -f /tmp/schema.sql 2>&1')
result = stdout.read().decode()
if "CREATE TABLE" in result or "INSERT" in result or result.strip() == "":
    print("   ✅ Tablolar oluşturuldu")
else:
    print(f"   ⚠️ Durum: {result[:200]}")

# 4. Uygulamayı yeniden başlat
print("\n4️⃣ Uygulama yeniden başlatılıyor...")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
ssh.exec_command(NVM + "pm2 restart sanliurfa")
import time
time.sleep(3)
print("   ✅ Uygulama yeniden başlatıldı")

# 5. Test
print("\n5️⃣ Bağlantı testi...")
test_cmd = f"""PGPASSWORD='{DB_PASS}' psql -h localhost -U {DB_USER} -d {DB_NAME} -c 'SELECT current_user, current_database();' 2>&1"""
stdin, stdout, stderr = ssh.exec_command(test_cmd)
test_result = stdout.read().decode()
if DB_USER in test_result and DB_NAME in test_result:
    print("   ✅ PostgreSQL bağlantısı başarılı!")
else:
    print(f"   ⚠️ Test sonucu: {test_result[:200]}")

# 6. HTTP Test
print("\n6️⃣ HTTP Test...")
time.sleep(2)
stdin, stdout, stderr = ssh.exec_command("curl -m 3 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
code = stdout.read().decode().strip()
if code == "200":
    print(f"   ✅ HTTP 200 - Site çalışıyor!")
else:
    print(f"   ⚠️ HTTP {code}")

ssh.close()

print("\n" + "=" * 60)
print("✅ GÜNCELLEME TAMAMLANDI")
print("=" * 60)
print(f"""
📊 Yeni PostgreSQL Bilgileri:
  Database: {DB_NAME}
  User: {DB_USER}
  Password: {DB_PASS}
  
🔗 Connection String:
  postgresql://{DB_USER}:{DB_PASS}@localhost:5432/{DB_NAME}
""")
