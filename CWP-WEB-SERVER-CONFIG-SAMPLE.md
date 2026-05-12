# Web Server Reverse Proxy Configuration — Şanlıurfa.com

PM2 + Astro SSR `0.0.0.0:3000` üzerinde çalışır. Bu dokümandaki Apache **veya** Nginx config'ini CWP üzerinde aktif et — proje seçim yapmaz, hangisi kuruluysa kullan.

**Kritik**: Body size limitleri **mutlaka** uygulanmalı (defense-in-depth — `src/middleware.ts` cap'ı zaten var ama proxy seviyesinde de olmalı, DoS önler).

---

## Apache (CWP varsayılan)

`/usr/local/apache/conf.d/sanliurfa.com.conf` içine ekle:

```apache
<VirtualHost *:443>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com

    # SSL (CWP'nin let's encrypt'i veya kurumsal cert)
    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/sanliurfa.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/sanliurfa.com/privkey.pem

    # ModProxy: PM2 → 127.0.0.1:3000
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass        / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Body size limit — defense-in-depth (middleware.ts da uyguluyor)
    # Regular API: 1MB; upload routes: 15MB
    LimitRequestBody 1048576

    <LocationMatch "^/api/(upload|photos/upload|files/upload|places/submit|reviews/add)">
        LimitRequestBody 15728640
    </LocationMatch>

    # Rate limiting (mod_evasive — CWP yüklü gelir)
    DOSHashTableSize    3097
    DOSPageCount        10        # 10 req/page within DOSPageInterval
    DOSPageInterval     2         # 2 saniye
    DOSSiteCount        100       # 100 req/site within DOSSiteInterval
    DOSSiteInterval     2
    DOSBlockingPeriod   600       # 10 dakika ban
    DOSEmailNotify      admin@sanliurfa.com

    # Security headers (defense-in-depth — middleware.ts da set eder)
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

    # Static asset caching (Astro build artifact'ları)
    <LocationMatch "^/(_astro|favicon|robots\.txt|llms\.txt|manifest\.json|sw\.js)">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </LocationMatch>

    # Uploaded images (kullanıcı yüklemesi)
    <Location "/uploads/">
        Header set Cache-Control "public, max-age=86400"
    </Location>

    # SSE endpoint'leri için keepalive — proxy timeout'u uzat
    <LocationMatch "^/api/(sse|realtime|events|notifications/stream)">
        ProxyPassReverse / http://127.0.0.1:3000/
        ProxyTimeout 86400
    </LocationMatch>

    # Logging
    ErrorLog  /var/log/apache2/sanliurfa-error.log
    CustomLog /var/log/apache2/sanliurfa-access.log combined
</VirtualHost>

# HTTP → HTTPS redirect
<VirtualHost *:80>
    ServerName sanliurfa.com
    ServerAlias www.sanliurfa.com
    Redirect permanent / https://sanliurfa.com/
</VirtualHost>
```

**Reload**: `apachectl configtest && systemctl reload httpd`

---

## Nginx (alternatif)

`/etc/nginx/conf.d/sanliurfa.com.conf` içine ekle:

```nginx
# Rate limit zone — 10 req/s per IP
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=2r/s;

# Upstream PM2 instance
upstream sanliurfa_node {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sanliurfa.com www.sanliurfa.com;

    ssl_certificate     /etc/letsencrypt/live/sanliurfa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sanliurfa.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Body size — global default (regular API)
    client_max_body_size 1M;

    # Auth endpoints — stricter rate limit
    location ~ ^/api/auth/ {
        limit_req zone=auth burst=10 nodelay;
        proxy_pass http://sanliurfa_node;
        include proxy_headers.conf;
    }

    # Upload endpoints — 15MB cap
    location ~ ^/api/(upload|photos/upload|files/upload|places/submit|reviews/add) {
        client_max_body_size 15M;
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://sanliurfa_node;
        include proxy_headers.conf;
    }

    # SSE — uzun polling, buffer kapalı
    location ~ ^/api/(sse|realtime|events|notifications/stream) {
        proxy_pass http://sanliurfa_node;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_read_timeout 86400s;
        include proxy_headers.conf;
    }

    # Static assets — long cache
    location ~ ^/(_astro|favicon|robots\.txt|llms\.txt|manifest\.json|sw\.js) {
        proxy_pass http://sanliurfa_node;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploaded images
    location /uploads/ {
        proxy_pass http://sanliurfa_node;
        expires 1d;
        add_header Cache-Control "public";
    }

    # Default — all other paths
    location / {
        limit_req zone=api burst=30 nodelay;
        proxy_pass http://sanliurfa_node;
        include proxy_headers.conf;
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    access_log /var/log/nginx/sanliurfa-access.log;
    error_log  /var/log/nginx/sanliurfa-error.log;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name sanliurfa.com www.sanliurfa.com;
    return 301 https://$server_name$request_uri;
}
```

`/etc/nginx/proxy_headers.conf`:

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 90s;
```

**Reload**: `nginx -t && systemctl reload nginx`

---

## Validation Checklist

```bash
# 1. Body size cap test (büyük request → 413)
curl -X POST -d "$(head -c 2000000 /dev/urandom | base64)" https://sanliurfa.com/api/contact
# Beklenen: HTTP 413

# 2. Rate limit test
for i in {1..30}; do curl -s -o /dev/null -w "%{http_code}\n" https://sanliurfa.com/api/auth/login; done
# Beklenen: ilk N tane 200/401, sonrası 429

# 3. Security headers
curl -sI https://sanliurfa.com | grep -E "X-Frame|X-Content|HSTS|Referrer"
# Beklenen: hepsi present

# 4. SSE endpoint reachable
curl -N --max-time 5 https://sanliurfa.com/api/realtime/notifications
# Beklenen: text/event-stream content-type

# 5. Static asset cache
curl -sI https://sanliurfa.com/_astro/index.css | grep -i cache-control
# Beklenen: max-age=31536000, immutable
```

---

## Notlar

- **HARD RULE #13**: Middleware Content-Length cap (1MB regular / 15MB upload) zaten enforce ediliyor; proxy seviyesi defense-in-depth.
- **HARD RULE #18**: Redis namespace → proxy katmanında etkisi yok ama logout flow için Redis erişimi gerekli (HARD RULE #35 fail-open).
- **PM2 cluster mode**: `ecosystem.config.cjs` `instances: 1` (CWP shared hosting için optimal). Daha güçlü VPS'ye geçilirse `instances: 'max', exec_mode: 'cluster'`'e çevir + nginx upstream `keepalive` artır.
- **Apache vs Nginx**: Nginx daha iyi SSE/long-polling/upload streaming. CWP varsayılan Apache; Nginx'e geçiş için CWP > Apache > Nginx Reverse Proxy paketi yükle.
