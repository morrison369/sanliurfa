#!/usr/bin/env python3
"""Log Rotation Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("📋 Log Rotation Kurulumu")
    print("=" * 70)

    # 1. PM2 Log Rotation ayarı
    print("\n1️⃣ PM2 Log Rotation ayarlanıyor...")
    
    pm2_logrotate_config = '''{
      "apps": [{
        "name": "sanliurfa",
        "script": "./dist/server/entry.mjs",
        "cwd": "/home/sanliur/public_html",
        "env": {
          "NODE_ENV": "production",
          "PORT": 6000
        },
        "instances": 1,
        "exec_mode": "fork",
        "max_memory_restart": "500M",
        "log_file": "/home/sanliur/.pm2/logs/sanliurfa.log",
        "out_file": "/home/sanliur/.pm2/logs/sanliurfa-out.log",
        "error_file": "/home/sanliur/.pm2/logs/sanliurfa-error.log",
        "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
        "merge_logs": true,
        "log_rotate": true,
        "log_max_size": "10M",
        "log_max_files": 5
      }]
    }'''

    # ecosystem dosyasını güncelle
    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(pm2_logrotate_config.encode()), 
               '/home/sanliur/public_html/ecosystem.config.json')
    sftp.close()
    print("   ✅ ecosystem.config.json güncellendi")

    # 2. Sistem logrotate yapılandırması
    print("\n2️⃣ Sistem logrotate yapılandırması...")
    
    logrotate_config = '''/home/sanliur/.pm2/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 sanliur sanliur
    sharedscripts
    postrotate
        /bin/kill -HUP $(cat /home/sanliur/.pm2/pm2.pid 2>/dev/null) 2>/dev/null || true
    endscript
}

/home/sanliur/public_html/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 sanliur sanliur
}

/home/sanliur/backups/*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
'''

    sftp = ssh.open_sftp()
    try:
        sftp.putfo(__import__('io').BytesIO(logrotate_config.encode()), 
                   '/etc/logrotate.d/sanliurfa')
        print("   ✅ /etc/logrotate.d/sanliurfa oluşturuldu")
    except Exception as e:
        print(f"   ⚠️ Yazılamadı (yetki): {e}")
        print("   📝 Manuel kurulum gerekli")
    finally:
        sftp.close()

    # 3. PM2 restart yeni config ile
    print("\n3️⃣ PM2 yeni config ile restart...")
    NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
    ssh.exec_command(NVM + "pm2 delete sanliurfa 2>/dev/null; echo 'OK'")
    
    import time
    time.sleep(2)
    
    ssh.exec_command(f"cd /home/sanliur/public_html && " + NVM + "pm2 start ecosystem.config.json")
    time.sleep(3)
    print("   ✅ PM2 yeniden başlatıldı")

    # 4. Log temizlik scripti
    print("\n4️⃣ Log temizlik scripti oluşturuluyor...")
    
    cleanup_script = '''#!/bin/bash
# Log temizlik scripti

# 7 günden eski logları sil
find /home/sanliur/.pm2/logs -name "*.log" -mtime +7 -type f -delete 2>/dev/null
find /home/sanliur/public_html/logs -name "*.log" -mtime +30 -type f -delete 2>/dev/null

# Sıkıştırılmış logları 30 gün sonra sil
find /home/sanliur/.pm2/logs -name "*.gz" -mtime +30 -type f -delete 2>/dev/null

echo "$(date): Log temizliği tamamlandı"
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(cleanup_script.encode()), 
               '/home/sanliur/scripts/cleanup_logs.sh')
    sftp.close()
    ssh.exec_command("chmod +x /home/sanliur/scripts/cleanup_logs.sh")
    
    # Haftalık log temizliği
    cron_cleanup = "0 4 * * 0 /home/sanliur/scripts/cleanup_logs.sh >> /home/sanliur/backups/cleanup.log 2>&1"
    stdin, stdout, stderr = ssh.exec_command("crontab -l 2>/dev/null || echo ''")
    current_crontab = stdout.read().decode()
    
    if cron_cleanup.strip() not in current_crontab:
        new_crontab = current_crontab.strip() + "\\n" + cron_cleanup + "\\n"
        ssh.exec_command(f"echo -e '{new_crontab}' | crontab -")
        print("   ✅ Haftalık log temizliği ayarlandı (Pazar 04:00)")
    else:
        print("   ℹ️ Zaten ayarlı")

    # 5. Durum kontrolü
    print("\n5️⃣ Durum kontrolü:")
    stdin, stdout, stderr = ssh.exec_command(NVM + "pm2 list")
    print("   PM2:")
    for line in stdout.read().decode().split('\\n')[:5]:
        if line.strip():
            print(f"      {line}")

    stdin, stdout, stderr = ssh.exec_command("ls -lh /home/sanliur/.pm2/logs/ | head -10")
    print("   Log dosyaları:")
    for line in stdout.read().decode().split('\\n')[1:6]:
        if line.strip():
            print(f"      {line.split()[-1]:30} {line.split()[-5]:10} {line.split()[-2]}")

    ssh.close()

    print("=" * 70)
    print("✅ LOG ROTATION KURULUMU TAMAMLANDI")
    print("=" * 70)
    print("""
📋 Özet:
  🔄 Günlük log rotasyonu
  🗜️ Otomatik sıkıştırma (.gz)
  🗓️ PM2 logları: 14 gün saklama
  🗓️ Apache logları: 30 gün saklama
  🧹 Haftalık otomatik temizlik

📝 Manuel log temizlik:
  /home/sanliur/scripts/cleanup_logs.sh

📊 Log durumu:
  ls -lh /home/sanliur/.pm2/logs/
  ls -lh /home/sanliur/public_html/logs/
""")

if __name__ == "__main__":
    main()
