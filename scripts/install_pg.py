#!/usr/bin/env python3
"""pg (node-postgres) kurulumu"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("📦 pg (node-postgres) kurulumu")
print("=" * 50)

NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
REMOTE_PATH = "/home/sanliur/public_html"

# pg kur
print("\n⬇️ pg kuruluyor...")
cmd = f"cd {REMOTE_PATH} && " + NVM + "npm install pg @types/pg --legacy-peer-deps"
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)

import time
start = time.time()
while not stdout.channel.exit_status_ready():
    if time.time() - start > 10:
        print("  ⏳ Kurulum devam ediyor...")
        start = time.time()
    time.sleep(1)

result = stdout.read().decode()
if "added" in result:
    print("✅ pg kuruldu!")
    lines = [l for l in result.split('\n') if 'added' in l or 'packages' in l]
    for line in lines[-3:]:
        print(f"  {line}")
else:
    print("⚠️ Durum:", result[-500:])

ssh.close()
print("\nTamamlandı!")
