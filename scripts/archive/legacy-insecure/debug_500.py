#!/usr/bin/env python3
"""500 Internal Server Error Debug"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🔴 500 HATA AYIKLAMA")
print("=" * 70)

# 1. Son hata logları
print("\n1️⃣ PM2 Error Logları:")
stdin, stdout, stderr = ssh.exec_command("tail -50 /home/sanliur/.pm2/logs/sanliurfa-error-0.log 2>&1")
error_log = stdout.read().decode()
print(error_log[-2000:] if error_log else "(boş)")

# 2. Son çıktı logları
print("\n2️⃣ PM2 Out Logları:")
stdin, stdout, stderr = ssh.exec_command("tail -30 /home/sanliur/.pm2/logs/sanliurfa-out-0.log 2>&1")
print(stdout.read().decode()[-1500:])

# 3. Apache error log
print("\n3️⃣ Apache Error Log:")
stdin, stdout, stderr = ssh.exec_command("tail -20 /home/sanliur/public_html/logs/sanliurfa.com-error.log 2>&1")
apache_error = stdout.read().decode()
print(apache_error if apache_error else "(boş)")

# 4. Uygulama durumu
print("\n4️⃣ PM2 Durum:")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 show sanliurfa | head -20")
print(stdout.read().decode())

# 5. Port kontrol
print("\n5️⃣ Port 6000:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep 6000 || ss -tlnp | grep 6000")
print(stdout.read().decode())

# 6. Direkt test
print("\n6️⃣ Direkt localhost test:")
stdin, stdout, stderr = ssh.exec_command("curl -m 3 -s http://127.0.0.1:6000/ 2>&1 | head -100")
result = stdout.read().decode()
if "Error" in result or "500" in result:
    print("❌ HATA:", result[:500])
elif result:
    print("✅ Yanıt var (ilk 500 karakter):")
    print(result[:500])
else:
    print("⚠️ Boş yanıt")

# 7. Environment kontrol
print("\n7️⃣ .env.production:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production | head -15")
print(stdout.read().decode())

ssh.close()

print("\n" + "=" * 70)
print("🔍 TAMAMLANDI")
print("=" * 70)
