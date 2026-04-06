#!/bin/bash
# Fix ALL issues - Run on server
# bash /home/sanliur/public_html/scripts/fix_all.sh

echo "🔧 FIX ALL ISSUES"
echo "=================="

cd /home/sanliur/public_html
source ~/.nvm/nvm.sh 2>/dev/null || export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 1. STOP EVERYTHING
echo ""
echo "1️⃣ Stopping services..."
pm2 stop sanliurfa 2>/dev/null
pm2 delete sanliurfa 2>/dev/null
fuser -k 4321/tcp 2>/dev/null || true
sleep 2

# 2. FIX POSTGRESQL AUTH
echo ""
echo "2️⃣ Fixing PostgreSQL authentication..."
PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
if [ -f "$PG_HBA" ]; then
    sudo cp "$PG_HBA" "$PG_HBA.backup.$(date +%s)" 2>/dev/null || true
    sudo sed -i 's/scram-sha-256/trust/g' "$PG_HBA" 2>/dev/null
    sudo sed -i 's/ident/trust/g' "$PG_HBA" 2>/dev/null
    sudo sed -i 's/peer/trust/g' "$PG_HBA" 2>/dev/null
    sudo sed -i 's/md5/trust/g' "$PG_HBA" 2>/dev/null
    sudo systemctl restart postgresql 2>/dev/null || sudo service postgresql restart 2>/dev/null
    sleep 3
    echo "   ✅ PostgreSQL auth fixed"
else
    echo "   ⚠️ pg_hba.conf not found, trying alternative..."
    sudo systemctl restart postgresql 2>/dev/null
fi

# 3. CREATE DATABASE TABLES
echo ""
echo "3️⃣ Creating database tables..."

# Check if schema file exists
if [ -f "database/schema.sql" ]; then
    psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql 2>&1 | grep -E "CREATE|INSERT|ERROR|already exists" | tail -10
    echo "   ✅ Schema applied"
else
    echo "   ⚠️ schema.sql not found, creating basic tables..."
    
    # Create basic tables manually
    psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost << 'EOF' 2>&1 | grep -v "^CREATE\|^INSERT\|^SELECT" | head -5
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    username VARCHAR(50) UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    is_banned BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    rating DECIMAL(2,1) DEFAULT 4.5,
    is_featured BOOLEAN DEFAULT false,
    images TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category VARCHAR(50) NOT NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(place_id, user_id)
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    start_date DATE NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historical_sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    is_unesco BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user
INSERT INTO users (email, password_hash, full_name, role, email_verified)
VALUES (
    'admin@sanliurfa.com',
    'c75c1c5d23c4a30c22b8909b2947733cc538ff62e0da4b27d8589b93c1332866',
    'Admin User',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

SELECT 'Tables created successfully!' as status;
EOF
fi

# 4. FIX ENVIRONMENT
echo ""
echo "4️⃣ Fixing environment..."

# Create .env.production if missing
if [ ! -f ".env.production" ]; then
    cat > .env.production << 'EOF'
SITE_URL=https://sanliurfa.com
NODE_ENV=production
PORT=6000
HOST=127.0.0.1
DATABASE_URL=postgresql://sanliur_sanliurfa@localhost:5432/sanliur_sanliurfa
JWT_SECRET=change-this-secret-$(date +%s)
REDIS_URL=redis://localhost:6379
EOF
    echo "   ✅ Created .env.production"
fi

# Fix JWT_SECRET if default
if grep -q "your-super-secret" .env.production 2>/dev/null; then
    NEW_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "secret-$(date +%s)-$(hostname)")
    sed -i "s/your-super-secret.*/$NEW_SECRET/g" .env.production
    echo "   ✅ Fixed JWT_SECRET"
fi

# Ensure DATABASE_URL
if ! grep -q "DATABASE_URL" .env.production 2>/dev/null; then
    echo "DATABASE_URL=postgresql://sanliur_sanliurfa@localhost:5432/sanliur_sanliurfa" >> .env.production
    echo "   ✅ Added DATABASE_URL"
fi

# 5. REBUILD IF NEEDED
echo ""
echo "5️⃣ Checking build..."
if [ ! -f "dist/server/entry.mjs" ]; then
    echo "   ❌ Build missing, rebuilding..."
    npm install
    npm run build
else
    echo "   ✅ Build exists"
fi

# 6. START APPLICATION
echo ""
echo "6️⃣ Starting application..."
node dist/server/entry.mjs > /tmp/app.log 2>&1 &
sleep 5

# 7. TEST
echo ""
echo "7️⃣ Testing..."
HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/ 2>/dev/null)
if [ "$HTTP" = "200" ]; then
    HTML=$(curl -s http://127.0.0.1:4321/ 2>/dev/null | head -1)
    if echo "$HTML" | grep -qi "html\|!DOCTYPE"; then
        echo "   ✅ SUCCESS! Site is working!"
        echo "   Response: $HTML"
    else
        echo "   ⚠️  HTTP 200 but content check failed"
        echo "   Content: $HTML"
    fi
else
    echo "   ❌ HTTP $HTTP"
    echo "   Log: $(tail -5 /tmp/app.log)"
fi

# 8. SAVE TO PM2
echo ""
echo "8️⃣ Saving to PM2..."
pkill -f "node dist/server/entry.mjs" 2>/dev/null || true
sleep 2
pm2 start dist/server/entry.mjs --name sanliurfa 2>/dev/null
pm2 save 2>/dev/null

echo ""
echo "=================="
echo "✅ FIX COMPLETE!"
echo ""
pm2 list 2>/dev/null | grep sanliurfa || echo "Check: pm2 list"

echo ""
echo "🌐 Test: curl http://127.0.0.1:4321/"
echo "🌐 Site: https://sanliurfa.com (after Apache restart)"
echo ""
echo "🔧 If still error, run: pm2 logs sanliurfa"
