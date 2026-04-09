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
    
    print("Final DB Fix...")
    
    # Export PGPASSWORD and test
    channel.send("export PGPASSWORD='CHANGE_ME_DB_PASSWORD'\n")
    time.sleep(1)
    
    # Test with password env
    channel.send("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT 1' 2>&1\n")
    time.sleep(3)
    
    # Update env with password embedded
    channel.send("cd /home/sanliur/public_html\n")
    time.sleep(1)
    
    # Write new env with password
    env_lines = [
        "SITE_URL=https://sanliurfa.com",
        "NODE_ENV=production", 
        "PORT=6000",
        "HOST=127.0.0.1",
        "DATABASE_URL=postgresql://sanliur_sanliurfa:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliur_sanliurfa",
        "JWT_SECRET=change-this-secret-key-min-32-chars",
        ""
    ]
    
    for line in env_lines:
        channel.send(f"echo '{line}' >> .env.new\n")
        time.sleep(0.3)
    
    channel.send("mv .env.new .env.production\n")
    time.sleep(1)
    
    # Restart app
    channel.send("source ~/.nvm/nvm.sh && pm2 restart sanliurfa\n")
    time.sleep(5)
    
    # Test
    channel.send("curl -s http://127.0.0.1:4321/api/health 2>&1\n")
    time.sleep(3)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("RESULT:")
    print(output[-500:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
