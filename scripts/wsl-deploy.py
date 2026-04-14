#!/usr/bin/env python3
import paramiko, time

print('Baglaniyor...', flush=True)
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='zIT7Y9yrJZRV', timeout=30)
print('SSH OK!', flush=True)

def run(cmd, wait=3):
    try:
        _, out, err = ssh.exec_command(cmd, timeout=60)
        time.sleep(wait)
        o = out.read().decode()
        e = err.read().decode()
        result = (o + e).strip()
        if result:
            print(result[-600:] if len(result)>600 else result, flush=True)
        return result
    except Exception as ex:
        return str(ex)

print('=== 1. KILL ===', flush=True)
run('pkill -9 node 2>/dev/null; pm2 kill 2>/dev/null; sleep 2; echo KILLED', 3)

print('=== 2. PORTS ===', flush=True)
run('fuser -k 6000/tcp 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; sleep 2; ss -tlnp | grep -E "6000|4321" || echo PORTS_FREE', 4)

print('=== 3. ENV ===', flush=True)
run('grep DATABASE_URL /home/sanliur/public_html/.env', 1)

print('=== 4. START ===', flush=True)
run('cd /home/sanliur/public_html && export PORT=6000 && export HOST=127.0.0.1 && export NODE_ENV=production && nohup node dist/server/entry.mjs > /tmp/app.log 2>&1 &', 10)

print('=== 5. HEALTH ===', flush=True)
health = run('curl -sf http://127.0.0.1:6000/api/health || echo HEALTH_FAIL', 5)

# If 6000 fails, check 4321
if 'HEALTH_FAIL' in health:
    print('Port 6000 basarisiz, 4321 deneniyor...', flush=True)
    health2 = run('curl -sf http://127.0.0.1:4321/api/health || echo HEALTH_FAIL_4321', 3)
    if 'healthy' in health2.lower():
        health = health2
        print('Port 4321 calisiyor!', flush=True)

if 'healthy' in health.lower():
    print('=== 6. PM2 ===', flush=True)
    run('pm2 delete all 2>/dev/null; cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa-app && pm2 save', 5)
    print('PM2 KAYDEDILDI!', flush=True)
else:
    print('=== LOG ===', flush=True)
    run('tail -20 /tmp/app.log 2>/dev/null', 1)

ssh.close()
print('=== BITTI ===', flush=True)
