#!/usr/bin/env python3
"""Google Analytics Kurulumu"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("📊 Google Analytics Kurulumu")
    print("=" * 60)

    # 1. GA4 Tracking ID al
    print("\n1️⃣ Google Analytics 4 ID:")
    print("   📝 GA4 ID almanız gerekli:")
    print("   1. https://analytics.google.com adresine gidin")
    print("   2. Kaydolun / Giriş yapın")
    print("   3. Yeni mülk oluştur: sanliurfa.com")
    print("   4. Veri akışı: Web")
    print("   5. Ölçüm ID'sini kopyalayın (örn: G-XXXXXXXXXX)")
    
    ga_id = "G-XXXXXXXXXX"  # Kullanıcı manuel değiştirecek

    # 2. .env.production güncelle
    print("\n2️⃣ .env.production güncelleniyor...")
    
    stdin, stdout, stderr = ssh.exec_command("cat /home/sanliur/public_html/.env.production")
    env_content = stdout.read().decode()
    
    # GA satırını ekle/güncelle
    if "GA_TRACKING_ID" in env_content:
        # Mevcut satırı güncelle
        new_env = ""
        for line in env_content.split('\n'):
            if "GA_TRACKING_ID" in line:
                new_env += f"GA_TRACKING_ID={ga_id}\n"
            else:
                new_env += line + "\n"
    else:
        new_env = env_content + f"\n# Google Analytics\nGA_TRACKING_ID={ga_id}\n"
    
    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(new_env.encode()), 
               '/home/sanliur/public_html/.env.production')
    sftp.close()
    print("   ✅ .env.production güncellendi")

    # 3. Analytics componenti oluştur
    print("\n3️⃣ Analytics componenti oluşturuluyor...")
    
    analytics_component = '''import { useEffect } from 'react';

// Google Analytics 4
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export function initGA(trackingId: string) {
  if (!trackingId || trackingId === 'G-XXXXXXXXXX') return;
  
  // GA4 script ekle
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', trackingId, {
    page_title: document.title,
    page_location: window.location.href,
  });
}

export function logPageView(path?: string) {
  const trackingId = import.meta.env.GA_TRACKING_ID;
  if (!trackingId || trackingId === 'G-XXXXXXXXXX' || !window.gtag) return;
  
  window.gtag('config', trackingId, {
    page_path: path || window.location.pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function logEvent(action: string, category: string, label?: string, value?: number) {
  const trackingId = import.meta.env.GA_TRACKING_ID;
  if (!trackingId || trackingId === 'G-XXXXXXXXXX' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// React hook
export function useAnalytics() {
  useEffect(() => {
    const trackingId = import.meta.env.GA_TRACKING_ID;
    if (trackingId && trackingId !== 'G-XXXXXXXXXX') {
      initGA(trackingId);
    }
  }, []);
  
  return { logPageView, logEvent };
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(analytics_component.encode()), 
               '/home/sanliur/public_html/src/lib/analytics.ts')
    sftp.close()
    print("   ✅ analytics.ts oluşturuldu")

    # 4. Layout'a ekle
    print("\n4️⃣ Layout kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("grep -r 'analytics\|GA_TRACKING_ID\|gtag' /home/sanliur/public_html/src/layouts/ 2>/dev/null | head -5 || echo 'bulunamadi'")
    if "bulunamadi" in stdout.read().decode():
        print("   ⚠️  Analytics layout'a entegre edilmemiş")
        print("   📝 Manuel entegrasyon gerekli:")
        print("      import { useAnalytics } from '../lib/analytics';")
        print("      useAnalytics(); // Layout componentinde")

    # 5. Web Vitals tracking
    print("\n5️⃣ Core Web Vitals tracking...")
    
    webvitals = '''import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const vitalsUrl = 'https://vitals.vercel-analytics.com/v1/vitals';

function getConnectionSpeed() {
  return 'connection' in navigator &&
    navigator.connection &&
    'effectiveType' in navigator.connection
    ? navigator.connection.effectiveType
    : '';
}

export function sendToGoogleAnalytics(metric: any) {
  const trackingId = import.meta.env.GA_TRACKING_ID;
  if (!trackingId || trackingId === 'G-XXXXXXXXXX' || !window.gtag) return;
  
  const body = {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    event_value: Math.round(metric.value),
    custom_parameter_1: metric.name,
    custom_parameter_2: metric.rating,
    custom_parameter_3: metric.delta,
  };
  
  window.gtag('event', metric.name, body);
}

export function initWebVitals() {
  try {
    getCLS(sendToGoogleAnalytics);
    getFID(sendToGoogleAnalytics);
    getFCP(sendToGoogleAnalytics);
    getLCP(sendToGoogleAnalytics);
    getTTFB(sendToGoogleAnalytics);
  } catch (e) {
    console.error('Web Vitals error:', e);
  }
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(webvitals.encode()), 
               '/home/sanliur/public_html/src/lib/webvitals.ts')
    sftp.close()
    print("   ✅ webvitals.ts oluşturuldu")

    # 6. web-vitals paketi kontrol
    print("\n6️⃣ web-vitals paketi kontrolü...")
    stdin, stdout, stderr = ssh.exec_command("ls /home/sanliur/public_html/node_modules/web-vitals 2>/dev/null | head -1 || echo yok")
    if "yok" in stdout.read().decode():
        print("   ⬇️ web-vitals kuruluyor...")
        NVM = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && '
        ssh.exec_command(f"cd /home/sanliur/public_html && " + NVM + "npm install web-vitals --legacy-peer-deps", timeout=120)
        import time
        time.sleep(10)
        print("   ✅ web-vitals kuruldu")
    else:
        print("   ✅ web-vitals zaten kurulu")

    ssh.close()

    print("\n" + "=" * 60)
    print("✅ ANALYTICS KURULUMU TAMAMLANDI")
    print("=" * 60)
    print("""
📋 Özet:
  📁 Dosyalar:
     - /home/sanliur/public_html/src/lib/analytics.ts
     - /home/sanliur/public_html/src/lib/webvitals.ts
  
  ⚙️  Fonksiyonlar:
     - initGA() → GA4 başlat
     - logPageView() → Sayfa görüntüleme
     - logEvent() → Özel olaylar
     - initWebVitals() → Core Web Vitals

🔧 Yapılması Gerekenler:
  1. GA4'ten G-XXXXXXXXXX ID'sini alın
  2. .env.production'daki GA_TRACKING_ID'i güncelleyin
  3. Layout.tsx'de useAnalytics() hook'unu çağırın
  4. Rebuild: npm run build
  5. Restart: pm2 restart sanliurfa

📊 GA4 Dashboard:
  https://analytics.google.com/analytics/web
""")

if __name__ == "__main__":
    main()
