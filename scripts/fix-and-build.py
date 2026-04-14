#!/usr/bin/env python3
"""
Sanliurfa.com - Duzeltme ve Build Script
Kullanim: python scripts/fix-and-build.py
"""

import paramiko
import time
import os

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "zIT7Y9yrJZRV"
REMOTE_DIR = "/home/sanliur/public_html"
LOCAL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def print_green(text):
    print(f"\033[92m{text}\033[0m")

def print_yellow(text):
    print(f"\033[93m{text}\033[0m")

def print_red(text):
    print(f"\033[91m{text}\033[0m")

def run_command(ssh, command, timeout=180):
    print_yellow(f"> {command}")
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    output = stdout.read().decode('utf-8', errors='replace')
    error = stderr.read().decode('utf-8', errors='replace')
    if output:
        print(output[-2000:] if len(output) > 2000 else output)
    if error and 'npm WARN' not in error and 'deprecated' not in error.lower() and 'EBADENGINE' not in error:
        print_red(error[-500:] if len(error) > 500 else error)
    return stdout.channel.recv_exit_status() == 0

def main():
    print_green("=" * 60)
    print_green("Sanliurfa.com - Duzeltme ve Build")
    print_green("=" * 60)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, timeout=30)
    print_green("✅ Sunucuya baglanildi!")

    # 1. Dogru .env dosyasini yukle
    print_green("\n[1/4] .env dosyasi duzeltiliyor...")
    env_content = open(os.path.join(LOCAL_DIR, ".env.production")).read()
    # Escape heredocs for safe transfer
    stdin, stdout, stderr = ssh.exec_command(f"cat > {REMOTE_DIR}/.env << 'ENVEOF'\n{env_content}\nENVEOF")
    stdout.channel.recv_exit_status()
    print_green("✅ .env guncellendi!")

    # 2. Tum bagimliliklari yukle (dev dahil - build icin gerekli)
    print_green("\n[2/4] Tum bagimliliklar yukleniyor...")
    run_command(ssh, f"cd {REMOTE_DIR} && npm install --legacy-peer-deps", timeout=300)

    # 3. Build
    print_green("\n[3/4] Build olusturuluyor...")
    run_command(ssh, f"cd {REMOTE_DIR} && npm run build", timeout=300)

    # 4. PM2 restart
    print_green("\n[4/4] PM2 yeniden baslatiliyor...")
    run_command(ssh, f"cd {REMOTE_DIR} && pm2 restart sanliurfa")
    
    time.sleep(5)
    print_green("\n🏥 Saglik kontrolu...")
    run_command(ssh, "curl -s http://127.0.0.1:6000/api/health | python3 -m json.tool 2>/dev/null || curl -s http://127.0.0.1:6000/api/health")

    print_green("\n" + "=" * 60)
    print_green("✅ ISLEM TAMAMLANDI!")
    print_green("=" * 60)
    
    ssh.close()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print_red(f"\n❌ Hata: {e}")
