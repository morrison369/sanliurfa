#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('176.9.138.254', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print('=== Node.js Versiyonu ===')
stdin, stdout, stderr = ssh.exec_command('/usr/local/bin/node -v')
print('Node:', stdout.read().decode().strip())

stdin, stdout, stderr = ssh.exec_command('/usr/local/bin/npm -v')
print('NPM:', stdout.read().decode().strip())

print('\n=== n Versiyon Yöneticisi ===')
stdin, stdout, stderr = ssh.exec_command('/usr/local/bin/n --version 2>/dev/null || echo n kurulu degil')
print(stdout.read().decode().strip())

print('\n=== PM2 ===')
stdin, stdout, stderr = ssh.exec_command('/usr/local/bin/pm2 --version 2>/dev/null || echo PM2 kurulu degil')
print(stdout.read().decode().strip())

print('\n=== PATH ile ===')
stdin, stdout, stderr = ssh.exec_command('export PATH="/usr/local/bin:$PATH" && node -v && npm -v')
print(stdout.read().decode().strip())

print('\n=== .bashrc Kontrolü ===')
stdin, stdout, stderr = ssh.exec_command('cat ~/.bashrc | grep -E "(PATH|node)" | head -5')
result = stdout.read().decode().strip()
print(result or 'PATH tanimi yok')

ssh.close()
print('\nKontrol tamamlandi!')
