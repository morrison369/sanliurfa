#!/bin/bash
# Upload debug script to server
cd "$(dirname "$0")/.."
python3 -c "
import paramiko, os
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', timeout=30)
sftp = ssh.open_sftp()
local = 'scripts/server_debug.sh'
remote = '/home/sanliur/public_html/scripts/server_debug.sh'
sftp.put(local, remote)
ssh.exec_command('chmod +x ' + remote)
sftp.close()
ssh.close()
print('✅ Debug script uploaded')
"

echo ""
echo "📝 To run debug on server:"
echo "   ssh sanliur@168.119.79.238 -p 77"
echo "   bash /home/sanliur/public_html/scripts/server_debug.sh"
