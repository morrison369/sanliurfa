#!/usr/bin/env python3
"""Fix DB connection and restart app"""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)

# 1. Kill app
print('1. Killing...', flush=True)
ssh.exec_command('pkill -9 node 2>/dev/null; pm2 kill 2>/dev/null; fuser -k 6000/tcp 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; sleep 2')
time.sleep(3)

# 2. Fix hardcoded DB user in dist files
print('2. Fixing DB user...', flush=True)
_, out, _ = ssh.exec_command('cd /home/sanliur/public_html && sed -i "s/sanliurfa_user/sanliur_sanliurfa/g" dist/server/chunks/*.mjs dist/server/entry.mjs 2>/dev/null; echo DONE')
time.sleep(2)
print(out.read().decode().strip(), flush=True)

# 3. Write correct .env
print('3. Writing .env...', flush=True)
env = """NODE_ENV=production
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
"""
sftp = ssh.open_sftp()
with sftp.open('/home/sanliur/public_html/.env', 'w') as f:
    f.write(env)
sftp.close()
print('  .env OK', flush=True)

# 4. Start app
print('4. Starting...', flush=True)
ssh.exec_command('cd /home/sanliur/public_html && nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &')
time.sleep(12)

# 5. Check health
print('5. Health check...', flush=True)
_, out, _ = ssh.exec_command('curl -s http://127.0.0.1:6000/api/health')
time.sleep(2)
health = out.read().decode()
print(f'  {health[:400]}', flush=True)

if 'healthy' in health.lower() and 'true' in health.lower():
    print('6. PM2 save...', flush=True)
    ssh.exec_command('pm2 delete all 2>/dev/null; cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa-app && pm2 save')
    time.sleep(3)
    print('  DONE! Site ready at https://sanliurfa.com', flush=True)
else:
    print('6. Log...', flush=True)
    _, out, _ = ssh.exec_command('tail -5 /tmp/app.log')
    print(f'  {out.read().decode()[-300:]}', flush=True)

ssh.close()
