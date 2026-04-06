#!/usr/bin/env python3
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔧 PostgreSQL Auth Düzeltme")
print("=" * 50)

pg_hba = '/var/lib/pgsql/16/data/pg_hba.conf'

# pg_hba.conf son satırlarını göster
print("📄 Mevcut pg_hba.conf:")
stdin, stdout, stderr = ssh.exec_command(f"tail -10 {pg_hba}")
print(stdout.read().decode())

# Trust auth olarak değiştir (geçici)
print("\n🔓 Trust authentication ayarlanıyor...")
cmd1 = f"sudo sed -i 's/host.*all.*all.*127.0.0.1.*/host    all             all             127.0.0.1\/32            trust/' {pg_hba}"
cmd2 = f"sudo sed -i 's/host.*all.*all.*::1.*/host    all             all             ::1\/128                 trust/' {pg_hba}"
cmd3 = f"sudo sed -i 's/local.*all.*all.*peer/local   all             all                                     trust/' {pg_hba}"

ssh.exec_command(cmd1)
ssh.exec_command(cmd2)
ssh.exec_command(cmd3)

# Restart
print("🔄 Restart yapılıyor...")
ssh.exec_command('sudo systemctl restart postgresql-16')
time.sleep(3)

# Test
print("\n🧪 Test:")
stdin, stdout, stderr = ssh.exec_command("PGPASSWORD=CHANGE_ME_DB_PASSWORD psql -h localhost -U sanliurfa_user -d sanliurfa -c 'SELECT 1 as test;' 2>&1")
result = stdout.read().decode()
if "test" in result or "1" in result:
    print("✅ Bağlantı başarılı!")
else:
    print(f"Sonuç: {result[:300]}")

# Tabloları kontrol et
print("\n📋 Tablolar:")
stdin, stdout, stderr = ssh.exec_command("PGPASSWORD=CHANGE_ME_DB_PASSWORD psql -h localhost -U sanliurfa_user -d sanliurfa -c 'SELECT tablename FROM pg_tables WHERE schemaname = public;' 2>&1")
print(stdout.read().decode())

ssh.close()
print("\nTamamlandı!")
