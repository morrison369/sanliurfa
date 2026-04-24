#!/usr/bin/env python3
"""Mevcut Durum Kontrolü"""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('168.119.79.238', port=77, username='sanliur', password='CHANGE_ME_CWP_SSH_PASSWORD')

print("🔍 MEVCUT DURUM KONTROLÜ")
print("=" * 60)

# Site test
print("\n1️⃣ Site Test:")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -s -o /dev/null -w '%{http_code}' https://sanliurfa.com/")
print(f"   HTTP: {stdout.read().decode().strip()}")

# E-posta SMTP
print("\n2️⃣ E-posta SMTP:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production | grep RESEND_API_KEY")
result = stdout.read().decode().strip()
if 're_' in result:
    print("   ✅ Resend API key mevcut")
else:
    print("   ❌ Resend API key BOŞ!")

# Google Analytics
print("\n3️⃣ Google Analytics:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production | grep GA_TRACKING_ID")
result = stdout.read().decode().strip()
if 'G-' in result or 'UA-' in result:
    print("   ✅ Analytics ID mevcut")
else:
    print("   ❌ Analytics ID BOŞ!")

# Redis kullanımı
print("\n4️⃣ Redis Cache:")
stdin, stdout, stderr = ssh.exec_command("redis-cli ping 2>/dev/null || echo disconnected")
result = stdout.read().decode().strip()
if result == 'PONG':
    print("   ✅ Redis aktif")
else:
    print("   ⚠️ Redis bağlantısı yok")

# Sitemap
print("\n5️⃣ Sitemap:")
stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/dist/client/sitemap*.xml 2>/dev/null | head -1 || echo yok")
result = stdout.read().decode().strip()
if 'yok' not in result:
    print(f"   ✅ Sitemap: {result.split('/')[-1]}")
else:
    print("   ⚠️ Sitemap bulunamadı")

# robots.txt
print("\n6️⃣ robots.txt:")
stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/dist/client/robots.txt 2>/dev/null | head -2 || echo yok")
result = stdout.read().decode().strip()
if 'yok' not in result and result:
    print("   ✅ robots.txt mevcut")
else:
    print("   ⚠️ robots.txt bulunamadı")

# Admin panel erişimi
print("\n7️⃣ Admin Panel:")
stdin, stdout, stderr = ssh.exec_command("curl -m 3 -s -o /dev/null -w '%{http_code}' https://sanliurfa.com/admin 2>&1")
code = stdout.read().decode().strip()
print(f"   /admin: HTTP {code}")

ssh.close()

print("\n" + "=" * 60)
print("🎯 SIRADAKİ İŞLEMLER ÖNERİSİ")
print("=" * 60)
print("""
Eksikler:
  ❌ E-posta SMTP (şifre sıfırlama için gerekli)
  ❌ Google Analytics (istatistik için)
  ⚠️ Sitemap/robots.txt kontrolü

Seçenekler:
  1. E-posta SMTP ayarları (Resend)
  2. Google Analytics entegrasyonu
  3. SEO optimizasyonu (sitemap, robots.txt)
  4. Redis cache optimizasyonu
  5. Hepsini yap
""")
