import paramiko
import time

print("Baglaniyor...", flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)
print("SSH OK", flush=True)

# 1. PM2 durdur
print("1. PM2 durduruluyor...", flush=True)
ssh.exec_command('pm2 delete all')
time.sleep(2)

# 2. Node temizle
print("2. Node temizleniyor...", flush=True)
ssh.exec_command('pkill -f "node dist" 2>/dev/null; true')
time.sleep(2)

# 3. Env ile baslat
print("3. Yeni env ile baslatiliyor...", flush=True)
ssh.exec_command('cd /home/sanliur/public_html && export $(cat .env | grep -v "^#" | xargs) && nohup node dist/server/entry.mjs > /dev/null 2>&1 &')
time.sleep(6)

# 4. Health check
print("4. Saglik kontrolu...", flush=True)
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:6000/api/health 2>&1')
health = stdout.read().decode()
print(f"Health: {health[:600]}", flush=True)

# 5. PM2 ile kaydet
print("5. PM2 kaydediliyor...", flush=True)
ssh.exec_command('cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa-app --node-args="--env-file .env"')
time.sleep(2)
ssh.exec_command('pm2 save')

ssh.close()
print("Tamamlandi!", flush=True)
