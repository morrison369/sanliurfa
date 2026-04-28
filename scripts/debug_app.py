#!/usr/bin/env python3
"""Debug application issues"""
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
    
    print("🔍 Application Debug")
    print("=" * 60)
    
    # 1. Check PM2 status
    print("\n1️⃣ PM2 Status:")
    _, o, _ = ssh.exec_command(NVM_PREFIX + "pm2 list")
    print(o.read().decode()[:400])
    
    # 2. Check if entry.mjs exists
    print("\n2️⃣ Build Files:")
    _, o, _ = ssh.exec_command("ls -la /home/sanliur/public_html/dist/server/ 2>/dev/null | head -10")
    files = o.read().decode()
    print(files if files else "❌ dist/server/ not found")
    
    # 3. Check .env.production
    print("\n3️⃣ Environment File:")
    _, o, _ = ssh.exec_command("ls -la /home/sanliur/public_html/.env* 2>/dev/null")
    env = o.read().decode()
    print(env if env else "❌ No .env files")
    
    # 4. Get recent logs
    print("\n4️⃣ Recent PM2 Logs:")
    _, o, _ = ssh.exec_command(NVM_PREFIX + "pm2 logs sanliurfa --lines 30 2>/dev/null | tail -30")
    logs = o.read().decode()
    print(logs[-800:] if logs else "No logs available")
    
    # 5. Check process
    print("\n5️⃣ Process Check:")
    _, o, _ = ssh.exec_command("ps aux | grep -E 'node|pm2' | grep -v grep | head -10")
    ps = o.read().decode()
    print(ps if ps else "No node processes found")
    
    # 6. Port check
    print("\n6️⃣ Port 4321:")
    _, o, _ = ssh.exec_command("ss -tlnp 2>/dev/null | grep 4321 || netstat -tlnp 2>/dev/null | grep 4321 || echo 'Port 4321 not listening'")
    print(o.read().decode().strip())
    
    # 7. Try manual start to see errors
    print("\n7️⃣ Manual Start Test (5 sec timeout):")
    _, o, e = ssh.exec_command("cd /home/sanliur/public_html && timeout 5 " + NVM_PREFIX + "node dist/server/entry.mjs --port 4321 2>&1 || true")
    output = o.read().decode()
    error = e.read().decode()
    if output:
        print("Output:", output[:500])
    if error:
        print("Error:", error[:500])
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("💡 Recommendations:")
    print("   - If 'dist/server/' missing: Run 'npm run build'")
    print("   - If .env missing: Check .env.production exists")
    print("   - If port error: Check if port 4321 is in use")
    print("   - If module error: Run 'npm install'")

if __name__ == "__main__":
    main()
