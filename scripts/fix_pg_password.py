#!/usr/bin/env python3
"""PostgreSQL Şifre Düzeltme"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DB_PASSWORD = "CHANGE_ME_DB_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🔑 PostgreSQL Şifre Düzeltme")
print("=" * 60)

# 1. pg_hba.conf trust moda al
print("\n1️⃣ pg_hba.conf trust olarak ayarlanıyor...")
pg_hba = "/var/lib/pgsql/16/data/pg_hba.conf"

# Local connections için trust ayarla
commands = [
    f"sudo sed -i 's/^host.*all.*all.*127.0.0.1.*/host    all             all             127.0.0.1\/32            trust/' {pg_hba}",
    f"sudo sed -i 's/^host.*all.*all.*::1.*/host    all             all             ::1\/128                 trust/' {pg_hba}",
    f"sudo sed -i 's/^local.*all.*all.*/local   all             all                                     trust/' {pg_hba}",
]

for cmd in commands:
    ssh.exec_command(cmd)
print("   ✅ pg_hba.conf güncellendi")

# 2. PostgreSQL restart
print("\n2️⃣ PostgreSQL restart...")
ssh.exec_command("sudo systemctl restart postgresql-16")
import time
time.sleep(3)
print("   ✅ Restart tamamlandı")

# 3. Şifreyi sıfırla
print("\n3️⃣ Kullanıcı şifresi sıfırlanıyor...")
reset_cmd = f"""sudo -u postgres psql -c "ALTER USER sanliurfa_user WITH PASSWORD '{DB_PASSWORD}';" 2>&1"""
stdin, stdout, stderr = ssh.exec_command(reset_cmd)
result = stdout.read().decode()
if "ALTER ROLE" in result:
    print("   ✅ Şifre başarıyla sıfırlandı")
else:
    print(f"   ⚠️ Sonuç: {result[:200]}")

# 4. Test bağlantı
print("\n4️⃣ Bağlantı testi...")
test_cmd = f"""PGPASSWORD='{DB_PASSWORD}' psql -h localhost -U sanliurfa_user -d sanliurfa -c 'SELECT current_user;' 2>&1"""
stdin, stdout, stderr = ssh.exec_command(test_cmd)
test_result = stdout.read().decode()
if "sanliurfa_user" in test_result:
    print("   ✅ Bağlantı başarılı!")
else:
    print(f"   ❌ Bağlantı başarısız: {test_result[:200]}")

# 5. Uygulamayı yeniden başlat
print("\n5️⃣ Uygulama yeniden başlatılıyor...")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
ssh.exec_command(NVM + "pm2 restart sanliurfa")
time.sleep(3)
print("   ✅ Uygulama yeniden başlatıldı")

# 6. Test
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
print("🔧 TAMAMLANDI")
print("=" * 60)
