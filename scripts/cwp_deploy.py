#!/usr/bin/env python3
"""
CWP (CentOS Web Panel) Deployment Script
Paramiko ile SSH bağlantısı ve Node.js kurulumu
"""

import paramiko
import sys
import time
import os

# Sunucu bilgileri
HOST = "176.9.138.254"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

class CWPDeployer:
    def __init__(self, host, port, username, password):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.ssh = None
        self.sftp = None
        
    def connect(self):
        """SSH bağlantısı kur"""
        try:
            print(f"🔌 {self.host}:{self.port} adresine bağlanılıyor...")
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=30,
                allow_agent=False,
                look_for_keys=False
            )
            self.sftp = self.ssh.open_sftp()
            print("✅ SSH bağlantısı başarılı!")
            return True
        except Exception as e:
            print(f"❌ Bağlantı hatası: {e}")
            return False
    
    def run_command(self, command, sudo=False):
        """SSH üzerinden komut çalıştır"""
        try:
            if sudo and self.username != 'root':
                command = f"echo '{self.password}' | sudo -S {command}"
            
            print(f"⚡ Çalıştırılıyor: {command[:80]}...")
            stdin, stdout, stderr = self.ssh.exec_command(command)
            
            # Şifre sorulursa otomatik gönder
            if sudo:
                stdin.write(self.password + '\n')
                stdin.flush()
            
            exit_code = stdout.channel.recv_exit_status()
            output = stdout.read().decode('utf-8', errors='ignore').strip()
            error = stderr.read().decode('utf-8', errors='ignore').strip()
            
            if output:
                print(f"📤 Çıktı:\n{output}")
            if error and exit_code != 0:
                print(f"⚠️ Hata:\n{error}")
                
            return exit_code == 0, output, error
        except Exception as e:
            print(f"❌ Komut hatası: {e}")
            return False, "", str(e)
    
    def check_system(self):
        """Sistem bilgilerini kontrol et"""
        print("\n🔍 Sistem Kontrolü")
        print("=" * 50)
        
        checks = [
            ("whoami", "Kullanıcı"),
            ("pwd", "Mevcut Dizin"),
            ("node -v 2>/dev/null || echo 'Node.js kurulu değil'", "Node.js Versiyonu"),
            ("npm -v 2>/dev/null || echo 'NPM kurulu değil'", "NPM Versiyonu"),
            ("which httpd apachectl 2>/dev/null || echo 'Apache bulunamadı'", "Apache"),
            ("which nginx 2>/dev/null || echo 'Nginx bulunamadı'", "Nginx"),
            ("cat /etc/os-release | grep PRETTY_NAME", "İşletim Sistemi"),
            ("free -h 2>/dev/null || cat /proc/meminfo | head -5", "Bellek Durumu"),
            ("df -h /home", "Disk Durumu"),
        ]
        
        results = {}
        for cmd, label in checks:
            success, output, error = self.run_command(cmd)
            results[label] = output or error
            print(f"  {label}: {output or error}")
            
        return results
    
    def check_cwp(self):
        """CWP panel durumunu kontrol et"""
        print("\n🎛️ CWP Panel Kontrolü")
        print("=" * 50)
        
        checks = [
            ("ls -la /usr/local/cwpsrv/ 2>/dev/null | head -5 || echo 'CWP bulunamadı'", "CWP Kurulumu"),
            ("systemctl status cwpsrv 2>/dev/null | head -3 || service cwpsrv status 2>/dev/null | head -3 || echo 'CWP servisi bulunamadı'", "CWP Servisi"),
            ("ls -la /home/ | head -10", "Kullanıcı Dizinleri"),
            ("cat /etc/passwd | grep sanliur", "Kullanıcı Bilgisi"),
        ]
        
        for cmd, label in checks:
            success, output, error = self.run_command(cmd)
            print(f"  {label}:")
            for line in (output or error).split('\n')[:5]:
                print(f"    {line}")
    
    def install_nodejs(self):
        """Node.js kurulumu (root gerekir)"""
        print("\n📦 Node.js Kurulumu")
        print("=" * 50)
        
        # Önce node durumunu kontrol et
        success, output, _ = self.run_command("node -v")
        if success and output.startswith('v'):
            print(f"✅ Node.js zaten kurulu: {output}")
            return True
        
        print("⚠️ Node.js kurulu değil. Kurulum deneniyor...")
        print("📝 NOT: Root erişimi gerekli! Sudo şifreniz istenecek.")
        
        commands = [
            ("curl -sL https://rpm.nodesource.com/setup_22.x | bash -", "NodeSource repo ekleme"),
            ("yum install -y nodejs", "Node.js kurulumu"),
            ("node -v && npm -v", "Versiyon kontrolü"),
        ]
        
        for cmd, desc in commands:
            print(f"\n🔄 {desc}...")
            success, output, error = self.run_command(cmd, sudo=True)
            if not success:
                print(f"❌ {desc} başarısız!")
                print(f"Hata: {error}")
                return False
            print(f"✅ {desc} tamamlandı")
            
        return True
    
    def check_webserver_config(self):
        """Webserver yapılandırmasını kontrol et"""
        print("\n🌐 Webserver Yapılandırması")
        print("=" * 50)
        
        # Apache vhost dosyalarını kontrol et
        vhost_paths = [
            "/etc/apache2/conf.d/vhosts/",
            "/etc/httpd/conf.d/",
            "/usr/local/apache/conf/",
        ]
        
        for path in vhost_paths:
            success, output, _ = self.run_command(f"ls -la {path} 2>/dev/null")
            if success:
                print(f"✅ VHost dizini bulundu: {path}")
                print(f"   Dosyalar: {output}")
                break
        else:
            print("⚠️ VHost dizini bulunamadı")
    
    def upload_files(self, local_path, remote_path):
        """Dosya yükleme"""
        print(f"\n📤 Dosya Yükleme: {local_path} -> {remote_path}")
        try:
            if os.path.isdir(local_path):
                self._upload_directory(local_path, remote_path)
            else:
                self.sftp.put(local_path, remote_path)
            print("✅ Yükleme tamamlandı")
            return True
        except Exception as e:
            print(f"❌ Yükleme hatası: {e}")
            return False
    
    def _upload_directory(self, local_dir, remote_dir):
        """Dizin yükleme (recursive)"""
        try:
            self.sftp.mkdir(remote_dir)
        except:
            pass  # Dizin zaten var
            
        for item in os.listdir(local_dir):
            local_path = os.path.join(local_dir, item)
            remote_path = f"{remote_dir}/{item}"
            
            if os.path.isdir(local_path):
                self._upload_directory(local_path, remote_path)
            else:
                print(f"  📄 {item}")
                self.sftp.put(local_path, remote_path)
    
    def close(self):
        """Bağlantıyı kapat"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("\n🔒 Bağlantı kapatıldı")


def main():
    print("🚀 CWP Node.js Deployment Aracı")
    print("=" * 50)
    
    deployer = CWPDeployer(HOST, PORT, USERNAME, PASSWORD)
    
    # Bağlan
    if not deployer.connect():
        print("\n❌ SSH bağlantısı kurulamadı!")
        print("Lütfen şunları kontrol edin:")
        print("  1. Sunucu IP adresi doğru mu?")
        print("  2. SSH portu (77) doğru mu?")
        print("  3. Kullanıcı adı ve şifre doğru mu?")
        print("  4. Sunucu ayakta mı?")
        sys.exit(1)
    
    # Menü
    while True:
        print("\n📋 Menü:")
        print("  1. Sistem Kontrolü")
        print("  2. CWP Panel Kontrolü")
        print("  3. Node.js Kurulumu")
        print("  4. Webserver Yapılandırması")
        print("  5. Manuel Komut Çalıştır")
        print("  0. Çıkış")
        
        choice = input("\nSeçiminiz: ").strip()
        
        if choice == "1":
            deployer.check_system()
        elif choice == "2":
            deployer.check_cwp()
        elif choice == "3":
            deployer.install_nodejs()
        elif choice == "4":
            deployer.check_webserver_config()
        elif choice == "5":
            cmd = input("Komut: ")
            deployer.run_command(cmd, sudo=input("Sudo? (e/h): ").lower() == 'e')
        elif choice == "0":
            break
        else:
            print("Geçersiz seçim!")
    
    deployer.close()
    print("\n👋 Güle güle!")


if __name__ == "__main__":
    main()
