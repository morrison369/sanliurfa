#!/usr/bin/env python3
"""Otomatik Yedekleme Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DB_NAME = "sanliur_sanliurfa"
DB_USER = "sanliur_sanliurfa"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("💾 Otomatik Yedekleme Kurulumu")
    print("=" * 70)

    # Yedekleme scripti oluştur
    print("\n1️⃣ Yedekleme scripti oluşturuluyor...")
    
    backup_script = f'''#!/bin/bash
# Sanliurfa.com Otomatik Yedekleme Scripti
# Tarih: $(date +%Y-%m-%d_%H-%M-%S)

BACKUP_DIR="/home/sanliur/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="{DB_NAME}"
RETENTION_DAYS=7

# Dizin oluştur
mkdir -p $BACKUP_DIR

# PostgreSQL yedekle
echo "$(date): PostgreSQL yedekleniyor..."
sudo -u postgres pg_dump $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Dosya yedekle (önemli dosyalar)
echo "$(date): Dosyalar yedekleniyor..."
tar -czf $BACKUP_DIR/files_$DATE.tar.gz -C /home/sanliur/public_html \
    .env.production \
    src \
    dist \
    package.json 2>/dev/null

# Eski yedekleri sil (7 günden eski)
echo "$(date): Eski yedekler temizleniyor..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Yedek boyutu
echo "$(date): Yedekleme tamamlandı"
ls -lh $BACKUP_DIR/ | tail -5

# İsteğe bağlı: Uzak sunucuya kopyalama (scp/rsync)
# scp $BACKUP_DIR/db_$DATE.sql.gz user@backup-server:/backups/
'''

    sftp = ssh.open_sftp()
    
    # Scripti yaz
    try:
        sftp.mkdir("/home/sanliur/scripts")
    except:
        pass
    
    sftp.putfo(__import__('io').BytesIO(backup_script.encode()), 
               '/home/sanliur/scripts/backup.sh')
    sftp.close()
    
    # Scripti çalıştırılabilir yap
    ssh.exec_command("chmod +x /home/sanliur/scripts/backup.sh")
    print("   ✅ backup.sh oluşturuldu")

    # Yedek dizini oluştur
    print("\n2️⃣ Yedek dizini oluşturuluyor...")
    ssh.exec_command("mkdir -p /home/sanliur/backups")
    print("   ✅ /home/sanliur/backups oluşturuldu")

    # Crontab ayarı - her gün gece 3'te yedekle
    print("\n3️⃣ Crontab ayarı...")
    cron_job = "0 3 * * * /home/sanliur/scripts/backup.sh >> /home/sanliur/backups/backup.log 2>&1"
    
    # Mevcut crontab'ı al
    stdin, stdout, stderr = ssh.exec_command("crontab -l 2>/dev/null || echo ''")
    current_crontab = stdout.read().decode()
    
    # Yeni crontab oluştur
    if cron_job.strip() not in current_crontab:
        new_crontab = current_crontab.strip() + "\\n" + cron_job + "\\n"
        ssh.exec_command(f"echo -e '{new_crontab}' | crontab -")
        print("   ✅ Günlük yedekleme ayarlandı (03:00)")
    else:
        print("   ℹ️ Zaten ayarlı")

    # İlk yedeklemeyi çalıştır
    print("\n4️⃣ İlk yedekleme çalıştırılıyor...")
    stdin, stdout, stderr = ssh.exec_command("/home/sanliur/scripts/backup.sh 2>&1", timeout=120)
    
    import time
    start = time.time()
    while not stdout.channel.exit_status_ready():
        if time.time() - start > 30:
            print("      ⏳ Yedekleme devam ediyor...")
            start = time.time()
        time.sleep(1)
    
    result = stdout.read().decode()
    if "tamamlandı" in result:
        print("   ✅ İlk yedekleme tamamlandı")
    else:
        print(f"   ⚠️ Sonuç: {result[-500:]}")

    # Yedekleri listele
    print("\n5️⃣ Yedekler:")
    stdin, stdout, stderr = ssh.exec_command("ls -lh /home/sanliur/backups/ | tail -10")
    print(stdout.read().decode())

    ssh.close()

    print("=" * 70)
    print("✅ YEDEKLEME KURULUMU TAMAMLANDI")
    print("=" * 70)
    print("""
📋 Özet:
  🕐 Her gün saat 03:00'te otomatik yedekleme
  📁 Konum: /home/sanliur/backups/
  🗄️ PostgreSQL + Dosyalar
  🗓️ 7 gün saklama (otomatik silme)

📝 Manuel yedekleme:
  /home/sanliur/scripts/backup.sh

📊 Yedek durumu:
  ls -la /home/sanliur/backups/
""")

if __name__ == "__main__":
    main()
