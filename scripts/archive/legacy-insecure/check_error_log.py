#!/usr/bin/env python3
"""Check error logs"""
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
    
    print("📋 Error Logs")
    print("=" * 60)
    
    # PM2 logs
    print("\n1️⃣ PM2 Logs:")
    stdin, stdout, _ = ssh.exec_command(NVM + "pm2 logs sanliurfa --lines 30 2>&1 | tail -30")
    logs = stdout.read().decode()
    print(logs[-800:] if logs else "No logs")
    
    # Direct node test with full error
    print("\n2️⃣ Direct test with verbose output:")
    stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:4321/ 2>&1 | head -20")
    output = stdout.read().decode()
    print(output[:500])
    
    # Check database connection
    print("\n3️⃣ Database connection test:")
    stdin, stdout, stderr = ssh.exec_command("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT count(*) FROM users' 2>&1")
    db = stdout.read().decode()
    print(db[:200] if db else "DB Error")
    
    ssh.close()

if __name__ == "__main__":
    main()
