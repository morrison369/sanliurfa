#!/usr/bin/env python3
"""Cloudflare Proxy + SSL Full Test"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DOMAIN = "sanliurfa.com"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🌐 Cloudflare Proxy + SSL Test")
print("=" * 60)

# 1. Domain çözümlemesi (Cloudflare IP'si göstermeli)
print("\n1️⃣ DNS Çözümlemesi:")
stdin, stdout, stderr = ssh.exec_command(f"dig +short {DOMAIN} | head -3")
ips = stdout.read().decode().strip().split('\n')
for ip in ips:
    if ip.strip():
        # Cloudflare IP'leri mi?
        is_cf = any(x in ip for x in ['104.', '172.', '173.'])
        icon = "✅ Cloudflare" if is_cf else "⚠️"
        print(f"   {icon} {ip}")

# 2. CWP Domain durumu
print("\n2️⃣ CWP Domain Durumu:")
stdin, stdout, stderr = ssh.exec_command(f"ls -la /usr/local/apache/conf.d/vhosts/ | grep {DOMAIN}")
vhosts = stdout.read().decode().strip()
if vhosts:
    print("   ✅ Domain vhost dosyaları mevcut:")
    for line in vhosts.split('\n')[:3]:
        if line.strip():
            print(f"      {line.split()[-1]}")
else:
    print("   ⚠️ Vhost dosyası bulunamadı")

# 3. SSL Sertifika kontrolü
print("\n3️⃣ SSL Sertifika:")
stdin, stdout, stderr = ssh.exec_command(f"ls -la /etc/letsencrypt/live/{DOMAIN}/ 2>/dev/null | head -5 || echo 'Cert dizini yok'")
cert_files = stdout.read().decode()
if "fullchain.pem" in cert_files:
    print("   ✅ Let's Encrypt sertifikası mevcut")
    # Sertifika detayları
    stdin, stdout, stderr = ssh.exec_command(f"openssl x509 -in /etc/letsencrypt/live/{DOMAIN}/cert.pem -noout -dates -subject 2>/dev/null")
    cert_info = stdout.read().decode().strip()
    for line in cert_info.split('\n'):
        if line.strip():
            print(f"      {line}")
else:
    print(f"   {cert_files[:200]}")

# 4. Uygulama durumu
print("\n4️⃣ Uygulama Durumu:")
NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 show sanliurfa | grep -E 'status|uptime|memory'")
for line in stdout.read().decode().split('\n'):
    if line.strip():
        print(f"   {line.strip()}")

# 5. Port 4321
print("\n5️⃣ Port 4321:")
stdin, stdout, stderr = ssh.exec_command("netstat -tlnp 2>/dev/null | grep 4321 || ss -tlnp | grep 4321")
print(f"   {stdout.read().decode().strip()[:70]}")

# 6. HTTP Test (localhost)
print("\n6️⃣ HTTP Test (localhost → 4321):")
stdin, stdout, stderr = ssh.exec_command("curl -m 3 -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/")
code = stdout.read().decode().strip()
status = "✅" if code == "200" else "❌"
print(f"   {status} HTTP {code}")

# 7. Cloudflare bağlantı testi
print(f"\n7️⃣ Cloudflare → Sunucu Test:")
stdin, stdout, stderr = ssh.exec_command(f"curl -m 5 -s -o /dev/null -w '%{{http_code}}' --resolve {DOMAIN}:80:127.0.0.1 http://{DOMAIN}/ 2>&1")
code = stdout.read().decode().strip()
print(f"   Local Apache proxy: HTTP {code}")

ssh.close()

print("\n" + "=" * 60)
print("🎉 TEST TAMAMLANDI")
print("=" * 60)
print(f"""
🌐 Site erişim:
   https://{DOMAIN}
   
📝 Cloudflare ayarları:
   • Proxy: Turuncu bulut (Aktif)
   • SSL: Full
   • Sunucu: 168.119.79.238
   
🔗 Trafiğin akışı:
   Kullanıcı → Cloudflare (SSL) → Sunucu:443 → Apache → Node.js:4321
""")
