#!/bin/bash
set -e

# SSL/TLS Certificate Setup Script
# Supports Let's Encrypt and custom certificates

DOMAIN=${1:-"sanliurfa.com"}
EMAIL=${2:-"admin@sanliurfa.com"}
CERT_TYPE=${3:-"letsencrypt"}  # letsencrypt or custom
CERT_DIR="./nginx/ssl"
NGINX_CONF="./nginx/nginx.prod.conf"

echo "Setting up SSL for $DOMAIN..."

# Create SSL directory
mkdir -p "$CERT_DIR"

if [ "$CERT_TYPE" = "letsencrypt" ]; then
    echo "Using Let's Encrypt..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        apt-get update
        apt-get install -y certbot
    fi
    
    # Generate certificate
    certbot certonly --standalone \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --agree-tos \
        --email "$EMAIL" \
        --non-interactive
    
    # Copy certificates
    cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
    cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
    
    # Setup auto-renewal
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker exec sanliurfa_nginx_prod nginx -s reload") | crontab -
    
    echo "Let's Encrypt SSL setup complete. Auto-renewal configured."
    
elif [ "$CERT_TYPE" = "custom" ]; then
    echo "Using custom certificate..."
    
    if [ ! -f "$CERT_DIR/cert.pem" ] || [ ! -f "$CERT_DIR/key.pem" ]; then
        echo "Please place your certificate files:"
        echo "  - $CERT_DIR/cert.pem (certificate chain)"
        echo "  - $CERT_DIR/key.pem (private key)"
        exit 1
    fi
    
    echo "Custom SSL certificate configured."
fi

# Update nginx configuration
echo "Updating Nginx configuration..."

# Generate nginx SSL config
cat > "$NGINX_CONF" << 'EOF'
upstream app_servers {
    server app:4321;
    keepalive 32;
}

server {
    listen 80;
    server_name sanliurfa.com www.sanliurfa.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sanliurfa.com www.sanliurfa.com;
    
    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
    
    # Client body size
    client_max_body_size 10M;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    location / {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://app_servers;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 1y;
    }
    
    # API routes - no caching
    location /api/ {
        proxy_pass http://app_servers;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://app_servers/api/health;
    }
}
EOF

echo "SSL setup complete for $DOMAIN!"
echo "Please restart Nginx: docker-compose -f docker-compose.prod.yml restart nginx"
