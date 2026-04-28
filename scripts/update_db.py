#!/usr/bin/env python3
"""Update database schema"""
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
    
    # Upload SQL file
    local = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database/update_schema.sql")
    remote = "/home/sanliur/update_schema.sql"
    print("Uploading SQL file...")
    sftp.put(local, remote)
    
    # Execute SQL
    print("Executing SQL...")
    stdin, stdout, stderr = ssh.exec_command(f"psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f {remote} 2>&1")
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    print("Output:", output[-500:] if len(output) > 500 else output)
    if error:
        print("Error:", error[:500])
    
    # Clean up
    ssh.exec_command(f"rm {remote}")
    
    sftp.close()
    ssh.close()
    print("✅ Database update completed")

if __name__ == "__main__":
    main()
