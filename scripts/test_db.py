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
    
    # Test DB connection
    channel.send("psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c 'SELECT 1' 2>&1\n")
    time.sleep(3)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("DB CONNECTION TEST:")
    print(output[-400:])
    
    # Check pg_hba.conf
    channel.send("cat /var/lib/pgsql/data/pg_hba.conf | grep -v '^#' | grep -v '^$' | head -10\n")
    time.sleep(2)
    
    output2 = ""
    while channel.recv_ready():
        output2 += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(0.5)
    
    print("\nPG_HBA CONFIG:")
    print(output2[-300:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
