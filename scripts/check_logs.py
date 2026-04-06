#!/usr/bin/env python3
"""Check application logs"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    
    print("📋 Application Logs")
    print("=" * 60)
    
    # 1. Check if dist exists
    print("\n1. Build files:")
    stdin, stdout, _ = ssh.exec_command("ls -la /home/sanliur/public_html/dist/server/ 2>/dev/null | head -5 || echo 'dist/server not found'")
    print(stdout.read().decode())
    
    # 2. Check .env
    print("\n2. Environment file:")
    stdin, stdout, _ = ssh.exec_command("cat /home/sanliur/public_html/.env.production 2>/dev/null | head -20 || echo 'No .env.production'")
    print(stdout.read().decode())
    
    # 3. Try to start and capture error
    print("\n3. Manual start error:")
    stdin, stdout, stderr = ssh.exec_command(
        f"cd /home/sanliur/public_html && {NVM} timeout 10 node dist/server/entry.mjs --port 6000 2>&1"
    )
    output = stdout.read().decode()
    error = stderr.read().decode()
    print("Output:", output[-500:] if output else "No output")
    print("Error:", error[-500:] if error else "No error")
    
    # 4. Check node_modules
    print("\n4. Node modules:")
    stdin, stdout, _ = ssh.exec_command("ls /home/sanliur/public_html/node_modules/astro 2>/dev/null | head -3 || echo 'astro not found'")
    print(stdout.read().decode())
    
    ssh.close()

if __name__ == "__main__":
    main()
