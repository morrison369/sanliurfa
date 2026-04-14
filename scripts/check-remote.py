import paramiko
import sys
import time

print("Baglaniyor...", flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)
print("SSH OK", flush=True)

# Check .env
stdin, stdout, stderr = ssh.exec_command('cat /home/sanliur/public_html/.env')
out = stdout.read().decode()
err = stderr.read().decode()
print(f".env icerigi:\n{out}", flush=True)
if err:
    print(f"hata: {err}", flush=True)

# PM2 status
stdin, stdout, stderr = ssh.exec_command('pm2 list')
print(f"PM2:\n{stdout.read().decode()}", flush=True)

# Health
stdin, stdout, stderr = ssh.exec_command('sleep 2 && curl -s http://127.0.0.1:6000/api/health')
print(f"Health:\n{stdout.read().decode()}", flush=True)

ssh.close()
print("Tamamlandi!", flush=True)
