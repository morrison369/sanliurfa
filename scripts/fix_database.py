#!/usr/bin/env python3
import paramiko
import time

HOST = "168.119.79.238"
PORT = 77
USERNAME = "sanliur"
PASSWORD = "CHANGE_ME_CWP_SSH_PASSWORD"
DB_PASS = "CHANGE_ME_DB_PASSWORD"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, port=PORT, username=USERNAME, password=PASSWORD, 
                timeout=20, look_for_keys=False, allow_agent=False)
    
    channel = ssh.invoke_shell()
    time.sleep(2)
    
    print("=== DATABASE DUZELTME ===\n")
    
    # 1. Export password
    channel.send(f"export PGPASSWORD='{DB_PASS}'\n")
    time.sleep(1)
    
    # 2. Create essential tables
    sql = """
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    website TEXT,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'inactive')),
    rating DECIMAL(2,1) DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    price_range INTEGER DEFAULT 2 CHECK (price_range BETWEEN 1 AND 4),
    amenities TEXT[],
    tags TEXT[],
    images TEXT[],
    opening_hours JSONB,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    cover_image TEXT,
    author_id UUID REFERENCES users(id),
    tags TEXT[],
    is_featured BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    category VARCHAR(50),
    image_url TEXT,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('published', 'draft', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historical_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    location TEXT NOT NULL,
    period VARCHAR(100),
    entry_fee VARCHAR(100),
    opening_hours TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    images TEXT[],
    is_unesco BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT NOT NULL,
    images TEXT[],
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(place_id, user_id)
);

CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID REFERENCES places(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(place_id, user_id)
);

INSERT INTO users (email, password_hash, full_name, role, email_verified)
VALUES ('admin@sanliurfa.com', 'c75c1c5d23c4a30c22b8909b2947733cc538ff62e0da4b27d8589b93c1332866', 'Admin User', 'admin', true)
ON CONFLICT (email) DO NOTHING;

SELECT 'Tables created successfully' as status;
"""
    
    # Write SQL to file
    channel.send("cat > /tmp/setup.sql << 'SQLEOF'\n")
    time.sleep(1)
    
    for line in sql.strip().split('\n'):
        channel.send(line + "\n")
        time.sleep(0.1)
    
    channel.send("SQLEOF\n")
    time.sleep(2)
    
    # Execute SQL
    channel.send(f"psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f /tmp/setup.sql 2>&1\n")
    time.sleep(5)
    
    output = ""
    while channel.recv_ready():
        output += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("DATABASE OUTPUT:")
    print(output[-600:])
    
    # 3. Fix env file with correct format
    channel.send("cd /home/sanliur/public_html\n")
    time.sleep(1)
    
    env_content = f"""SITE_URL=https://sanliurfa.com
NODE_ENV=production
PORT=4321
HOST=127.0.0.1
DATABASE_URL=postgresql://sanliur_sanliurfa:{DB_PASS}@localhost:5432/sanliur_sanliurfa
JWT_SECRET=change-this-secret-key-min-32-characters
"""
    
    channel.send(f"cat > .env.production << 'ENVEOF'\n{env_content}ENVEOF\n")
    time.sleep(2)
    
    # 4. Restart app
    channel.send("source ~/.nvm/nvm.sh && pm2 restart sanliurfa\n")
    time.sleep(5)
    
    output2 = ""
    while channel.recv_ready():
        output2 += channel.recv(4096).decode('utf-8', errors='ignore')
        time.sleep(1)
    
    print("\nRESTART OUTPUT:")
    print(output2[-300:])
    
    channel.close()
    ssh.close()

if __name__ == "__main__":
    main()
