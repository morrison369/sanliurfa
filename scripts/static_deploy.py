#!/usr/bin/env python3
"""
CWP Static Export Deployment Script
Node.js gerektirmez - Astro static export kullanır
"""

import paramiko
import sys
import os
import shutil
import subprocess

# Sunucu bilgileri
HOST = "176.9.138.254"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"
LOCAL_BUILD_DIR = "dist"

class StaticDeployer:
    def __init__(self):
        self.ssh = None
        self.sftp = None
        self.connected = False
        
    def connect(self):
        """SSH bağlantısı kur"""
        try:
            print(f"🔌 {HOST}:{PORT} bağlanılıyor...")
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                hostname=HOST,
                port=PORT,
                username=USERNAME,
                password=PASSWORD,
                timeout=30,
                allow_agent=False,
                look_for_keys=False
            )
            self.sftp = self.ssh.open_sftp()
            self.connected = True
            print("✅ Bağlantı başarılı!")
            return True
        except Exception as e:
            print(f"❌ Bağlantı hatası: {e}")
            return False
    
    def local_build(self):
        """Yerel build al"""
        print("\n🔨 Yerel Build İşlemi")
        print("=" * 50)
        
        # Mevcut astro.config.mjs'i yedekle
        if os.path.exists("astro.config.mjs"):
            print("📦 astro.config.mjs yedekleniyor...")
            shutil.copy("astro.config.mjs", "astro.config.mjs.backup")
        
        # Static config kullan
        print("📦 Static export yapılandırması uygulanıyor...")
        shutil.copy("astro.config.static.mjs", "astro.config.mjs")
        
        # Build al
        print("🔨 Build başlatılıyor (bu biraz zaman alabilir)...")
        try:
            result = subprocess.run(
                ["npm", "run", "build"],
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            
            if result.returncode != 0:
                print(f"❌ Build hatası:")
                print(result.stderr)
                return False
            
            print("✅ Build başarılı!")
            
            # Build boyutunu göster
            build_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
            if os.path.exists(build_path):
                total_size = 0
                for dirpath, dirnames, filenames in os.walk(build_path):
                    for f in filenames:
                        fp = os.path.join(dirpath, f)
                        total_size += os.path.getsize(fp)
                print(f"📦 Build boyutu: {total_size / 1024 / 1024:.2f} MB")
            
            return True
            
        except Exception as e:
            print(f"❌ Build hatası: {e}")
            return False
        finally:
            # Yedekten geri yükle
            if os.path.exists("astro.config.mjs.backup"):
                print("📦 Orijinal yapılandırma geri yükleniyor...")
                shutil.copy("astro.config.mjs.backup", "astro.config.mjs")
                os.remove("astro.config.mjs.backup")
    
    def upload_files(self):
        """Dosyaları sunucuya yükle"""
        print("\n📤 Dosya Yükleme")
        print("=" * 50)
        
        if not self.connected:
            print("❗ Önce bağlantı kurulmalı")
            return False
        
        local_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist")
        
        if not os.path.exists(local_dist):
            print(f"❌ Build dizini bulunamadı: {local_dist}")
            return False
        
        # Sunucudaki eski dosyaları yedekle
        print("📂 Eski dosyalar yedekleniyor...")
        backup_cmd = f"cd {REMOTE_PATH} && tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz . --exclude='backup_*.tar.gz' 2>/dev/null || echo 'Yedekleme tamamlandı'"
        self.ssh.exec_command(backup_cmd)
        
        # public_html'i temizle (yedekler hariç)
        print("🧹 Eski dosyalar temizleniyor...")
        clean_cmd = f"cd {REMOTE_PATH} && find . -mindepth 1 -not -name 'backup_*.tar.gz' -delete 2>/dev/null || rm -rf *"
        self.ssh.exec_command(clean_cmd)
        
        # Yeni dosyaları yükle
        print("📤 Yeni dosyalar yükleniyor...")
        total_files = 0
        uploaded_files = 0
        
        for root, dirs, files in os.walk(local_dist):
            for file in files:
                total_files += 1
        
        for root, dirs, files in os.walk(local_dist):
            # Dizinleri oluştur
            for dir in dirs:
                local_dir = os.path.join(root, dir)
                rel_path = os.path.relpath(local_dir, local_dist)
                remote_dir = f"{REMOTE_PATH}/{rel_path}".replace("\\", "/")
                try:
                    self.sftp.mkdir(remote_dir)
                except:
                    pass  # Dizin zaten var
            
            # Dosyaları yükle
            for file in files:
                local_file = os.path.join(root, file)
                rel_path = os.path.relpath(local_file, local_dist)
                remote_file = f"{REMOTE_PATH}/{rel_path}".replace("\\", "/")
                
                try:
                    self.sftp.put(local_file, remote_file)
                    uploaded_files += 1
                    if uploaded_files % 50 == 0:
                        print(f"  📄 {uploaded_files}/{total_files} dosya yüklendi...")
                except Exception as e:
                    print(f"  ⚠️ Hata ({rel_path}): {e}")
        
        print(f"✅ {uploaded_files} dosya yüklendi!")
        return True
    
    def set_permissions(self):
        """Dosya izinlerini ayarla"""
        print("\n🔒 Dosya İzinleri")
        print("=" * 50)
        
        commands = [
            (f"chown -R {USERNAME}:{USERNAME} {REMOTE_PATH}", "Dosya sahipliği"),
            (f"chmod -R 755 {REMOTE_PATH}", "Dosya izinleri"),
            (f"find {REMOTE_PATH} -type f -name '*.html' -exec chmod 644 {{}} \\;", "HTML izinleri"),
        ]
        
        for cmd, desc in commands:
            print(f"  🔄 {desc}...")
            self.ssh.exec_command(cmd)
        
        print("✅ İzinler ayarlandı")
    
    def verify_deployment(self):
        """Deployment'ı doğrula"""
        print("\n✅ Deployment Doğrulama")
        print("=" * 50)
        
        # Dosyaları listele
        stdin, stdout, stderr = self.ssh.exec_command(f"ls -la {REMOTE_PATH}")
        output = stdout.read().decode()
        print("📂 public_html içeriği:")
        for line in output.split('\n')[:15]:
            if line.strip():
                print(f"  {line}")
        
        # index.html kontrolü
        stdin, stdout, stderr = self.ssh.exec_command(f"ls -la {REMOTE_PATH}/index.html")
        if stdout.channel.recv_exit_status() == 0:
            print("\n✅ index.html bulundu!")
        else:
            print("\n⚠️ index.html bulunamadı!")
        
        # Apache erişim logu kontrolü
        print("\n🌐 Site erişim testi (curl):")
        stdin, stdout, stderr = self.ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/")
        status = stdout.read().decode().strip()
        if status == "200":
            print(f"  ✅ HTTP {status} - Site erişilebilir!")
        else:
            print(f"  ⚠️ HTTP {status} - Kontrol gerekebilir")
    
    def close(self):
        """Bağlantıyı kapat"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("\n🔒 Bağlantı kapatıldı")


def main():
    print("🚀 CWP Static Export Deployment")
    print("=" * 50)
    print()
    print("📋 Bu script:")
    print("  1. Astro'yu static export modunda build eder")
    print("  2. Dosyaları sunucunun public_html dizinine yükler")
    print("  3. Dosya izinlerini ayarlar")
    print()
    print("⚠️ NOT: Node.js kurulu olmasına gerek yok!")
    print()
    
    deployer = StaticDeployer()
    
    # Adım 1: Bağlantı
    if not deployer.connect():
        sys.exit(1)
    
    # Adım 2: Build
    if not deployer.local_build():
        deployer.close()
        sys.exit(1)
    
    # Adım 3: Upload
    if not deployer.upload_files():
        deployer.close()
        sys.exit(1)
    
    # Adım 4: İzinler
    deployer.set_permissions()
    
    # Adım 5: Doğrulama
    deployer.verify_deployment()
    
    deployer.close()
    
    print("\n" + "=" * 50)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 50)
    print()
    print("🌐 Site adresleri:")
    print("  http://176.9.138.254")
    print("  http://cwp.elginoz.com")
    print("  https://senin-domainin.com (varsa)")
    print()
    print("🔧 CWP Panel: https://176.9.138.254:2083")
    print()
    print("📊 Kontrol için:")
    print("  python scripts/cwp_check.py")


if __name__ == "__main__":
    main()
