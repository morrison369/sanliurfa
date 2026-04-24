#!/usr/bin/env python3
"""NVM ile Node 22.12.0 kurulumu (sudo gerektirmez)"""

import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    print("🔧 NVM + Node 22.12.0 Kurulumu")
    print("=" * 60)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                allow_agent=False, look_for_keys=False)
    
    # Mevcut durum
    print("\n📋 Mevcut Node:")
    stdin, stdout, stderr = ssh.exec_command("node -v")
    print("  ", stdout.read().decode().strip())
    
    # NVM kontrolü
    print("\n📋 NVM kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("source ~/.nvm/nvm.sh 2>/dev/null && nvm --version")
    nvm_version = stdout.read().decode().strip()
    
    if nvm_version and "." in nvm_version:
        print(f"✅ NVM kurulu: {nvm_version}")
    else:
        print("⬇️ NVM kuruluyor...")
        cmd = 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash'
        stdin, stdout, stderr = ssh.exec_command(cmd)
        time.sleep(10)
        print("✅ NVM kuruldu")
    
    # .bashrc'e NVM ekle (eğer yoksa)
    print("\n⚙️ .bashrc yapılandırması...")
    stdin, stdout, stderr = ssh.exec_command("grep 'NVM_DIR' ~/.bashrc")
    if not stdout.read().decode().strip():
        bashrc_add = '''
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
'''
        ssh.exec_command(f'echo "{bashrc_add}" >> ~/.bashrc')
        print("✅ .bashrc güncellendi")
    else:
        print("✅ .bashrc zaten yapılandırılmış")
    
    # Node 22 kur
    print("\n⬇️ Node.js 22.12.0 kuruluyor (bu 2-3 dakika sürebilir)...")
    cmd = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install 22.12.0'
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=300)
    
    # Real-time output
    start = time.time()
    while not stdout.channel.exit_status_ready():
        if time.time() - start > 10:
            print("  ⏳ Kurulum devam ediyor...")
            start = time.time()
        time.sleep(1)
    
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if "v22.12.0" in output:
        print("✅ Node 22.12.0 kuruldu!")
    else:
        print("Çıktı:", output[-500:])
        if error:
            print("Hata:", error[-300:])
    
    # Varsayılan yap
    print("\n⚙️ Node 22 varsayılan yapılıyor...")
    cmd = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm alias default 22.12.0'
    ssh.exec_command(cmd)
    time.sleep(2)
    
    # Kontrol
    print("\n✅ Son Kontrol:")
    cmd = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && node -v && npm -v'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    result = stdout.read().decode()
    print(result)
    
    if "v22.12.0" in result:
        print("\n🎉 BAŞARILI! Node.js 22.12.0 kuruldu!")
        print("\n📋 Kullanım:")
        print("  source ~/.nvm/nvm.sh && node -v")
        print("  veya yeni SSH oturumu aç")
    else:
        print("\n⚠️ Bir sorun oluştu, tekrar deneyin")
    
    ssh.close()

if __name__ == "__main__":
    main()
