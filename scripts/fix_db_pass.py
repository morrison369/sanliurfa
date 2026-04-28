#!/usr/bin/env python3
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DB_PASS = "CHANGE_ME_DB_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                timeout=20, look_for_keys=False, allow_agent=False)
    
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    print("Fixing DB password...")
    
    # Fix .env.production
    channel.send("cd /home/sanliur/public_html\n")
    time.sleep(1)
    
    # Create new env file with correct password
    env_content = f"""SITE_URL=https://sanliurfa.com
NODE_ENV=production
PORT=4321
HOST=127.0.0.1
DATABASE_URL=postgresql://sanliur_sanliurfa:{DB_PASS}@localhost:5432/sanliur_sanliurfa
JWT_SECRET=change-this-secret-key
"""
    
    channel.send(f"cat > .env.production << 'EOF'\n{env_content}\nEOF\n")
    time.sleep(2)
    
    # Verify
    channel.send("grep DATABASE_URL .env.production\n")
    time.sleep(1)
    
    # Restart app
    channel.send("source ~/.nvm/nvm.sh\n")
    time.sleep(1)
    channel.send("pm2 restart sanliurfa\n")
    time.sleep(5)
    
    # Test
    channel.send("curl -s http://127.0.0.1:4321/ | head -1\n")
    time.sleep(2)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("OUTPUT:")
    print(output[-500:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
