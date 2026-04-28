#!/usr/bin/env python3
"""Final test"""
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
    
    print("🧪 Final Test")
    print("=" * 60)
    
    # PM2 status
    stdin, stdout, _ = ssh.exec_command(NVM + "pm2 list")
    print("\n📊 PM2:")
    print(stdout.read().decode()[:400])
    
    # Port 4321
    stdin, stdout, _ = ssh.exec_command("ss -tlnp | grep 4321 || netstat -tlnp | grep 4321 || echo 'Port 4321 not found'")
    print("\n🔌 Port 4321:")
    print(stdout.read().decode().strip()[:200])
    
    # HTTP test
    stdin, stdout, _ = ssh.exec_command("curl -s --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
    http = stdout.read().decode().strip()
    print(f"\n🌐 HTTP Status: {http}")
    
    # HTML test
    if http == "200":
        stdin, stdout, _ = ssh.exec_command("curl -s --max-time 5 http://127.0.0.1:4321/ | head -5")
        html = stdout.read().decode().strip()
        print("\n📄 HTML Response (first 5 lines):")
        print(html[:300])
    
    ssh.close()
    
    print("\n" + "=" * 60)
    if http == "200":
        print("✅ SUCCESS! Application is working!")
        print("🌐 http://sanliurfa.com")
    else:
        print(f"⚠️ HTTP {http} - Check logs")

if __name__ == "__main__":
    main()
