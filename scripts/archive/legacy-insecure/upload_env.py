#!/usr/bin/env python3
"""Upload .env.production to server"""
import paramiko
import os

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html/.env.production"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()
    
    local_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.production")
    print(f"Uploading .env.production...")
    sftp.put(local_path, REMOTE_PATH)
    print("✅ Done")
    
    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
