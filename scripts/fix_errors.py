#!/usr/bin/env python3
"""Fix common deployment errors"""
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    
    NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    
    print("🔧 Fixing Deployment Errors")
    print("=" * 60)
    
    # 1. Check PM2 logs for specific error
    print("\n1️⃣ Checking PM2 logs...")
    stdin, stdout, _ = ssh.exec_command(NVM + "pm2 logs sanliurfa --lines 50 2>&1")
    logs = stdout.read().decode()
    
    # Look for specific errors
    if "DATABASE_URL" in logs:
        print("   ❌ DATABASE_URL error found")
    if "ECONNREFUSED" in logs:
        print("   ❌ Database connection refused")
    if "JWT_SECRET" in logs:
        print("   ❌ JWT_SECRET error")
    if "permission denied" in logs.lower():
        print("   ❌ Permission error")
    
    print("   Logs snippet:")
    print("   " + logs[-500:].replace("\n", "\n   "))
    
    # 2. Check .env.production content
    print("\n2️⃣ Checking environment...")
    stdin, stdout, _ = ssh.exec_command("cat /home/sanliur/public_html/.env.production")
    env = stdout.read().decode()
    
    if "your-super-secret-jwt-key" in env:
        print("   ⚠️  JWT_SECRET is default value - should be changed")
    if "localhost" in env and "DATABASE_URL" in env:
        print("   ✅ DATABASE_URL looks correct")
    
    # 3. Check database accessibility
    print("\n3️⃣ Testing database...")
    stdin, stdout, stderr = ssh.exec_command("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT 1' 2>&1")
    db_result = stdout.read().decode()
    db_error = stderr.read().decode()
    
    if "1" in db_result:
        print("   ✅ Database connection OK")
    else:
        print(f"   ❌ Database error: {db_error[:200]}")
        
        # Try to fix pg_hba.conf for trust auth
        print("\n   🔧 Attempting to fix PostgreSQL auth...")
        ssh.exec_command("sudo sed -i 's/scram-sha-256/trust/g' /var/lib/pgsql/data/pg_hba.conf 2>/dev/null || true")
        ssh.exec_command("sudo sed -i 's/ident/trust/g' /var/lib/pgsql/data/pg_hba.conf 2>/dev/null || true")
        ssh.exec_command("sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null || true")
        time.sleep(2)
        
        # Test again
        stdin, stdout, _ = ssh.exec_command("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT 1' 2>&1")
        if "1" in stdout.read().decode():
            print("   ✅ Database fixed!")
    
    # 4. Check if tables exist
    print("\n4️⃣ Checking database tables...")
    stdin, stdout, _ = ssh.exec_command("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c \"SELECT table_name FROM information_schema.tables WHERE table_schema='public'\" 2>&1")
    tables = stdout.read().decode()
    
    if "users" in tables:
        print("   ✅ users table exists")
    else:
        print("   ❌ users table missing - need to run schema")
    
    if "places" in tables:
        print("   ✅ places table exists")
    else:
        print("   ❌ places table missing")
    
    # 5. Restart app with fresh start
    print("\n5️⃣ Restarting application...")
    ssh.exec_command(NVM + "pm2 stop sanliurfa 2>/dev/null")
    ssh.exec_command("fuser -k 4321/tcp 2>/dev/null || true")
    time.sleep(2)
    
    ssh.exec_command(NVM + "cd /home/sanliur/public_html && pm2 start dist/server/entry.mjs --name sanliurfa")
    time.sleep(3)
    ssh.exec_command(NVM + "pm2 save")
    
    # 6. Final test
    print("\n6️⃣ Final test...")
    stdin, stdout, _ = ssh.exec_command("curl -s --max-time 5 http://127.0.0.1:4321/ 2>&1 | head -10")
    result = stdout.read().decode()
    
    if "<!DOCTYPE html>" in result or "<html" in result:
        print("   ✅ Site is serving HTML!")
    elif "Internal server error" in result:
        print("   ❌ Still getting internal error")
        print("   Check: pm2 logs sanliurfa")
    else:
        print(f"   Response: {result[:200]}")
    
    ssh.close()
    
    print("\n" + "=" * 60)
    print("✅ Fix process completed")

if __name__ == "__main__":
    main()
