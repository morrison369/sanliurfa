#!/usr/bin/env python3
"""Sanliurfa.com - Deploy via Paramiko (no password prompt)"""
import paramiko
import time
import sys

HOST = '168.119.79.238'
PORT = 77
USER = 'sanliur'
PASS = 'zIT7Y9yrJZRV'

def main():
    print("Baglaniyor...", flush=True)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
    print("SSH OK!", flush=True)

    # Step 1: Upload deploy script via SFTP
    deploy_script = r'''#!/bin/bash
cd /home/sanliur/public_html

# Fix port
find dist/server -name '*.mjs' -exec sed -i 's/const port = 4321/const port = 6000/g' {} +

# Create .env
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=6000
HOST=127.0.0.1
DATABASE_URL=postgresql://sanliur_sanliurfa:kWtUYbyYgbS7@localhost:5432/sanliur_sanliurfa
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sanliur_sanliurfa
DB_USER=sanliur_sanliurfa
DB_PASSWORD=kWtUYbyYgbS7
JWT_SECRET=test-jwt-secret-key-32chars-min
SESSION_SECRET=test-session-secret-key-32chars
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=https://sanliurfa.com
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=noreply@sanliurfa.com
SMTP_PASS=changeme
EMAIL_FROM=noreply@sanliurfa.com
RATE_LIMIT_WINDOW=900
RATE_LIMIT_MAX=100
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400
ENVEOF

# Kill old
pkill -9 node 2>/dev/null
pm2 kill 2>/dev/null
fuser -k 6000/tcp 2>/dev/null
fuser -k 4321/tcp 2>/dev/null
sleep 3

# Check ports
echo "PORTS: $(ss -tlnp | grep -E '6000|4321' || echo FREE)"

# Start
nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 12

# Check
echo "HEALTH: $(curl -s http://127.0.0.1:6000/api/health 2>&1 || echo FAIL)"
echo "LOG: $(tail -10 /tmp/app.log)"

# PM2
pm2 delete all 2>/dev/null || true
pm2 start dist/server/entry.mjs --name sanliurfa-app --max-memory-restart 500M
sleep 3
pm2 save
pm2 list

echo "DEPLOY_DONE"
'''

    sftp = client.open_sftp()
    with sftp.open('/tmp/deploy_final.sh', 'w') as f:
        f.write(deploy_script)
    sftp.chmod('/tmp/deploy_final.sh', 0o755)
    sftp.close()
    print("Deploy script uploaded!", flush=True)

    # Execute the script
    print("Running deploy...", flush=True)
    _, stdout, stderr = client.exec_command('bash /tmp/deploy_final.sh 2>&1', timeout=120)

    # Wait and read output progressively
    time.sleep(20)
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')

    full = output + error
    print(full[-3000:] if len(full) > 3000 else full, flush=True)

    client.close()
    print("\nBITTI!", flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"HATA: {e}", flush=True)
        sys.exit(1)
