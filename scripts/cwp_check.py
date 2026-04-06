#!/usr/bin/env python3
"""
CWP Sunucu Kontrol Scripti - Otomatik Mod
"""

import paramiko
import sys

# Sunucu bilgileri
HOST = "176.9.138.254"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    print("🚀 CWP Sunucu Kontrolü")
    print("=" * 50)
    
    # SSH Bağlantısı
    print(f"\n🔌 {HOST}:{PORT} adresine bağlanılıyor...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=HOST,
            port=PORT,
            username=USERNAME,
            password=PASSWORD,
            timeout=30,
            allow_agent=False,
            look_for_keys=False
        )
        print("✅ SSH bağlantısı başarılı!\n")
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        sys.exit(1)
    
    # Sistem kontrolleri
    checks = [
        ("whoami", "👤 Kullanıcı"),
        ("pwd", "📂 Mevcut Dizin"),
        ("hostname", "🖥️ Hostname"),
        ("cat /etc/os-release | grep PRETTY_NAME | cut -d'\"' -f2", "💿 İşletim Sistemi"),
        ("uname -r", "🔧 Kernel"),
        ("node -v 2>/dev/null || echo 'KURULU_DEĞIL'", "📦 Node.js"),
        ("npm -v 2>/dev/null || echo 'KURULU_DEĞIL'", "📦 NPM"),
        ("npx -v 2>/dev/null || echo 'KURULU_DEĞIL'", "📦 NPX"),
        ("which pm2 2>/dev/null || echo 'KURULU_DEĞIL'", "⚡ PM2"),
        ("which python3 python 2>/dev/null | head -1", "🐍 Python"),
        ("ls /usr/local/cwpsrv/ >/dev/null 2>&1 && echo 'CWP_BULUNDU' || echo 'CWP_BULUNAMADI'", "🎛️ CWP Panel"),
        ("systemctl is-active httpd apache2 2>/dev/null | head -1 || service httpd status 2>&1 | head -1", "🌐 Apache Durumu"),
        ("which nginx 2>/dev/null && echo 'BULUNDU' || echo 'BULUNAMADI'", "🌐 Nginx"),
        ("free -h 2>/dev/null | grep Mem || cat /proc/meminfo | grep MemTotal", "💾 Bellek"),
        ("df -h /home 2>/dev/null | tail -1", "💾 Disk (/home)"),
        ("cat /etc/passwd | grep ^sanliur", "🔑 Kullanıcı Kaydı"),
        ("ls -la /home/sanliur/ 2>/dev/null | head -10", "📁 Ana Dizin İçeriği"),
    ]
    
    print("📋 Sistem Bilgileri:")
    print("-" * 50)
    
    results = {}
    for cmd, label in checks:
        try:
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
            output = stdout.read().decode('utf-8', errors='ignore').strip()
            error = stderr.read().decode('utf-8', errors='ignore').strip()
            
            result = output or error or "BOŞ"
            results[label] = result
            
            # Özel formatlama
            if result == "KURULU_DEĞIL":
                print(f"  {label}: ❌ Kurulu değil")
            elif result == "CWP_BULUNDU":
                print(f"  {label}: ✅ Kurulu")
            elif result == "CWP_BULUNAMADI":
                print(f"  {label}: ❌ Bulunamadı")
            elif "MemTotal" in result:
                print(f"  {label}: {result}")
            else:
                print(f"  {label}: {result}")
                
        except Exception as e:
            print(f"  {label}: ⚠️ Hata - {e}")
    
    # Port kontrolü
    print("\n🔌 Port Durumu:")
    print("-" * 50)
    port_checks = [
        ("netstat -tlnp 2>/dev/null | grep ':80 ' || ss -tlnp | grep ':80 '", "HTTP (80)"),
        ("netstat -tlnp 2>/dev/null | grep ':443 ' || ss -tlnp | grep ':443 '", "HTTPS (443)"),
        ("netstat -tlnp 2>/dev/null | grep ':2083 ' || ss -tlnp | grep ':2083 '", "CWP Panel (2083)"),
        ("netstat -tlnp 2>/dev/null | grep ':3000 ' || ss -tlnp | grep ':3000 '", "Node.js (3000)"),
    ]
    
    for cmd, label in port_checks:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode().strip()
        if output:
            print(f"  {label}: ✅ Açık - {output[:50]}")
        else:
            print(f"  {label}: ⚪ Kapalı/Dinlenmiyor")
    
    # Apache yapılandırması
    print("\n🌐 Apache Yapılandırması:")
    print("-" * 50)
    apache_checks = [
        ("httpd -v 2>/dev/null | head -1 || apachectl -v 2>/dev/null | head -1", "Versiyon"),
        ("httpd -M 2>/dev/null | grep -i proxy || apachectl -M 2>/dev/null | grep -i proxy || echo 'mod_proxy durumu kontrol edilemedi'", "Proxy Modülleri"),
    ]
    
    for cmd, label in apache_checks:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        output = stdout.read().decode().strip()
        error = stderr.read().decode().strip()
        if output:
            for line in output.split('\n')[:3]:
                print(f"  {line}")
        elif error:
            print(f"  {label}: ⚠️ {error[:80]}")
    
    # Özet
    print("\n📊 ÖZET")
    print("=" * 50)
    
    node_installed = results.get("📦 Node.js", "").startswith("v")
    cwp_installed = results.get("🎛️ CWP Panel", "") == "Kurulu"
    
    if node_installed:
        print("✅ Node.js kurulu")
    else:
        print("❌ Node.js KURULU DEĞİL - Kurulum gerekli!")
    
    if cwp_installed:
        print("✅ CWP Panel kurulu")
    else:
        print("⚠️ CWP Panel kontrol edilemedi")
    
    # Öneriler
    print("\n💡 ÖNERİLER:")
    print("-" * 50)
    
    if not node_installed:
        print("1. Node.js kurulumu için root erişimi gerekli")
        print("   - Hosting sağlayıcısından Node.js kurulumunu isteyin")
        print("   - VEYA VPS/VDS'ye geçiş yapın")
        print()
        print("2. Alternatif: Statik Export kullanın")
        print("   astro.config.mjs'de 'output: static' yapın")
        print("   sadece HTML/CSS/JS dosyaları oluşur, Node.js gerekmez")
    else:
        print("✅ Node.js kurulu, deployment yapılabilir!")
        print()
        print("Sonraki adımlar:")
        print("1. Uygulamayı build edin: npm run build")
        print("2. Dosyaları sunucuya yükleyin")
        print("3. PM2 veya screen ile başlatın")
    
    ssh.close()
    print("\n🔒 Bağlantı kapatıldı")

if __name__ == "__main__":
    main()
