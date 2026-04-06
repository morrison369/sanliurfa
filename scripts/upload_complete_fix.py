#!/usr/bin/env python3
"""Upload complete_fix.sh to server"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()
    
    print("📤 Uploading complete_fix.sh...")
    sftp.put('scripts/complete_fix.sh', '/home/sanliur/public_html/scripts/complete_fix.sh')
    ssh.exec_command('chmod +x /home/sanliur/public_html/scripts/complete_fix.sh')
    print("✅ Done!")
    print("")
    print("🚀 To run the fix:")
    print("   ssh sanliur@168.119.79.238 -p 77")
    print("   bash /home/sanliur/public_html/scripts/complete_fix.sh")
    
    sftp.close()
    ssh.close()

if __name__ == "__main__":
    main()
