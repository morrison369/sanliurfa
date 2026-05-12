#!/usr/bin/env python3
"""
Sanliurfa.com - Otomatik CWP Deploy Scripti
Kullanim: python scripts/auto-deploy.py

Gereksinimler: pip install paramiko scp
"""

import paramiko
import time
import sys
import os

# Sunucu Bilgileri
HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_DIR = "/home/sanliur/public_html"
LOCAL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def print_green(text):
    print(f"\033[92m{text}\033[0m")

def print_yellow(text):
    print(f"\033[93m{text}\033[0m")

def print_red(text):
    print(f"\033[91m{text}\033[0m")

def run_command(ssh, command, timeout=120):
    """SSH komut calistir"""
    print_yellow(f"> {command}")
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')
    
    if output:
        print(output)
    if error and 'npm WARN' not in error and 'deprecated' not in error.lower():
        print_red(error)
    
    return stdout.channel.recv_exit_status() == 0

def main():
    print_green("=" * 60)
    print_green("Sanliurfa.com - Otomatik CWP Deploy")
    print_green("=" * 60)

    # 1. Baglanti
    print_green("\n[1/7] Sunucuya baglaniliyor...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
        print_green("✅ Sunucuya baglanildi!")
    except Exception as e:
        print_red(f"❌ Baglanti hatasi: {e}")
        return

    # 2. Dizin kontrolu
    print_green("\n[2/7] Dizin kontrolu...")
    run_command(ssh, f"mkdir -p {REMOTE_DIR}")
    run_command(ssh, f"cd {REMOTE_DIR} && pwd")

    # 3. Node.js kontrolu
    print_green("\n[3/7] Node.js kontrolu...")
    run_command(ssh, "node -v || echo 'Node.js yuklu degil'")
    run_command(ssh, "npm -v || echo 'npm yuklu degil'")

    # 4. .env dosyasini olustur
    print_green("\n[4/7] .env dosyasi olusturuluyor...")
    env_content = open(os.path.join(LOCAL_DIR, ".env.production")).read()
    stdin, stdout, stderr = ssh.exec_command(f"cat > {REMOTE_DIR}/.env << 'ENVEOF'\n{env_content}\nENVEOF")
    stdout.channel.recv_exit_status()
    print_green("✅ .env dosyasi olusturuldu!")

    # 5. Bağımliliklar
    print_green("\n[5/7] Bagimliliklar yukleniyor...")
    run_command(ssh, f"cd {REMOTE_DIR} && npm install --legacy-peer-deps --production", timeout=300)

    # 6. Build
    print_green("\n[6/7] Build olusturuluyor...")
    run_command(ssh, f"cd {REMOTE_DIR} && npm run build", timeout=300)

    # 7. PM2 baslat
    print_green("\n[7/7] PM2 baslatiliyor...")
    run_command(ssh, "npm install -g pm2")
    run_command(ssh, f"cd {REMOTE_DIR} && pm2 delete sanliurfa-app 2>/dev/null; true")
    run_command(ssh, f"cd {REMOTE_DIR} && pm2 start ecosystem.config.cjs --name sanliurfa-app")
    run_command(ssh, "pm2 save")
    
    # Saglik kontrolu
    time.sleep(3)
    print_green("\n🏥 Saglik kontrolu...")
    run_command(ssh, "curl -s http://127.0.0.1:4321/api/health")

    print_green("\n" + "=" * 60)
    print_green("✅ DEPLOY TAMAMLANDI!")
    print_green("=" * 60)
    print_green("\nSite: https://sanliurfa.com")
    print_green("Health: http://127.0.0.1:4321/api/health")
    print_yellow("\nVeritabani seed icin calistirin:")
    print_yellow(f"  cd {REMOTE_DIR} && npx tsx scripts/seed-content.ts")
    
    ssh.close()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_red("\n❌ Islem iptal edildi!")
    except Exception as e:
        print_red(f"\n❌ Hata: {e}")
