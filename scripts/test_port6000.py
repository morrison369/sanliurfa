#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🌐 Port 4321 Test")
print("=" * 50)

stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
code = stdout.read().decode().strip()
print(f"HTTP Code: {code}")

if code == "200":
    print("✅ BAŞARILI! Port 4321 çalışıyor!")
elif code == "500":
    print("⚠️ HTTP 500 - Uygulama hata veriyor")
    print("\nHata detayı:")
    stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s http://127.0.0.1:4321/ 2>&1 | head -50")
    print(stdout.read().decode())
else:
    print(f"⚠️ Beklenmeyen yanıt: {code}")

ssh.close()
