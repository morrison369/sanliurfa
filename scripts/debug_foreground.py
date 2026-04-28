#!/usr/bin/env python3
"""Debug app by running in foreground"""
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=20)
    
    print("🔍 Debugging - Foreground Start")
    print("=" * 60)
    
    # Stop existing
    print("\n1. Stopping existing...")
    ssh.exec_command('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && pm2 stop sanliurfa 2>/dev/null')
    ssh.exec_command('fuser -k 4321/tcp 2>/dev/null || true')
    time.sleep(2)
    
    # Start in background and capture
    print("\n2. Starting app...")
    ssh.exec_command('cd /home/sanliur/public_html && export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && (node dist/server/entry.mjs > /tmp/app.log 2>&1 &)')
    
    time.sleep(4)
    
    # Check logs
    print("\n3. App logs:")
    stdin, stdout, _ = ssh.exec_command('cat /tmp/app.log 2>/dev/null | tail -30')
    logs = stdout.read().decode()
    print(logs if logs else "No logs yet")
    
    # Test HTTP
    print("\n4. HTTP Test:")
    stdin, stdout, _ = ssh.exec_command('curl -s --max-time 3 http://127.0.0.1:4321/ 2>&1 | head -5')
    response = stdout.read().decode()
    print(response[:300] if response else "No response")
    
    # Check port
    print("\n5. Port status:")
    stdin, stdout, _ = ssh.exec_command('ss -tlnp | grep 4321 || netstat -tlnp | grep 4321 || echo "Port not listening"')
    print(stdout.read().decode().strip()[:200])
    
    ssh.close()
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
