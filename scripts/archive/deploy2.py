#!/usr/bin/env python3
"""Sanliurfa.com - Simple Deploy via Paramiko"""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', timeout=30)

def cmd(c, wait=3):
    """Run command and return stdout"""
    _, out, _ = ssh.exec_command(c)
    time.sleep(wait)
    return out.read().decode().strip()

print("1. Kill old processes...")
cmd("pkill -9 -f 'node dist' 2>/dev/null; pm2 kill 2>/dev/null; true")
time.sleep(2)

print("2. Kill port 4321...")
cmd("fuser -k 4321/tcp 2>/dev/null; fuser -k 4321/tcp 2>/dev/null; true")
time.sleep(2)

print("3. Check port...")
port = cmd("ss -tlnp | grep 4321 || echo FREE")
print(f"   Port: {port}")

print("4. Start app...")
cmd("cd /home/sanliur/public_html && NODE_ENV=production PORT=4321 nohup node dist/server/entry.mjs >/dev/null 2>&1 &", wait=10)

print("5. Health...")
health = cmd("curl -sf http://127.0.0.1:4321/api/health || echo FAIL", wait=2)
print(f"   {health[:200]}")

if "healthy" in health:
    print("6. PM2 save...")
    cmd("pm2 delete all 2>/dev/null; pm2 start /home/sanliur/public_html/dist/server/entry.mjs --name sanliurfa-app; pm2 save")
    print("   PM2 saved!")
else:
    print("6. Check log...")
    log = cmd("ls -la /tmp/app*.log 2>/dev/null && tail -15 /tmp/app*.log 2>/dev/null || echo NO_LOG")
    print(f"   {log[-500:]}")

ssh.close()
print("\nDONE!")
