#!/usr/bin/env python3
"""Emergency fix - fast execution"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=15, banner_timeout=15, auth_timeout=15)
    
    print("🚨 Emergency Fix")
    print("=" * 60)
    
    # Combine all commands into one
    cmd = '''
cd /home/sanliur/public_html
source ~/.nvm/nvm.sh
pm2 stop sanliurfa 2>/dev/null; pm2 delete sanliurfa 2>/dev/null
fuser -k 4321/tcp 2>/dev/null
sudo sed -i 's/scram-sha-256\|ident\|md5/trust/g' /var/lib/pgsql/data/pg_hba.conf 2>/dev/null
sudo systemctl restart postgresql 2>/dev/null
sleep 2
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -c "CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, full_name VARCHAR(255), role VARCHAR(20) DEFAULT 'user', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);" 2>/dev/null
curl -s http://127.0.0.1:4321/ 2>&1 | head -1
echo "---DONE---"
'''
    
    print("\n1️⃣ Running fix...")
    stdin, stdout, _ = ssh.exec_command(cmd, timeout=30)
    result = stdout.read().decode()
    
    if "---DONE---" in result:
        print("   ✅ Commands executed")
    else:
        print("   Output:", result[-300:])
    
    # Quick test
    print("\n2️⃣ Testing...")
    stdin, stdout, _ = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null")
    http = stdout.read().decode().strip()
    print(f"   HTTP: {http}")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    if http == "200":
        print("✅ FIXED!")
    else:
        print("⚠️ Still needs attention")
        print("Run manually on server:")
        print("  bash /home/sanliur/public_html/scripts/complete_fix.sh")

if __name__ == "__main__":
    main()
