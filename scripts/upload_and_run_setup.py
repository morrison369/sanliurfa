#!/usr/bin/env python3
"""Upload and run post-deployment setup"""
import paramiko
import os

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()
    
    # Upload setup script
    local = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts/post_deploy_setup.sh")
    remote = "/home/sanliur/post_deploy_setup.sh"
    print("Uploading setup script...")
    sftp.put(local, remote)
    
    # Make executable
    ssh.exec_command(f"chmod +x {remote}")
    print("✅ Script uploaded")
    print("")
    print("📝 To run the setup, SSH into the server and execute:")
    print(f"   ssh {USERNAME}@{HOST} -p {PORT}")
    print(f"   bash {remote}")
    
    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
