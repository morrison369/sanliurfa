#!/usr/bin/env python3
"""Sistem Denetimi - Eksiklikleri Belirle"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🔍 SİSTEM DENETİMİ")
print("=" * 70)

items = []

# 1. Site erişim
print("\n1️⃣ Site Erişim:")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' https://sanliurfa.com/ 2>&1 || curl -m 5 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:6000/")
code = stdout.read().decode().strip()
if code == "200":
    print("   ✅ Site çalışıyor (HTTP 200)")
    items.append(("✅", "Site", "Çalışıyor"))
else:
    print(f"   ⚠️ HTTP {code}")
    items.append(("⚠️", "Site", f"HTTP {code}"))

# 2. React Integration
print("\n2️⃣ React Integration:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/astro.config.mjs | grep -i react")
if stdout.read().decode().strip():
    print("   ✅ React integration mevcut")
    items.append(("✅", "React", "Mevcut"))
else:
    print("   ❌ React integration EKSİK!")
    items.append(("❌", "React", "Eksik - Hata riski"))

# 3. Loglama
print("\n3️⃣ Log Rotation:")
stdin, stdout, stderr = ssh.exec_command("ls /etc/logrotate.d/ | grep -E 'sanliurfa|pm2' || echo 'yok'")
if "yok" not in stdout.read().decode():
    print("   ✅ Log rotation ayarlı")
    items.append(("✅", "Log Rotation", "Ayarlı"))
else:
    print("   ❌ Log rotation YOK (disk dolabilir!)")
    items.append(("❌", "Log Rotation", "Eksik"))

# 4. Backup
print("\n4️⃣ Otomatik Yedekleme:")
stdin, stdout, stderr = ssh.exec_command("crontab -l 2>/dev/null | grep -E 'backup|postgres|sanliurfa' || echo 'yok'")
if "yok" not in stdout.read().decode():
    print("   ✅ Yedekleme ayarlı")
    items.append(("✅", "Backup", "Ayarlı"))
else:
    print("   ❌ Otomatik yedekleme YOK!")
    items.append(("❌", "Backup", "Eksik"))

# 5. Güvenlik (fail2ban)
print("\n5️⃣ Fail2Ban (Brute Force Koruması):")
stdin, stdout, stderr = ssh.exec_command("systemctl is-active fail2ban 2>/dev/null || echo 'inactive'")
if "active" in stdout.read().decode():
    print("   ✅ Fail2Ban aktif")
    items.append(("✅", "Fail2Ban", "Aktif"))
else:
    print("   ❌ Fail2Ban KAPALI!")
    items.append(("❌", "Fail2Ban", "Eksik"))

# 6. E-posta
print("\n6️⃣ E-posta Gönderimi:")
stdin, stdout, stderr = ssh.exec_command("which sendmail postfix mail 2>/dev/null | head -1 || echo 'yok'")
if "yok" not in stdout.read().decode():
    print("   ✅ Mail servisi mevcut")
    items.append(("✅", "Mail", "Mevcut"))
else:
    print("   ⚠️ Mail servisi yok (Reset password çalışmaz)")
    items.append(("⚠️", "Mail", "Eksik"))

# 7. Redis (Cache)
print("\n7️⃣ Redis (Önbellek):")
stdin, stdout, stderr = ssh.exec_command("systemctl is-active redis 2>/dev/null || echo 'inactive'")
if "active" in stdout.read().decode():
    print("   ✅ Redis aktif")
    items.append(("✅", "Redis", "Aktif"))
else:
    print("   ⚠️ Redis KAPALI (Cache için önerilir)")
    items.append(("⚠️", "Redis", "Önerilir"))

# 8. Disk kullanımı
print("\n8️⃣ Disk Kullanımı:")
stdin, stdout, stderr = ssh.exec_command("df -h /home | tail -1 | awk '{print $5}'")
usage = stdout.read().decode().strip()
print(f"   📊 {usage} kullanımda")
if int(usage.replace('%', '')) > 80:
    items.append(("⚠️", "Disk", f"{usage} - Temizlik gerekli"))
else:
    items.append(("✅", "Disk", f"{usage} - Normal"))

# 9. SSL Sertifika süresi
print("\n9️⃣ SSL Sertifika:")
stdin, stdout, stderr = ssh.exec_command("echo | openssl s_client -servername sanliurfa.com -connect sanliurfa.com:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter || echo 'Cloudflare SSL'")
ssl_date = stdout.read().decode().strip()
if "Cloudflare" in ssl_date:
    print("   ✅ Cloudflare SSL (Otomatik yenilenir)")
    items.append(("✅", "SSL", "Cloudflare Auto"))
else:
    print(f"   📅 {ssl_date}")
    items.append(("✅", "SSL", "Mevcut"))

# 10. Monitoring
print("\n🔟 Monitoring:")
stdin, stdout, stderr = ssh.exec_command("which uptime-monitor statuspage || echo 'yok'")
if "yok" not in stdout.read().decode():
    print("   ✅ Monitoring aktif")
    items.append(("✅", "Monitoring", "Aktif"))
else:
    print("   ⚠️ Monitoring yok (Site down olduğunda haberiniz olmaz)")
    items.append(("⚠️", "Monitoring", "Önerilir"))

ssh.close()

print("\n" + "=" * 70)
print("📋 ÖZET")
print("=" * 70)

for status, item, detail in items:
    print(f"{status} {item:20} {detail}")

print("\n" + "=" * 70)
print("🎯 SIRADAKİ İŞLEMLER")
print("=" * 70)

print("""
ÖNERİLEN SIRALAMA:

Kritik (Yapılması Gerekli):
  ❌ 1. React Integration - astro.config.mjs'e ekle
  ❌ 2. Log Rotation - Disk dolmasını önler
  ❌ 3. Otomatik Yedekleme - Veri kaybını önler
  ❌ 4. Fail2Ban - Güvenlik için gerekli

Önemli (Önerilir):
  ⚠️ 5. Redis Cache - Performans için
  ⚠️ 6. E-posta Servisi - Şifre reset için
  ⚠️ 7. Monitoring - Site takibi için

Hangi işlemleri yapalım?
""")
