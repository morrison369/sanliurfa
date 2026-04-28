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
    
    print("Fixing PostgreSQL...")
    
    # Fix auth
    channel.send("sudo sed -i 's/scram-sha-256/trust/g' /var/lib/pgsql/data/pg_hba.conf\n")
    time.sleep(2)
    channel.send("sudo sed -i 's/ident/trust/g' /var/lib/pgsql/data/pg_hba.conf\n")
    time.sleep(2)
    channel.send("sudo sed -i 's/md5/trust/g' /var/lib/pgsql/data/pg_hba.conf\n")
    time.sleep(2)
    channel.send("sudo systemctl restart postgresql\n")
    time.sleep(5)
    
    # Create tables
    channel.send("cd /home/sanliur/public_html\n")
    time.sleep(1)
    channel.send("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql 2>&1 | tail -5\n")
    time.sleep(5)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print(output[-400:])
    
    channel.close()
    ssh.close()
    print("Done!")

if __name__ == "__main__":
    main()
