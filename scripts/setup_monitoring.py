#!/usr/bin/env python3
"""Basit Monitoring Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("📊 Monitoring Kurulumu")
    print("=" * 70)

    # 1. Health check scripti
    print("\n1️⃣ Health check scripti oluşturuluyor...")
    
    health_script = '''#!/bin/bash
# Health Check Scripti
# Site durumunu kontrol eder, sorun varsa loglar

SITE_URL="https://sanliurfa.com"
LOG_FILE="/home/sanliur/backups/health.log"
ALERT_FILE="/home/sanliur/backups/alert.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# HTTP status check
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 $SITE_URL 2>&1)

if [ "$HTTP_CODE" != "200" ]; then
    echo "[$DATE] ⚠️ ALERT: HTTP $HTTP_CODE" >> $ALERT_FILE
    echo "[$DATE] ⚠️ Site erişilemiyor: HTTP $HTTP_CODE" >> $LOG_FILE
    
    # PM2 durumunu kontrol et
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    
    PM2_STATUS=$(pm2 list | grep sanliurfa | grep -o 'online\\|stopped\\|errored')
    echo "[$DATE] PM2 Status: $PM2_STATUS" >> $LOG_FILE
    
    # Otomatik restart (eğer down ise)
    if [ "$PM2_STATUS" != "online" ]; then
        echo "[$DATE] 🔄 Otomatik restart deneniyor..." >> $LOG_FILE
        cd /home/sanliur/public_html
        pm2 restart sanliurfa
        sleep 5
        
        # Tekrar kontrol
        NEW_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 $SITE_URL 2>&1)
        if [ "$NEW_CODE" == "200" ]; then
            echo "[$DATE] ✅ Restart başarılı!" >> $LOG_FILE
        else
            echo "[$DATE] ❌ Restart başarısız! HTTP $NEW_CODE" >> $LOG_FILE
        fi
    fi
else
    # Her şey yolunda - sadece saat başı logla
    MINUTE=$(date '+%M')
    if [ "$MINUTE" == "00" ]; then
        echo "[$DATE] ✅ OK: HTTP 200" >> $LOG_FILE
    fi
fi

# Disk kullanımı kontrolü
DISK_USAGE=$(df -h /home | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "[$DATE] 🚨 DISK ALERT: %$DISK_USAGE kullanımda!" >> $ALERT_FILE
fi

# Memory kontrolü
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEMORY_USAGE" -gt 95 ]; then
    echo "[$DATE] 🚨 MEMORY ALERT: %$MEMORY_USAGE kullanımda!" >> $ALERT_FILE
fi
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(health_script.encode()), 
               '/home/sanliur/scripts/health_check.sh')
    sftp.close()
    ssh.exec_command("chmod +x /home/sanliur/scripts/health_check.sh")
    print("   ✅ health_check.sh oluşturuldu")

    # 2. Her 5 dakikada bir kontrol
    print("\n2️⃣ Crontab ayarı (her 5 dakika)...")
    cron_job = "*/5 * * * * /home/sanliur/scripts/health_check.sh"
    
    stdin, stdout, stderr = ssh.exec_command("crontab -l 2>/dev/null || echo ''")
    current_crontab = stdout.read().decode()
    
    if cron_job.strip() not in current_crontab:
        new_crontab = current_crontab.strip() + "\\n" + cron_job + "\\n"
        ssh.exec_command(f"echo -e '{new_crontab}' | crontab -")
        print("   ✅ Her 5 dakikada kontrol ayarlandı")
    else:
        print("   ℹ️ Zaten ayarlı")

    # 3. Status scripti
    print("\n3️⃣ Status scripti oluşturuluyor...")
    
    status_script = '''#!/bin/bash
# Site Durumunu Göster

echo "================================"
echo "   SİTE DURUMU"
echo "================================"
echo ""

# HTTP Status
echo "🌐 HTTP Status:"
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://sanliurfa.com 2>&1)
if [ "$HTTP_CODE" == "200" ]; then
    echo "   ✅ HTTP 200 - Site çalışıyor"
else
    echo "   ⚠️ HTTP $HTTP_CODE"
fi
echo ""

# PM2 Status
echo "⚙️  PM2 Durumu:"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
pm2 list | grep sanliurfa
echo ""

# Sistem Kaynakları
echo "💾 Sistem Kaynakları:"
echo "   Disk: $(df -h /home | tail -1 | awk '{print $5}')"
echo "   RAM:  $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100}')"
echo ""

# Son Loglar
echo "📋 Son Log Girişleri:"
if [ -f /home/sanliur/backups/health.log ]; then
    tail -3 /home/sanliur/backups/health.log 2>/dev/null
fi
echo ""

# Uptime
echo "⏱️  Uptime:"
uptime
echo ""
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(status_script.encode()), 
               '/home/sanliur/scripts/status.sh')
    sftp.close()
    ssh.exec_command("chmod +x /home/sanliur/scripts/status.sh")
    print("   ✅ status.sh oluşturuldu")

    # 4. İlk kontrol
    print("\n4️⃣ İlk health check çalıştırılıyor...")
    stdin, stdout, stderr = ssh.exec_command("/home/sanliur/scripts/health_check.sh 2>&1")
    result = stdout.read().decode()
    if "OK" in result or result == "":
        print("   ✅ Kontrol tamamlandı")
    else:
        print(f"   ⚠️ Sonuç: {result[:200]}")

    # 5. Status göster
    print("\n5️⃣ Mevcut durum:")
    stdin, stdout, stderr = ssh.exec_command("/home/sanliur/scripts/status.sh 2>&1")
    print(stdout.read().decode())

    ssh.close()

    print("=" * 70)
    print("✅ MONITORING KURULUMU TAMAMLANDI")
    print("=" * 70)
    print("""
📋 Özet:
  🔍 Her 5 dakikada site kontrolü
  🔄 Otomatik restart (down olduğunda)
  📊 Disk ve memory izleme
  🚨 Alert logları (sorun olduğunda)

📝 Komutlar:
  Durum gör:     /home/sanliur/scripts/status.sh
  Manuel check:  /home/sanliur/scripts/health_check.sh
  Loglar:        tail -f /home/sanliur/backups/health.log
  Alertler:      cat /home/sanliur/backups/alert.log

📊 Log dosyaları:
  /home/sanliur/backups/health.log
  /home/sanliur/backups/alert.log
""")

if __name__ == "__main__":
    main()
