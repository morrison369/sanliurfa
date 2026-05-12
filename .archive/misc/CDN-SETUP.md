# CDN Setup Guide for Şanlıurfa.com

This guide covers setting up a CDN (Cloudflare/AWS CloudFront) for optimal content delivery.

## Table of Contents
- [Cloudflare Setup](#cloudflare-setup)
- [AWS CloudFront Setup](#aws-cloudfront-setup)
- [Cache Rules](#cache-rules)
- [Optimization Settings](#optimization-settings)

---

## Cloudflare Setup

### 1. Initial Setup

1. Create a Cloudflare account at https://dash.cloudflare.com
2. Add your domain: `sanliurfa.com`
3. Update nameservers at your domain registrar
4. Wait for DNS propagation (usually 24-48 hours)

### 2. SSL/TLS Configuration

```
SSL/TLS Mode: Full (Strict)
Always Use HTTPS: ON
Automatic HTTPS Rewrites: ON
TLS 1.3: ON
```

### 3. DNS Records

```
Type    Name            Value                    TTL    Proxy Status
A       @               YOUR_SERVER_IP           Auto   Proxied (Orange Cloud)
A       www             YOUR_SERVER_IP           Auto   Proxied
CNAME   api             sanliurfa.com            Auto   DNS Only
CNAME   staging         staging-server.com       Auto   DNS Only
```

### 4. Page Rules (Free Plan: 3 rules)

#### Rule 1: Cache Everything
```
URL: *sanliurfa.com/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 month
```

#### Rule 2: API No Cache
```
URL: *sanliurfa.com/api/*
Settings:
  - Cache Level: Bypass
  - Security Level: High
```

#### Rule 3: WWW Redirect
```
URL: www.sanliurfa.com/*
Settings:
  - Forwarding URL: 301 Redirect to https://sanliurfa.com/$1
```

### 5. Speed Optimization

```
Auto Minify: ON (CSS, JS, HTML)
Brotli: ON
Rocket Loader: OFF (may break React)
Mirage: ON
Polish: Lossless
Early Hints: ON
```

### 6. Security Settings

```
Security Level: Medium
Challenge Passage: 30 minutes
Browser Integrity Check: ON
Always Online: ON
```

### 7. WAF Rules (Pro Plan)

```
Rule 1: Rate Limiting
  - Threshold: 100 requests per minute
  - Action: Challenge

Rule 2: Block Bad Bots
  - Expression: (http.user_agent contains "bot" and not cf.client.bot)
  - Action: Block

Rule 3: Geographic Block (if needed)
  - Expression: (ip.geoip.country in {"XX" "YY"})
  - Action: Block
```

---

## AWS CloudFront Setup

### 1. Create Distribution

```json
{
  "Origin": {
    "DomainName": "origin.sanliurfa.com",
    "CustomOriginConfig": {
      "HTTPPort": 80,
      "HTTPSPort": 443,
      "OriginProtocolPolicy": "https-only"
    }
  },
  "DefaultCacheBehavior": {
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"],
    "CachedMethods": ["GET", "HEAD"],
    "ForwardedValues": {
      "QueryString": true,
      "Cookies": { "Forward": "none" }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000,
    "Compress": true
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "HttpVersion": "http2",
  "DefaultRootObject": "index.html"
}
```

### 2. Cache Behaviors

| Path Pattern | TTL | Forward Cookies | Forward Headers |
|-------------|-----|-----------------|-----------------|
| `/api/*` | 0 | All | All |
| `/_astro/*` | 31536000 | None | None |
| `*.jpg,*.png` | 2592000 | None | None |
| `/*` | 86400 | None | None |

### 3. Origin Request Policy

```json
{
  "Name": "SanliurfaOriginPolicy",
  "HeadersConfig": {
    "HeaderBehavior": "whitelist",
    "Headers": {
      "Items": ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
    }
  },
  "CookiesConfig": {
    "CookieBehavior": "none"
  },
  "QueryStringsConfig": {
    "QueryStringBehavior": "whitelist",
    "QueryStrings": {
      "Items": ["v", "version"]
    }
  }
}
```

### 4. Response Headers Policy

```json
{
  "Name": "SanliurfaSecurityHeaders",
  "SecurityHeadersConfig": {
    "ContentSecurityPolicy": {
      "ContentSecurityPolicy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
      "Override": false
    },
    "StrictTransportSecurity": {
      "AccessControlMaxAgeSec": 63072000,
      "IncludeSubdomains": true,
      "Preload": true,
      "Override": true
    },
    "XSSProtection": {
      "ModeBlock": true,
      "Protection": true,
      "Override": true
    }
  },
  "CustomHeadersConfig": {
    "Items": [
      {
        "Header": "X-Frame-Options",
        "Value": "SAMEORIGIN",
        "Override": true
      }
    ]
  }
}
```

---

## Cache Rules

### Static Assets (1 year)

```
_files/_astro/*
*.js (with hash)
*.css (with hash)
*.woff2
*.png, *.jpg, *.gif
```

### Dynamic Content (No Cache)

```
/api/*
/auth/*
/user/*
/admin/*
```

### Semi-Dynamic (Short Cache)

```
/ (home) - 5 minutes
/places/* - 1 hour
/blog/* - 1 hour
```

---

## Optimization Settings

### Image Optimization

Cloudflare Polish:
```
Enable: Lossless or Lossy
WebP: ON
AVIF: ON (if supported)
```

### Compression

```
Brotli: priority
Gzip: fallback
Minification: CSS, JS, HTML
```

### HTTP/2 and HTTP/3

```
HTTP/2: Enable
HTTP/3 (QUIC): Enable
0-RTT: Enable
```

---

## Testing CDN

### 1. Check Headers

```bash
curl -I https://sanliurfa.com

# Look for:
# CF-Cache-Status: HIT/MISS/REVALIDATED
# Age: <seconds>
# Cache-Control: max-age=...
```

### 2. Performance Test

```bash
# Using curl
curl -w "@curl-format.txt" -o /dev/null -s https://sanliurfa.com

# Using WebPageTest
gtmetrix.com or webpagetest.org
```

### 3. Cache Warm-up Script

See `scripts/cache-warmup.sh`

---

## Monitoring

### Cloudflare Analytics

- Real-time traffic
- Cache hit ratio (target: >90%)
- Bandwidth saved
- Security events

### Custom Dashboard

```
Cache Hit Ratio: (cache_hits / total_requests) * 100
Origin Requests: total_requests - cache_hits
Bandwidth Saved: total_bytes - origin_bytes
```

---

## Troubleshooting

### Cache Not Hitting

1. Check `CF-Cache-Status` header
2. Verify Cache-Control headers from origin
3. Check Page Rules priority
4. Purge cache and retry

### SSL Issues

1. Verify certificate validity
2. Check SSL mode (Flexible/Full/Full Strict)
3. Review TLS version compatibility

### Performance Issues

1. Enable Auto Minify
2. Check Argo Smart Routing
3. Review image optimization settings
4. Monitor TTFB (Time to First Byte)

---

## Cost Optimization

### Cloudflare

- Free Plan: Unlimited bandwidth
- Pro Plan ($20/month): Polish, WAF
- Business Plan ($200/month): Custom SSL

### AWS CloudFront

- On-demand pricing
- Reserved capacity for predictable traffic
- Origin Shield for multi-region

---

## Migration Checklist

- [ ] Backup current DNS settings
- [ ] Setup CDN in test mode (gray cloud)
- [ ] Configure SSL certificates
- [ ] Test all endpoints
- [ ] Enable caching rules gradually
- [ ] Monitor error rates
- [ ] Enable orange cloud (proxy)
- [ ] Monitor performance metrics
