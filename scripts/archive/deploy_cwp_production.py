#!/usr/bin/env python3
"""
CWP (CentOS Web Panel) + Apache + Node.js Production Deployment
Sunucu: 168.119.79.238 (AlmaLinux 8.10 + Node 20)
"""

import paramiko
import sys
import os
import subprocess
import time

# Sunucu bilgileri
HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
REMOTE_PATH = "/home/sanliur/public_html"
APP_NAME = "sanliurfa"
NODE_PORT = 4321

class CWPDeployer:
    def __init__(self):
        self.ssh = None
        self.sftp = None
        self.project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
    def connect(self):
        """SSH bağlantısı kur"""
        print(f"🔌 {HOST}:{PORT} bağlanılıyor...")
        try:
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
            print("✅ SSH bağlantısı başarılı!")
            return True
        except Exception as e:
            print(f"❌ Bağlantı hatası: {e}")
            return False
    
    def check_prerequisites(self):
        """Ön gereksinimleri kontrol et"""
        print("\n📋 Ön Gereksinimler")
        print("-" * 50)
        
        checks = [
            ("node -v", "Node.js"),
            ("npm -v", "NPM"),
            ("python3 --version", "Python"),
            ("which pm2", "PM2"),
            ("which git", "Git"),
        ]
        
        missing = []
        for cmd, label in checks:
            stdin, stdout, stderr = self.ssh.exec_command(cmd)
            output = stdout.read().decode().strip()
            if stdout.channel.recv_exit_status() == 0:
                print(f"  ✅ {label}: {output}")
            else:
                print(f"  ❌ {label}: Kurulu değil")
                missing.append(label)
        
        return missing
    
    def install_pm2(self):
        """PM2 kurulumu"""
        print("\n⚡ PM2 Kurulumu")
        print("-" * 50)
        
        stdin, stdout, stderr = self.ssh.exec_command("npm install -g pm2")
        print(stdout.read().decode())
        
        # PM2 startup ayarı
        stdin, stdout, stderr = self.ssh.exec_command("pm2 startup systemd")
        print(stdout.read().decode())
        
        print("✅ PM2 kuruldu")
    
    def local_build(self):
        """Build sunucuda yapılacak - yerelde sadece kaynak kodları hazırla"""
        print("\n📦 Kaynak Kodları Hazırlanıyor")
        print("-" * 50)
        
        print("ℹ️ Build sunucuda Node.js 20 ile yapılacak")
        print("ℹ️ Yerel Node.js sürümünüz Astro 6.x için uyumsuz olabilir")
        
        # Kaynak dosyaları listesi
        source_files = [
            "src", "public", "astro.config.mjs", "tailwind.config.mjs",
            "package.json", "package-lock.json", "tsconfig.json",
            ".env.production", "tsconfig.json"
        ]
        
        missing = []
        for f in source_files:
            path = os.path.join(self.project_dir, f)
            if not os.path.exists(path):
                missing.append(f)
        
        if missing:
            print(f"⚠️ Eksik dosyalar: {missing}")
        
        print(f"✅ Kaynak kodlar hazır")
        return True
    
    def upload_files(self):
        """Dosyaları sunucuya yükle"""
        print("\n📤 Dosya Yükleme")
        print("-" * 50)
        
        local_dist = os.path.join(self.project_dir, "dist")
        if not os.path.exists(local_dist):
            print(f"❌ Build dizini bulunamadı!")
            return False
        
        # Eski yedek
        print("📂 Eski dosyalar yedekleniyor...")
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        backup_cmd = f"cd {REMOTE_PATH} && tar -czf backup_{timestamp}.tar.gz . --exclude='backup_*.tar.gz' 2>/dev/null; echo 'Yedeklendi'"
        self.ssh.exec_command(backup_cmd)
        
        # public_html'i temizle
        print("🧹 Eski dosyalar temizleniyor...")
        self.ssh.exec_command(f"cd {REMOTE_PATH} && find . -mindepth 1 -not -name 'backup_*.tar.gz' -delete 2>/dev/null; rm -rf *")
        
        # Yeni dosyaları yükle
        print("📤 Yeni dosyalar yükleniyor...")
        total = 0
        uploaded = 0
        
        for root, dirs, files in os.walk(local_dist):
            total += len(files)
        
        for root, dirs, files in os.walk(local_dist):
            # Dizinleri oluştur
            for dir in dirs:
                local_dir = os.path.join(root, dir)
                rel_path = os.path.relpath(local_dir, local_dist)
                remote_dir = f"{REMOTE_PATH}/{rel_path}".replace("\\", "/")
                try:
                    self.sftp.mkdir(remote_dir)
                except:
                    pass
            
            # Dosyaları yükle
            for file in files:
                local_file = os.path.join(root, file)
                rel_path = os.path.relpath(local_file, local_dist)
                remote_file = f"{REMOTE_PATH}/{rel_path}".replace("\\", "/")
                
                self.sftp.put(local_file, remote_file)
                uploaded += 1
                
                if uploaded % 100 == 0 or uploaded == total:
                    print(f"  {uploaded}/{total} dosya...")
        
        print(f"✅ {uploaded} dosya yüklendi!")
        return True
    
    def upload_dependencies(self):
        """package.json ve bağımlılıkları yükle"""
        print("\n📦 package.json ve Bağımlılıklar")
        print("-" * 50)
        
        files = ["package.json", "package-lock.json"]
        for f in files:
            local = os.path.join(self.project_dir, f)
            if os.path.exists(local):
                remote = f"{REMOTE_PATH}/{f}"
                self.sftp.put(local, remote)
                print(f"  ✅ {f}")
        
        # .env dosyası
        env_files = [".env.production", ".env"]
        for env in env_files:
            env_path = os.path.join(self.project_dir, env)
            if os.path.exists(env_path):
                self.sftp.put(env_path, f"{REMOTE_PATH}/.env")
                print(f"  ✅ {env} → .env")
                break
        
        # Sunucuda npm install
        print("\n📦 npm install çalıştırılıyor (sunucuda)...")
        stdin, stdout, stderr = self.ssh.exec_command(f"cd {REMOTE_PATH} && npm ci --production --legacy-peer-deps")
        
        # Real-time output
        while True:
            line = stdout.readline()
            if not line:
                break
            if "added" in line or "packages" in line:
                print(f"  {line.strip()}")
        
        print("✅ Bağımlılıklar kuruldu")
    
    def start_application(self):
        """Uygulamayı PM2 ile başlat"""
        print("\n🚀 Uygulama Başlatılıyor")
        print("-" * 50)
        
        # Önceki process'i durdur
        self.ssh.exec_command(f"pm2 delete {APP_NAME} 2>/dev/null")
        time.sleep(1)
        
        # Yeni process başlat
        entry_file = f"{REMOTE_PATH}/dist/server/entry.mjs"
        cmd = f"cd {REMOTE_PATH} && pm2 start {entry_file} --name '{APP_NAME}' -- --port {NODE_PORT}"
        
        stdin, stdout, stderr = self.ssh.exec_command(cmd)
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        if output:
            print(output)
        if error and "error" not in error.lower():
            print(error)
        
        # PM2 kaydet
        self.ssh.exec_command("pm2 save")
        
        # Kontrol
        time.sleep(2)
        stdin, stdout, stderr = self.ssh.exec_command(f"pm2 list | grep {APP_NAME}")
        result = stdout.read().decode().strip()
        
        if result and "online" in result.lower():
            print(f"✅ Uygulama çalışıyor: {result}")
            return True
        else:
            print(f"⚠️ Uygulama durumu kontrol edilmeli: {result}")
            return False
    
    def configure_cwp_apache(self):
        """CWP Apache yapılandırması talimatları"""
        print("\n🌐 CWP Apache Yapılandırması")
        print("=" * 50)
        print("""
📋 CWP Panel'de şu adımları takip et:

1️⃣  CWP Panel'e giriş:
    URL: https://168.119.79.238:2083
    Kullanıcı: sanliur
    Şifre: (SSH şifren)

2️⃣  Sol Menü → Webserver Settings → Webserver Domain Conf

3️⃣  Ayarlar:
    • Username: sanliur
    • Domain: senin-domainin.com (veya server.elginoz.com)
    • Configuration: Apache → Proxy → Custom Port ⭐
    • Port: 3000
    • IP: 127.0.0.1
    • ✅ Rebuild webserver conf for domain on save (işaretle)

4️⃣  Save Changes

5️⃣  Apache Restart:
    Service Management → Apache → Restart

""")
        
        # Manuel vhost düzenleme (opsiyonel)
        print("""
📝 ALTERNATİF: Manuel vhost düzenleme

CWP Panel → Webserver Settings → Webservers Conf Editor

Dosya: /etc/nginx/conf.d/vhosts/senin-domainin.conf

Aşağıdaki satırları ekle:

ProxyPass / http://127.0.0.1:4321/
ProxyPassReverse / http://127.0.0.1:4321/

RewriteEngine On
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:4321/$1" [P,L]
""")
    
    def verify_deployment(self):
        """Deployment doğrulama"""
        print("\n✅ Doğrulama")
        print("-" * 50)
        
        # PM2 durumu
        stdin, stdout, stderr = self.ssh.exec_command("pm2 list")
        print("📊 PM2 Durumu:")
        for line in stdout.read().decode().split('\n')[:10]:
            if line.strip():
                print(f"  {line}")
        
        # Uygulama yanıt veriyor mu
        stdin, stdout, stderr = self.ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{NODE_PORT}/")
        status = stdout.read().decode().strip()
        
        if status == "200":
            print(f"\n✅ Uygulama çalışıyor (HTTP {status})")
            
            # İçerik kontrolü
            stdin, stdout, stderr = self.ssh.exec_command(f"curl -s http://127.0.0.1:{NODE_PORT}/ | head -20")
            content = stdout.read().decode()
            if "Sanliurfa" in content or "HTML" in content:
                print("✅ İçerik doğru geliyor!")
        else:
            print(f"\n⚠️ Uygulama yanıt vermiyor (HTTP {status})")
            print("📝 Loglar kontrol ediliyor...")
            stdin, stdout, stderr = self.ssh.exec_command(f"pm2 logs {APP_NAME} --lines 20")
            print(stdout.read().decode())
    
    def close(self):
        """Bağlantıyı kapat"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("\n🔒 Bağlantı kapatıldı")


def main():
    print("🚀 CWP Production Deployment")
    print("=" * 60)
    print(f"Sunucu: {HOST}:{PORT}")
    print(f"Kullanıcı: {USERNAME}")
    print(f"Uygulama: {APP_NAME}")
    print(f"Port: {NODE_PORT}")
    print("=" * 60)
    
    deployer = CWPDeployer()
    
    # Bağlan
    if not deployer.connect():
        sys.exit(1)
    
    # Ön kontrol
    missing = deployer.check_prerequisites()
    if "PM2" in missing:
        deployer.install_pm2()
    
    # Build
    if not deployer.local_build():
        deployer.close()
        sys.exit(1)
    
    # Upload
    if not deployer.upload_files():
        deployer.close()
        sys.exit(1)
    
    # Dependencies
    deployer.upload_dependencies()
    
    # Start
    deployer.start_application()
    
    # CWP yapılandırma talimatları
    deployer.configure_cwp_apache()
    
    # Doğrulama
    deployer.verify_deployment()
    
    deployer.close()
    
    print("\n" + "=" * 60)
    print("🎉 DEPLOYMENT TAMAMLANDI!")
    print("=" * 60)
    print(f"""
📋 SONRAKİ ADIMLAR:

1️⃣  CWP Panel'den Apache yapılandırmasını tamamla
    https://{HOST}:2083

2️⃣  Domain DNS ayarlarını yap:
    A kaydı: senin-domainin.com → {HOST}

3️⃣  SSL sertifikası kur:
    CWP → SSL Certificates → AutoSSL

4️⃣  Kontrol et:
    http://{HOST}
    http://server.elginoz.com

🔧 Yönetim Komutları:
   pm2 list                    # Durum gör
   pm2 logs {APP_NAME}         # Logları izle
   pm2 restart {APP_NAME}      # Yeniden başlat
   pm2 stop {APP_NAME}         # Durdur

""")


if __name__ == "__main__":
    main()
