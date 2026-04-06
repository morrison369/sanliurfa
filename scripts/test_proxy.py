#!/usr/bin/env python3
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🌐 Proxy Test")
print("=" * 50)

print("\n📄 .htaccess içeriği:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.htaccess")
print(stdout.read().decode()[:400])

print("\n🧪 Port 80 test:")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' http://168.119.79.238/")
print("HTTP Code:", stdout.read().decode())

print("\n🧪 Port 6000 test (direkt):")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
print("HTTP Code:", stdout.read().decode())

print("\n📊 Apache durum:")
stdin, stdout, stderr = ssh.exec_command("systemctl status httpd --no-pager 2>/dev/null | head -5 || echo 'Status unavailable'")
print(stdout.read().decode()[:300])

ssh.close()
