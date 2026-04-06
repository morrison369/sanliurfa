#!/usr/bin/env python3
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    print("🔍 Detailed Deployment Check")
    print("=" * 60)
    
    # 1. PM2 Status
    print("\n📊 PM2 Status:")
    _, stdout, _ = ssh.exec_command(NVM_PREFIX + "pm2 list")
    pm2 = stdout.read().decode()
    print(pm2 if pm2 else "No PM2 output")
    
    # 2. Check port 6000
    print("\n🔌 Port 6000:")
    _, stdout, _ = ssh.exec_command("netstat -tlnp 2>/dev/null | grep 6000 || ss -tlnp | grep 6000")
    port = stdout.read().decode().strip()
    print(port if port else "❌ No process on port 6000")
    
    # 3. HTTP Test homepage
    print("\n🌐 HTTP Test (homepage):")
    _, stdout, _ = ssh.exec_command("curl -s --max-time 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
    http = stdout.read().decode().strip()
    print(f"Status: {http}")
    
    # 4. HTTP Test API
    print("\n🔌 HTTP Test (/api/health):")
    _, stdout, _ = ssh.exec_command("curl -s --max-time 5 http://127.0.0.1:6000/api/health")
    health = stdout.read().decode().strip()
    print(f"Response: {health[:200] if health else 'No response'}")
    
    # 5. Check .env.production
    print("\n⚙️ Environment:")
    _, stdout, _ = ssh.exec_command("ls -la /home/sanliur/public_html/.env* 2>/dev/null")
    env = stdout.read().decode().strip()
    print(env if env else "No .env files found")
    
    # 6. Check database connection
    print("\n💾 Database Connection:")
    _, stdout, _ = ssh.exec_command("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT 1' 2>&1")
    db = stdout.read().decode().strip()
    print("✅ Connected" if "1" in db else f"❌ {db[:200]}")
    
    # 7. Recent logs
    if http != "200":
        print("\n📋 Recent PM2 Logs:")
        _, stdout, _ = ssh.exec_command(NVM_PREFIX + "pm2 logs sanliurfa --lines 10 2>/dev/null")
        logs = stdout.read().decode()
        print(logs[-800:] if logs else "No logs")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    if http == "200":
        print("✅ SITE IS UP!")
    else:
        print("⚠️ SITE NEEDS ATTENTION")

if __name__ == "__main__":
    main()
