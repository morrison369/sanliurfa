import paramiko
import time

print("Baglaniyor...", flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)
print("SSH OK", flush=True)

print("\n=== PM2 Error Logs ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('pm2 logs sanliurfa-app --lines 30 --nostream --err 2>&1')
print(stdout.read().decode()[-2000:], flush=True)

print("\n=== PM2 Out Logs ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('pm2 logs sanliurfa-app --lines 20 --nostream 2>&1')
print(stdout.read().decode()[-2000:], flush=True)

print("\n=== App Status ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('curl -s http://127.0.0.1:6000/api/health 2>&1')
print(stdout.read().decode(), flush=True)

ssh.close()
print("\nTamamlandi!", flush=True)
