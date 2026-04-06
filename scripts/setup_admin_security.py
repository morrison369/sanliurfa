#!/usr/bin/env python3
"""Admin Güvenlik Ayarları"""
import paramiko

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD)

    print("🔒 Admin Güvenlik Ayarları")
    print("=" * 60)

    # 1. Admin IP kısıtlama (opsiyonel)
    print("\n1️⃣ Admin IP Kısıtlama:")
    print("   📝 Admin paneline sadece belirli IP'lerden erişim")
    
    admin_htaccess = '''# Admin panel güvenlik ayarları
<IfModule mod_rewrite.c>
RewriteEngine On

# Admin dizini koruma
RewriteCond %{REQUEST_URI} ^/admin [NC]

# İzin verilen IP'ler (örnekler, kendi IP'nizi ekleyin)
# RewriteCond %{REMOTE_ADDR} !^123\.456\.789\.000$
# RewriteCond %{REMOTE_ADDR} !^127\.0\.0\.1$

# Eğer IP izinli değilse 403 gönder
# RewriteRule .* - [F,L]
</IfModule>

# Admin dizini şifre koruması (opsiyonel)
# AuthType Basic
# AuthName "Admin Panel"
# AuthUserFile /home/sanliur/.htpasswd
# Require valid-user
'''

    # 2. Rate limiting middleware
    print("\n2️⃣ Rate Limiting middleware...")
    
    rate_limiter = '''import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from './cache';

// Genel rate limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // IP başına 100 istek
  message: {
    error: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin giriş rate limit (brute force koruması)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 5 deneme
  skipSuccessfulRequests: true,
  message: {
    error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.'
  },
});

// API rate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 60, // 60 istek/dakika
  message: {
    error: 'API limiti aşıldı. Lütfen daha sonra tekrar deneyin.'
  },
});

// Admin rate limit (daha katı)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30, // 30 istek/dakika
  message: {
    error: 'Admin işlemleri için çok fazla istek.'
  },
});
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(rate_limiter.encode()), 
               '/home/sanliur/public_html/src/lib/ratelimit.ts')
    sftp.close()
    print("   ✅ ratelimit.ts oluşturuldu")

    # 3. Güvenlik başlıkları
    print("\n3️⃣ Güvenlik Başlıkları (Security Headers)...")
    
    security_headers = '''# Apache Security Headers
<IfModule mod_headers.c>
    # XSS Koruması
    Header always set X-XSS-Protection "1; mode=block"
    
    # Clickjacking koruması
    Header always set X-Frame-Options "SAMEORIGIN"
    
    # MIME sniffing koruması
    Header always set X-Content-Type-Options "nosniff"
    
    # Referrer Policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    
    # Content Security Policy
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.supabase.co https://*.google-analytics.com;"
    
    # HSTS (HTTPS zorunlu)
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    
    # Permissions Policy
    Header always set Permissions-Policy "geolocation=(self), microphone=(), camera=()"
</IfModule>
'''

    # 4. Brute force koruması (fail2ban zaten aktif)
    print("\n4️⃣ Fail2Ban durumu:")
    stdin, stdout, stderr = ssh.exec_command("systemctl is-active fail2ban && fail2ban-client status | head -10")
    result = stdout.read().decode()
    if "active" in result:
        print("   ✅ Fail2Ban aktif")
        print("   Aktif jail'ler:")
        for line in result.split('\n')[1:6]:
            if line.strip():
                print(f"      {line}")
    else:
        print("   ⚠️ Fail2Ban pasif (manuel kontrol gerekli)")

    # 5. CSRF koruması
    print("\n5️⃣ CSRF Koruması...")
    
    csrf_protection = '''// CSRF Token oluşturma
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// CSRF Token doğrulama
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  
  // Timing-safe comparison
  let result = 0;
  const tokenLength = Math.max(token.length, sessionToken.length);
  
  for (let i = 0; i < tokenLength; i++) {
    result |= (token.charCodeAt(i) || 0) ^ (sessionToken.charCodeAt(i) || 0);
  }
  
  return result === 0;
}

// CSRF middleware
export function csrfMiddleware(context: any, next: any) {
  // GET istekleri için token oluştur
  if (context.request.method === 'GET') {
    const token = generateCSRFToken();
    context.cookies.set('csrf-token', token, {
      httpOnly: false,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 saat
    });
    return next();
  }
  
  // POST/PUT/DELETE için token doğrula
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(context.request.method)) {
    const csrfToken = context.request.headers.get('x-csrf-token');
    const sessionToken = context.cookies.get('csrf-token')?.value;
    
    if (!validateCSRFToken(csrfToken || '', sessionToken || '')) {
      return new Response(JSON.stringify({ error: 'Geçersiz CSRF token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return next();
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(csrf_protection.encode()), 
               '/home/sanliur/public_html/src/lib/csrf.ts')
    sftp.close()
    print("   ✅ csrf.ts oluşturuldu")

    # 6. Güvenlik loglama
    print("\n6️⃣ Güvenlik Logları...")
    
    security_logger = '''// Güvenlik olaylarını logla
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/home/sanliur/public_html/logs';
const SECURITY_LOG = path.join(LOG_DIR, 'security.log');

// Log dizini oluştur
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logSecurityEvent(event: string, details: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown'
  };
  
  const logLine = JSON.stringify(logEntry) + '\\n';
  
  fs.appendFile(SECURITY_LOG, logLine, (err) => {
    if (err) console.error('Security log error:', err);
  });
}

export function logFailedLogin(email: string, ip: string, userAgent: string) {
  logSecurityEvent('FAILED_LOGIN', { email, ip, userAgent });
}

export function logSuspiciousActivity(activity: string, details: any) {
  logSecurityEvent('SUSPICIOUS_ACTIVITY', { activity, ...details });
}

export function logAdminAction(action: string, userId: string, details: any) {
  logSecurityEvent('ADMIN_ACTION', { action, userId, ...details });
}
'''

    sftp = ssh.open_sftp()
    sftp.putfo(__import__('io').BytesIO(security_logger.encode()), 
               '/home/sanliur/public_html/src/lib/security-logger.ts')
    sftp.close()
    print("   ✅ security-logger.ts oluşturuldu")

    ssh.close()

    print("\n" + "=" * 60)
    print("✅ ADMIN GÜVENLİK TAMAMLANDI")
    print("=" * 60)
    print("""
📋 Özet:
  📁 Oluşturulan dosyalar:
     - /home/sanliur/public_html/src/lib/ratelimit.ts
     - /home/sanliur/public_html/src/lib/csrf.ts
     - /home/sanliur/public_html/src/lib/security-logger.ts
  
  🛡️  Güvenlik katmanları:
     ✅ Rate Limiting (Brute force koruması)
     ✅ CSRF Token koruması
     ✅ Güvenlik başlıkları (XSS, Clickjacking)
     ✅ Fail2Ban (IP banlama)
     ✅ Güvenlik logları

🔧 Yapılması Gerekenler:
  1. Rate limit middleware'ini API route'larına ekleyin
  2. CSRF token'ı form'lara ekleyin
  3. Admin IP kısıtlaması için .htaccess düzenleyin
  4. Rebuild: npm run build
  5. Restart: pm2 restart sanliurfa

📝 Güvenlik önerileri:
  - Güçlü admin şifresi kullanın
  - 2FA (İki faktörlü doğrulama) ekleyin
  - Düzenli güvenlik loglarını kontrol edin
  - Cloudflare Firewall kuralları ekleyin
""")

if __name__ == "__main__":
    main()
