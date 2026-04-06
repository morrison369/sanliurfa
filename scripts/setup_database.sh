#!/bin/bash
# Database setup script - Run on server

echo "🗄️  Database Setup"
echo "=================="

# Check if PostgreSQL is running
echo "1️⃣ Checking PostgreSQL..."
if pgrep -x "postgres" > /dev/null; then
    echo "   ✅ PostgreSQL is running"
else
    echo "   ❌ PostgreSQL is not running"
    echo "   Starting PostgreSQL..."
    sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null
fi

# Connect and setup
echo ""
echo "2️⃣ Setting up database..."
cd /home/sanliur/public_html

# Run schema
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -f database/schema.sql 2>&1 | tail -20

echo ""
echo "3️⃣ Verifying tables..."
psql -U sanliur_sanliurfa -d sanliur_sanliurfa -h localhost -c "\dt" 2>&1

echo ""
echo "=================="
echo "✅ Database setup complete!"
