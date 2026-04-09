#!/usr/bin/env python3
"""SSL Let's Encrypt Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

print("🔒 SSL/HTTPS Kurulumu")
print("=" * 60)

# 1. Certbot kontrolü
print("\n📋 Certbot kontrolü:")
stdin, stdout, stderr = ssh.exec_command("which certbot && certbot --version")
result = stdout.read().decode()
if "certbot" in result:
    print(f"  ✅ {result.strip()}")
else:
    print("  ⚠️ Certbot kurulu değil")
    print("  📦 Kurulum deneniyor...")
    stdin, stdout, stderr = ssh.exec_command("dnf install -y certbot python3-certbot-apache 2>&1 | tail -5")
    print(stdout.read().decode()[-300:])

# 2. Mevcut SSL sertifikaları
print("\n📋 Mevcut sertifikalar:")
stdin, stdout, stderr = ssh.exec_command("certbot certificates 2>/dev/null | grep -E 'Certificate|Domains|Expiry' || echo 'Sertifika bulunamadı'")
print(stdout.read().decode())

# 3. Let's Encrypt ile sertifika al (IP adresi için mümkün değil, self-signed veya domain gerekli)
print("\n🔧 SSL Seçenekleri:")
print("  ⚠️ IP adresi için Let's Encrypt sertifikası alınamaz!")
print("  📝 Bir domain adı gerekli (örn: sanliurfa.com)")

# 4. Self-signed sertifika (geçici çözüm)
print("\n🔐 Self-signed sertifika oluşturuluyor...")
ssl_dir = "/home/sanliur/public_html/ssl"
key_file = f"{ssl_dir}/server.key"
crt_file = f"{ssl_dir}/server.crt"

ssh.exec_command(f"mkdir -p {ssl_dir}")

# Self-signed cert oluştur
cmd = f"""openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout {key_file} \
    -out {crt_file} \
    -subj "/C=TR/ST=Sanliurfa/L=Sanliurfa/O=Sanliurfa/OU=IT/CN=168.119.79.238" 2>&1"""

stdin, stdout, stderr = ssh.exec_command(cmd)
result = stdout.read().decode()
if "Generating" in result or result == "":
    print(f"  ✅ Self-signed sertifika oluşturuldu")
    stdin, stdout, stderr = ssh.exec_command(f"ls -la {ssl_dir}/")
    print(stdout.read().decode())
else:
    print(f"  ⚠️ Sonuç: {result[:200]}")

# 5. HTTPS Apache yapılandırması (varsa)
print("\n📝 HTTPS Yapılandırması:")
https_config = f"""# HTTPS Configuration for 168.119.79.238
# Self-signed SSL
<VirtualHost *:443>
    ServerName 168.119.79.238
    DocumentRoot /home/sanliur/public_html
    
    SSLEngine on
    SSLCertificateFile {crt_file}
    SSLCertificateKeyFile {key_file}
    
    # Proxy to Node.js
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://127.0.0.1:6000/
    ProxyPassReverse / http://127.0.0.1:6000/
    
    <Directory /home/sanliur/public_html>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
"""

# SSL vhost yaz
vhost_ssl_path = "/usr/local/apache/conf.d/vhosts/168.119.79.238.ssl.conf"
sftp = ssh.open_sftp()
try:
    sftp.putfo(__import__('io').BytesIO(https_config.encode()), vhost_ssl_path)
    print(f"  ✅ SSL vhost yazıldı: {vhost_ssl_path}")
except Exception as e:
    print(f"  ⚠️ SSL vhost yazılamadı: {e}")
    print("  📝 CWP Panel'den SSL kurmanız önerilir")
finally:
    sftp.close()

# 6. Port 443 test
print("\n🧪 Port 443 test:")
stdin, stdout, stderr = ssh.exec_command("curl -m 5 -k -s -o /dev/null -w '%{http_code}' https://127.0.0.1/ 2>&1")
code = stdout.read().decode().strip()
print(f"  HTTPS Response: {code}")

ssh.close()

print("\n" + "=" * 60)
print("🔒 SSL KURULUMU TAMAMLANDI!")
print("=" * 60)
print("""
📋 Özet:
  Self-signed sertifika oluşturuldu
  ⚠️ Tarayıcıda "Güvenli Değil" uyarısı gösterebilir

🌐 Erişim:
  http://168.119.79.238     →  HTTP (80)
  https://168.119.79.238    →  HTTPS (443) - Self-signed

📝 Gerçek SSL için:
  1. Domain adı satın alın (örn: sanliurfa.com)
  2. DNS A kaydı: sanliurfa.com → 168.119.79.238
  3. CWP Panel → SSL Certificates → AutoSSL
  
🔧 CWP Panel: https://168.119.79.238:2083
""")
