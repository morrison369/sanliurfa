#!/usr/bin/env python3
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                timeout=20, look_for_keys=False, allow_agent=False)
    
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    print("Fixing database connection...")
    
    # Create .pgpass
    pgpass = "localhost:5432:sanliur_sanliurfa:sanliur_sanliurfa:CHANGE_ME_DB_PASSWORD"
    channel.send(f"echo '{pgpass}' > ~/.pgpass\n")
    time.sleep(1)
    channel.send("chmod 600 ~/.pgpass\n")
    time.sleep(1)
    
    # Fix env
    channel.send("cd /home/sanliur/public_html\n")
    time.sleep(1)
    
    # Create new env
    env = """SITE_URL=https://sanliurfa.com
NODE_ENV=production
PORT=6000
HOST=127.0.0.1
DATABASE_URL=postgresql://sanliur_sanliurfa@localhost:5432/sanliur_sanliurfa
JWT_SECRET=change-this-secret-key-32chars-long
"""
    
    channel.send(f"cat > .env.production << 'EOF'\n{env}EOF\n")
    time.sleep(2)
    
    # Restart
    channel.send("source ~/.nvm/nvm.sh && pm2 restart sanliurfa\n")
    time.sleep(5)
    
    # Test
    channel.send("curl -s http://127.0.0.1:4321/api/health 2>&1\n")
    time.sleep(3)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("OUTPUT:")
    print(output[-400:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
