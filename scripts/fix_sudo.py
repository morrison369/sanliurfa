#!/usr/bin/env python3
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
SUDO_PASS = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                timeout=20, look_for_keys=False, allow_agent=False)
    
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    print("Fixing PostgreSQL with sudo...")
    
    # Fix pg_hba.conf with sudo
    channel.send("sudo sed -i 's/scram-sha-256/trust/g' /var/lib/pgsql/data/pg_hba.conf\n")
    time.sleep(2)
    channel.send(SUDO_PASS + "\n")
    time.sleep(2)
    
    channel.send("sudo sed -i 's/ident/trust/g' /var/lib/pgsql/data/pg_hba.conf\n")
    time.sleep(2)
    channel.send(SUDO_PASS + "\n")
    time.sleep(2)
    
    channel.send("sudo sed -i 's/md5/trust/g' /var/lib/pgsql/data/pg_hba.conf\n")
    time.sleep(2)
    channel.send(SUDO_PASS + "\n")
    time.sleep(2)
    
    channel.send("sudo systemctl restart postgresql\n")
    time.sleep(2)
    channel.send(SUDO_PASS + "\n")
    time.sleep(5)
    
    # Test DB
    channel.send("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT 1'\n")
    time.sleep(3)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("OUTPUT:")
    print(output[-600:])
    
    # Restart app
    channel.send("source ~/.nvm/nvm.sh && pm2 restart sanliurfa\n")
    time.sleep(5)
    
    # Test site
    channel.send("curl -s http://127.0.0.1:4321/ | head -1\n")
    time.sleep(2)
    
    output2 = ""
    while channel.recv_ready():
        output2 += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("\nSITE TEST:")
    print(output2[-300:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
