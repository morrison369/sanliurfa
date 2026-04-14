import paramiko
import time

print("Baglaniyor...", flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)
print("SSH OK", flush=True)

# 1. Tum node prosesleri oldur
print("\n1. Node prosesleri temizleniyor...", flush=True)
stdin, stdout, stderr = ssh.exec_command('pkill -9 -f node; sleep 2; pgrep -f node || echo "Node temiz"')
time.sleep(3)
print(stdout.read().decode(), flush=True)

# 2. PM2'yi temizle
print("2. PM2 temizleniyor...", flush=True)
stdin, stdout, stderr = ssh.exec_command('pm2 delete all; pm2 kill; sleep 1')
time.sleep(2)
print(stdout.read().decode(), flush=True)

# 3. Port 6000 kontrol
print("3. Port 6000 kontrolu...", flush=True)
stdin, stdout, stderr = ssh.exec_command('ss -tulpn | grep 6000 || echo "Port 6000 bosta"')
time.sleep(1)
print(stdout.read().decode(), flush=True)

# 4. Yeni baslatma (PM2 ile)
print("4. PM2 ile baslatiliyor...", flush=True)
stdin, stdout, stderr = ssh.exec_command(
    'cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa-app --env production --max-memory-restart 500M --restart-delay 3000'
)
time.sleep(8)
print(stdout.read().decode(), flush=True)

# 5. PM2 durumu
print("5. PM2 durumu...", flush=True)
stdin, stdout, stderr = ssh.exec_command('pm2 list')
print(stdout.read().decode(), flush=True)

# 6. Health check
print("6. Saglik kontrolu...", flush=True)
time.sleep(3)
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:6000/api/health')
health = stdout.read().decode()
print(health, flush=True)

# 7. PM2 kaydet
print("7. PM2 kaydediliyor...", flush=True)
ssh.exec_command('pm2 save')

ssh.close()
print("\n✅ Tamamlandi!", flush=True)
