#!/usr/bin/env python3
"""Sanliurfa.com - Full Deploy via Paramiko"""
import paramiko
import time

HOST = '168.119.79.238'
PORT = 77
USER = 'sanliur'
PASS = 'zIT7Y9yrJZRV'
DIR = '/home/sanliur/public_html'

def run(ssh, cmd, wait=2):
    """Execute and return output"""
    print(f'> {cmd[:80]}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    time.sleep(wait)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[-500:] if len(out) > 500 else out)
    if err and 'warn' not in err.lower() and 'deprecated' not in err.lower():
        print(f'ERR: {err[-300:] if len(err) > 300 else err}')
    return out

print('='*60)
print('SANLIURFA.COM - DEPLOY')
print('='*60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
print('SSH OK\n')

# 1. Kill everything
print('=== 1. CLEAN ===')
run(ssh, f'pkill -9 -f "node" 2>/dev/null; pm2 delete all 2>/dev/null; pm2 kill 2>/dev/null; sleep 2')
run(ssh, 'ss -tulpn | grep 6000 || echo "PORT FREE"')

# 2. Upload .env via SFTP
print('\n=== 2. UPLOAD .ENV ===')
env_content = open('D:/sanliurfa.com/sanliurfa/.env.production').read()
sftp = ssh.open_sftp()
with sftp.open(f'{DIR}/.env', 'w') as f:
    f.write(env_content)
sftp.close()
print('.env uploaded\n')

# 3. Start app
print('=== 3. START APP ===')
run(ssh, f'cd {DIR} && NODE_ENV=production node dist/server/entry.mjs &', wait=12)

# 4. Check health
print('\n=== 4. HEALTH ===')
health = run(ssh, 'curl -sf http://127.0.0.1:6000/api/health 2>&1', wait=2)

# 5. Check log if failed
if 'healthy' not in health:
    print('\n=== APP LOG ===')
    run(ssh, 'tail -30 /tmp/app-out.log 2>/dev/null; cat /home/sanliur/.pm2/logs/sanliurfa-app-error.log | tail -10')

# 6. PM2
if 'healthy' in health:
    print('\n=== 5. PM2 ===')
    run(ssh, f'cd {DIR} && pm2 start dist/server/entry.mjs --name sanliurfa-app')
    run(ssh, 'pm2 save')

ssh.close()
print('\n' + '='*60)
print('DONE!')
print('='*60)
