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
                timeout=20, banner_timeout=20, auth_timeout=20,
                look_for_keys=False, allow_agent=False)
    
    print("Connected!")
    
    # Use invoke_shell for interactive session
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    # Send commands
    channel.send("source ~/.nvm/nvm.sh\n")
    time.sleep(1)
    
    channel.send("pm2 logs sanliurfa --lines 10\n")
    time.sleep(3)
    
    # Receive output
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(0.5)
    
    print("OUTPUT:")
    print(output[-800:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
