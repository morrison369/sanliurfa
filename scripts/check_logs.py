#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("📋 Son Çıktı Logları:")
stdin, stdout, stderr = ssh.exec_command("tail -30 /home/sanliur/.pm2/logs/sanliurfa-out.log")
print(stdout.read().decode()[-1500:])

print("\n📋 Son Hata Logları:")
stdin, stdout, stderr = ssh.exec_command("tail -20 /home/sanliur/.pm2/logs/sanliurfa-error.log")
print(stdout.read().decode()[-1000:])

print("\n📋 Portlar:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep -E '4321|6000' || ss -tlnp | grep -E '4321|6000' || echo 'Komut bulunamadi'")
print(stdout.read().decode())

print("\n📋 Ecosystem dosyası var mı:")
stdin, stdout, stderr = ssh.exec_command("ls -la /home/sanliur/public_html/ecosystem.config.cjs")
print(stdout.read().decode())

ssh.close()
