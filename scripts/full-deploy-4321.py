#!/usr/bin/env python3
"""Full deploy: upload dist, .env, .htaccess, then start on port 4321"""
import paramiko, time, os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)

def upload_file(local, remote):
    sftp = ssh.open_sftp()
    sftp.put(local, remote)
    sftp.close()
    print(f'  OK: {os.path.basename(local)}', flush=True)

print('1. Upload .env...', flush=True)
upload_file('.env.production', '/home/sanliur/public_html/.env')

print('2. Upload .htaccess...', flush=True)
upload_file('.htaccess', '/home/sanliur/public_html/.htaccess')

print('3. Upload dist...', flush=True)
sftp = ssh.open_sftp()
for root, dirs, files in os.walk('dist'):
    remote_root = f'/home/sanliur/public_html/{root}'
    for d in dirs:
        try:
            sftp.mkdir(f'{remote_root}/{d}')
        except:
            pass
    for fname in files:
        local = f'{root}/{fname}'
        remote = f'{remote_root}/{fname}'
        try:
            sftp.put(local, remote)
        except Exception as e:
            if 'No such file' not in str(e):
                print(f'  WARN {fname}: {e}', flush=True)
sftp.close()
print('  OK: dist/', flush=True)

print('4. Kill old...', flush=True)
ssh.exec_command('pkill -9 node 2>/dev/null; pm2 kill 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; sleep 2')
time.sleep(3)

print('5. Start on 4321...', flush=True)
ssh.exec_command('cd /home/sanliur/public_html && NODE_ENV=production PORT=4321 HOST=127.0.0.1 DATABASE_URL=postgresql://sanliur_sanliurfa:kWtUYbyYgbS7@localhost:5432/sanliur_sanliurfa nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &')
time.sleep(12)

print('6. Health...', flush=True)
_, out, _ = ssh.exec_command('curl -s http://127.0.0.1:4321/api/health')
time.sleep(2)
health = out.read().decode()
print(f'  {health[:400]}', flush=True)

if 'healthy' in health.lower() and 'true' in health.lower():
    print('7. PM2...', flush=True)
    ssh.exec_command('pm2 delete all 2>/dev/null; cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa-app && pm2 save')
    time.sleep(3)
    print('\nSITE READY: https://sanliurfa.com', flush=True)
else:
    print('7. Log...', flush=True)
    _, out, _ = ssh.exec_command('tail -10 /tmp/app.log')
    print(f'  {out.read().decode()[-400:]}', flush=True)

ssh.close()
print('DONE!', flush=True)
