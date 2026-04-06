#!/usr/bin/env python3
"""Final deployment check - quick version"""
import paramiko
import sys

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

def check():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=15)
    
    print("🔍 Quick Status Check")
    print("=" * 50)
    
    # PM2
    _, o, _ = ssh.exec_command(NVM_PREFIX + "pm2 list 2>/dev/null | grep sanliurfa")
    pm2 = o.read().decode().strip()
    print("\n📊 PM2:", "✅ Running" if "sanliurfa" in pm2 else "❌ Not found")
    
    # Port
    _, o, _ = ssh.exec_command("ss -tlnp 2>/dev/null | grep 6000 || netstat -tlnp 2>/dev/null | grep 6000")
    port = o.read().decode().strip()
    print("🔌 Port 6000:", "✅ Listening" if port else "❌ Not listening")
    
    # HTTP
    _, o, _ = ssh.exec_command("curl -s --max-time 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/ 2>/dev/null")
    http = o.read().decode().strip()
    print("🌐 HTTP Status:", f"✅ {http}" if http == "200" else f"⚠️ {http}")
    
    ssh.close()
    
    print("\n" + "=" * 50)
    if http == "200":
        print("🎉 SITE IS READY!")
        print("🔗 https://sanliurfa.com")
        return 0
    else:
        print("⚠️ Site needs attention")
        print("Run: bash /home/sanliur/post_deploy_setup.sh")
        return 1

if __name__ == "__main__":
    sys.exit(check())
