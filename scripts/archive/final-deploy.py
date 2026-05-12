#!/usr/bin/env python3
import paramiko, time

print('Connecting...', flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', timeout=30)

def run(cmd, wait=3):
    try:
        _, out, err = ssh.exec_command(cmd, timeout=60)
        time.sleep(wait)
        result = (out.read() + err.read()).decode().strip()
        if result:
            print(result[-600:] if len(result)>600 else result, flush=True)
        return result
    except:
        return ''

# 1. Kill
print('1. Kill...', flush=True)
run('pkill -9 node 2>/dev/null; pm2 kill 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; sleep 2; echo KILLED', 3)

# 2. Start
print('2. Start...', flush=True)
run('cd /home/sanliur/public_html && cat .env > /dev/null && node dist/server/entry.mjs > /tmp/app.log 2>&1 &', 12)

# 3. Health
print('3. Health...', flush=True)
h = run('curl -sf http://127.0.0.1:4321/api/health || echo FAIL', 3)

if 'healthy' in h.lower():
    print('4. PM2...', flush=True)
    run('pm2 delete all 2>/dev/null; cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa-app && pm2 save', 5)
    print('DEPLOY OK!')
else:
    print('FAIL. Log:')
    run('tail -10 /tmp/app.log', 1)

ssh.close()
