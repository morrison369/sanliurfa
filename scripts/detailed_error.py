#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🔍 Detaylı Hata Analizi")
print("=" * 60)

# curl ile verbose output
print("\n📋 curl verbose:")
stdin, stdout, stderr = ssh.exec_command("curl -v http://127.0.0.1:4321/ 2>&1 | tail -30")
print(stdout.read().decode())

# PM2 error log
print("\n📋 PM2 Error Log:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/.pm2/logs/sanliurfa-error.log 2>&1 | tail -50")
err_log = stdout.read().decode()
if err_log.strip():
    print(err_log[-2000:])
else:
    print("(boş)")

# PM2 out log - son 100 satır
print("\n📋 PM2 Out Log (son 100 satır):")
stdin, stdout, stderr = ssh.exec_command("tail -100 /home/sanliur/.pm2/logs/sanliurfa-out.log")
print(stdout.read().decode()[-3000:])

# .env.production kontrol
print("\n📄 .env.production:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production | head -20")
print(stdout.read().decode())

ssh.close()
