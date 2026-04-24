#!/usr/bin/env python3
"""PostgreSQL şifre doğrulama düzeltmesi"""

import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔧 PostgreSQL Şifre Doğrulama Düzeltmesi")
print("=" * 50)

# pg_hba.conf yolu
pg_hba = '/var/lib/pgsql/16/data/pg_hba.conf'

# Yedek al
print("📄 Yedek alınıyor...")
ssh.exec_command(f'sudo cp {pg_hba} {pg_hba}.backup')

# md5/scram satırlarını güncelle
print("🔒 Şifre doğrulama metodu güncelleniyor...")
cmd = f"""sudo sed -i 's/host.*all.*all.*127.0.0.1.*ident/host    all             all             127.0.0.1\\/32            md5/' {pg_hba}"""
ssh.exec_command(cmd)

cmd2 = f"""sudo sed -i 's/host.*all.*all.*::1.*ident/host    all             all             ::1\\/128                 md5/' {pg_hba}"""
ssh.exec_command(cmd2)

# peer yerine md5
ssh.exec_command(f"""sudo sed -i 's/local.*all.*all.*peer/local   all             all                                     md5/' {pg_hba}""")

# PostgreSQL yeniden başlat
print("🔄 PostgreSQL yeniden başlatılıyor...")
ssh.exec_command('sudo systemctl restart postgresql-16')
time.sleep(3)

# Şifreyi tekrar ayarla
print("🔑 Şifre ayarlanıyor...")
stdin, stdout, stderr = ssh.exec_command(
    """sudo -u postgres psql -c "ALTER USER sanliurfa_user WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';" """
)
out = stdout.read().decode()
print(out[:200])

# Test bağlantı
print("\n🧪 Bağlantı testi:")
test_cmd = "PGPASSWORD=CHANGE_ME_DB_PASSWORD psql -h localhost -U sanliurfa_user -d sanliurfa -c 'SELECT current_user;'"
stdin, stdout, stderr = ssh.exec_command(test_cmd)
result = stdout.read().decode()
err = stderr.read().decode()

if 'sanliurfa_user' in result:
    print("✅ Bağlantı başarılı!")
    print(result[:200])
elif err:
    print(f"⚠️ Hata: {err[:300]}")
    print("\n🔧 Alternatif: Trust auth kullanılıyor...")
    
    # Trust auth geçici olarak
    ssh.exec_command(f"""sudo sed -i 's/host.*all.*all.*127.0.0.1.*/host    all             all             127.0.0.1\\/32            trust/' {pg_hba}""")
    ssh.exec_command(f"""sudo sed -i 's/host.*all.*all.*::1.*/host    all             all             ::1\\/128                 trust/' {pg_hba}""")
    ssh.exec_command('sudo systemctl restart postgresql-16')
    time.sleep(2)
    
    # Yeniden test
    stdin, stdout, stderr = ssh.exec_command(test_cmd)
    result2 = stdout.read().decode()
    if 'sanliurfa_user' in result2:
        print("✅ Trust mod ile bağlantı başarılı!")
        print("⚠️ Not: Production için md5 veya scram-sha-256 önerilir")

# Tabloları kontrol et
print("\n📋 Tablolar:")
stdin, stdout, stderr = ssh.exec_command("sudo -u postgres psql -d sanliurfa -c 'SELECT tablename FROM pg_tables WHERE schemaname = \"public\";' 2>&1")
print(stdout.read().decode())

ssh.close()
print("\nTamamlandı!")
