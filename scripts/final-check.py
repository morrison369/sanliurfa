import paramiko
import time
import sys

print("SSH baglantisi...", flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', timeout=30)

# Check port
print("\n=== Port 4321 Kontrolu ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('ss -tulpn | grep 4321 || echo "PORT BOS"')
result = stdout.read().decode()
print(result, flush=True)

# Try curl
print("\n=== Curl Health Check ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('curl -v http://127.0.0.1:4321/api/health 2>&1')
result = stdout.read().decode()
print(result[-500:] if len(result) > 500 else result, flush=True)

# Check PM2
print("\n=== PM2 List ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('pm2 list 2>&1')
print(stdout.read().decode(), flush=True)

# Check logs
print("\n=== PM2 Error Logs (last 5) ===", flush=True)
stdin, stdout, stderr = ssh.exec_command('tail -5 /home/sanliur/.pm2/logs/sanliurfa-app-error.log 2>&1')
print(stdout.read().decode(), flush=True)

ssh.close()
print("\n✅ Bitti!", flush=True)
