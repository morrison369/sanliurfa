#!/usr/bin/env python3
import paramiko
import sys

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    print("🔍 Deployment Status Check")
    print("=" * 50)
    
    # PM2 status
    _, stdout, _ = ssh.exec_command(NVM_PREFIX + "pm2 list")
    pm2 = stdout.read().decode()
    print("\n📊 PM2 Status:")
    print(pm2[:500])
    
    # HTTP test
    _, stdout, _ = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
    http = stdout.read().decode()
    print(f"\n🌐 HTTP Status (homepage): {http}")
    
    if http == "200":
        print("✅ Site is UP!")
    else:
        print("⚠️ Site returned non-200 status")
        # Show logs
        _, stdout, _ = ssh.exec_command(NVM_PREFIX + "pm2 logs sanliurfa --lines 5")
        logs = stdout.read().decode()
        print("\nRecent logs:")
        print(logs)
    
    ssh.close()

if __name__ == "__main__":
    main()
