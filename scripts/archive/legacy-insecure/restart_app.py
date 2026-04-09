#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD', allow_agent=False, look_for_keys=False)

print("🔄 Uygulama Yeniden Başlatılıyor")
print("=" * 50)

NVM_PREFIX = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '

# Restart
cmd = NVM_PREFIX + 'pm2 restart sanliurfa'
stdin, stdout, stderr = ssh.exec_command(cmd)
output = stdout.read().decode()
print(output[:800])

# Durum
print("\n📊 Durum:")
stdin, stdout, stderr = ssh.exec_command(NVM_PREFIX + 'pm2 list')
print(stdout.read().decode())

# Test
print("\n🌐 HTTP Test:")
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/')
code = stdout.read().decode()
if code == "200":
    print(f"✅ HTTP {code} - Site çalışıyor!")
else:
    print(f"⚠️ HTTP {code}")

ssh.close()
print("\n" + "=" * 50)
print("🎉 YENİDEN BAŞLATMA TAMAMLANDI!")
