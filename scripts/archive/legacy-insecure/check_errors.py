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
    
    print("=== HATA LOG LARI ===\n")
    
    # Check PM2 logs
    channel.send("source ~/.nvm/nvm.sh && pm2 logs sanliurfa --lines 20 2>&1 | tail -25\n")
    time.sleep(5)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    # Filter error lines
    error_lines = []
    for line in output.split('\n'):
        if any(x in line.lower() for x in ['error', 'err', 'exception', 'failed', 'cannot', 'relation', 'table', 'permission']):
            error_lines.append(line.strip()[:200])
    
    print("SON HATALAR:")
    for line in error_lines[-15:]:
        print(line)
    
    if not error_lines:
        print("(Son 20 satirda hata bulunamadi)")
        print("\nHam cikti:")
        print(output[-500:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
