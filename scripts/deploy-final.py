#!/usr/bin/env python3
"""Sanliurfa.com - Deploy via Paramiko Interactive Shell"""
import paramiko
import time
import sys

HOST = '168.119.79.238'
PORT = 77
USER = 'sanliur'
PASS = 'CHANGE_ME_CWP_SSH_PASSWORD'

def main():
    print("Baglaniyor...", flush=True)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30, allow_agent=False, look_for_keys=False)
    print("SSH OK!", flush=True)

    # Create interactive shell channel
    channel = client.invoke_shell(width=200, height=50)
    channel.settimeout(5)
    
    # Wait for prompt
    time.sleep(2)
    
    commands = [
        'export TERM=xterm',
        'echo "=== KILL ==="',
        'pkill -9 -f node 2>/dev/null',
        'pm2 kill 2>/dev/null',
        'sleep 3',
        'fuser -k 4321/tcp 2>/dev/null',
        'fuser -k 4321/tcp 2>/dev/null',
        'sleep 2',
        'echo "=== PORTS ==="',
        'ss -tlnp | grep 4321 || echo P6000_FREE',
        'ss -tlnp | grep 4321 || echo P4321_FREE',
        'echo "=== ENV ==="',
        'grep "DATABASE_URL" /home/sanliur/public_html/.env',
        'echo "=== START ==="',
        'cd /home/sanliur/public_html',
        'NODE_ENV=production PORT=4321 node dist/server/entry.mjs &',
        'sleep 10',
        'echo "=== HEALTH ==="',
        'curl -sf http://127.0.0.1:4321/api/health || echo HEALTH_FAIL',
        'echo "=== PM2 ==="',
        'pm2 delete all 2>/dev/null || true',
        'pm2 start /home/sanliur/public_html/dist/server/entry.mjs --name sanliurfa-app',
        'pm2 save',
        'echo "=== LIST ==="',
        'pm2 list',
        'echo "=== DONE ==="',
    ]
    
    # Send all commands
    for cmd in commands:
        channel.send(cmd + '\n')
        time.sleep(0.3)
    
    # Wait for completion
    total_wait = 50
    time.sleep(total_wait)
    
    # Read all output
    output = b''
    while channel.recv_ready():
        output += channel.recv(8192)
    
    text = output.decode('utf-8', errors='replace')
    
    # Print last 3000 chars
    if len(text) > 3000:
        print(text[-3000:], flush=True)
    else:
        print(text, flush=True)
    
    client.close()
    print("\nBITTI!", flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"HATA: {e}", flush=True)
        sys.exit(1)
