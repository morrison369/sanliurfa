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
    
    print("Reloading Apache...")
    
    # Try graceful restart
    channel.send("sudo /usr/local/apache/bin/apachectl graceful\n")
    time.sleep(2)
    channel.send(SUDO_PASS + "\n")
    time.sleep(5)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("RESULT:")
    print(output[-400:])
    
    # Check Apache status
    channel.send("systemctl status httpd --no-pager | head -5\n")
    time.sleep(2)
    
    output2 = ""
    while channel.recv_ready():
        output2 += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(0.5)
    
    print("\nAPACHE STATUS:")
    print(output2[-200:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
