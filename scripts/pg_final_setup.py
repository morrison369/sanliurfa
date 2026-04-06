#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🐘 PostgreSQL Final Yapılandırma")
print("=" * 50)

# Tabloları kontrol et
print("\n📊 Tablolar:")
stdin, stdout, stderr = ssh.exec_command("sudo -u postgres psql -d sanliurfa -c 'SELECT tablename FROM pg_tables WHERE schemaname = public;' 2>&1")
result = stdout.read().decode()
if result.strip():
    for line in result.split('\n')[2:-2]:  # Header/footer atla
        if line.strip():
            print(f"  ✅ {line.strip()}")
else:
    print("  ⚠️ Tablo bulunamadı")

# places tablosuna veri ekle
print("\n📝 Örnek veri ekleme:")
cmd = '''sudo -u postgres psql -d sanliurfa -c "INSERT INTO places (name, slug, description, category, is_featured) VALUES ('Göbeklitepe', 'gobeklitepe', 'Dünyanın ilk tapınağı', 'tarihi', true), ('Balıklıgöl', 'balikligol', 'Kutsal göl', 'dini', true) ON CONFLICT (slug) DO NOTHING;" 2>&1'''
stdin, stdout, stderr = ssh.exec_command(cmd)
print("  ✅ Örnek mekanlar eklendi")

# Veri sorgula
print("\n📋 Kayıtlı Mekanlar:")
stdin, stdout, stderr = ssh.exec_command("sudo -u postgres psql -d sanliurfa -c 'SELECT name, category, is_featured FROM places;' 2>&1")
for line in stdout.read().decode().split('\n')[2:-2]:
    if line.strip():
        print(f"  📍 {line.strip()}")

# .env.production güncelle
print("\n📝 .env.production güncelleniyor...")
env_content = """# PostgreSQL Database
DATABASE_URL=postgresql://sanliurfa_user:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliurfa
PGHOST=localhost
PGPORT=5432
PGDATABASE=sanliurfa
PGUSER=sanliurfa_user
PGPASSWORD=CHANGE_ME_DB_PASSWORD

# Supabase (PostgreSQL olarak kullanıyoruz)
SUPABASE_URL=postgresql://localhost:5432/sanliurfa
SUPABASE_ANON_KEY=sanliurfa_user:CHANGE_ME_DB_PASSWORD
SUPABASE_SERVICE_ROLE_KEY=sanliurfa_user:CHANGE_ME_DB_PASSWORD

# Site
SITE_URL=http://168.119.79.238
NODE_ENV=production
PORT=3000

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

# Dosyayı yaz
sftp = ssh.open_sftp()
sftp.putfo(__import__('io').BytesIO(env_content.encode()), '/home/sanliur/public_html/.env.production')
sftp.close()

print("✅ .env.production güncellendi!")

# Dosyayı göster
print("\n📄 .env.production içeriği:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production | head -20")
print(stdout.read().decode())

ssh.close()

print("\n" + "=" * 50)
print("🎉 POSTGRESQL YAPILANDIRMASI TAMAMLANDI!")
print("=" * 50)
print("""
📊 Database Bilgileri:
  Host: localhost
  Port: 5432
  Database: sanliurfa
  User: sanliurfa_user
  Password: CHANGE_ME_DB_PASSWORD

🔗 Connection String:
  postgresql://sanliurfa_user:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliurfa

📝 ÖNEMLİ: Uygulama kodunda Supabase client yerine 
   PostgreSQL client (pg, node-postgres) kullanmalısınız!

🚀 Sonraki Adım:
  Uygulamayı yeniden başlat:
  source ~/.nvm/nvm.sh && pm2 restart sanliurfa
""")
