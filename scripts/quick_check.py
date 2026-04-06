#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

print("PM2 Durum:")
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 show sanliurfa 2>&1 | head -20")
print(stdout.read().decode())

print("\nPort 6000 Test:")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s http://127.0.0.1:6000/ 2>&1 | head -100")
result = stdout.read().decode()
if result:
    print("✅ Yanıt var (ilk 500 karakter):")
    print(result[:500])
else:
    print("❌ Yanıt yok")
    print("Hata:", stderr.read().decode()[:200])

ssh.close()
