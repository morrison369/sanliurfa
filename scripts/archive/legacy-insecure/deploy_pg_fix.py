#!/usr/bin/env python3
"""PostgreSQL fix deploy"""
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🚀 PostgreSQL Fix Deploy")
print("=" * 60)

# 1. Yeni supabase.ts yükle
print("\n📤 Yeni supabase.ts yükleniyor...")
sftp = ssh.open_sftp()
sftp.put("./src/lib/supabase.ts", f"{REMOTE_PATH}/src/lib/supabase.ts")
sftp.close()
print("✅ supabase.ts yüklendi")

# 2. Rebuild
print("\n🔨 Rebuild yapılıyor...")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
cmd = f"cd {REMOTE_PATH} && " + NVM + "npm run build 2>&1"

stdin, stdout, stderr = ssh.exec_command(cmd, timeout=180)
start = time.time()
while not stdout.channel.exit_status_ready():
    if time.time() - start > 15:
        print("  ⏳ Build devam ediyor...")
        start = time.time()
    time.sleep(1)

output = stdout.read().decode()
if "dist/server" in output:
    print("✅ Build başarılı!")
else:
    print("⚠️ Build durumu:", output[-1000:])

# 3. PM2 restart
print("\n🔄 PM2 restart...")
ssh.exec_command(NVM + "pm2 restart sanliurfa")
time.sleep(3)

# 4. Test
print("\n🌐 Test:")
time.sleep(3)
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
code = stdout.read().decode()
print(f"HTTP: {code}")

if code == "200":
    print("\n🎉 BAŞARILI! Site çalışıyor!")
else:
    print("\n⚠️ Hata logları:")
    stdin, stdout, stderr = ssh.exec_command("tail -20 /home/sanliur/.pm2/logs/sanliurfa-error-0.log")
    print(stdout.read().decode())

ssh.close()
print("\nTamamlandı!")
