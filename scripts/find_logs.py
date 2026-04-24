#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

print("📂 PM2 Dizin Yapısı:")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/sanliur/.pm2/ 2>&1")
print(stdout.read().decode())

print("\n📋 PM2 Show:")
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 show sanliurfa 2>&1 | grep -E 'log|out|error'")
print(stdout.read().decode())

print("\n🔍 Log dosyaları aranıyor:")
stdin, stdout, stderr = ssh.exec_command("find /home/sanliur -name '*.log' -type f 2>/dev/null | grep -i pm2")
result = stdout.read().decode()
if result:
    print(result)
else:
    print("Log dosyası bulunamadı")

print("\n📝 Son çıktıyı göster (pm2 monit son 20 satır):")
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 logs sanliurfa --lines 20 --nostream 2>&1")
print(stdout.read().decode()[-2000:])

ssh.close()
