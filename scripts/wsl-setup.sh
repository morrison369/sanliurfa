#!/bin/bash
# WSL Development Environment Setup

set -e

echo "🐧 WSL Development Environment Setup"
echo "======================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}📦 Updating system...${NC}"
sudo apt-get update && sudo apt-get upgrade -y

# Install essential packages
echo -e "${YELLOW}📦 Installing essential packages...${NC}"
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js 22
echo -e "${YELLOW}📦 Installing Node.js 22...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" != "22" ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo -e "${GREEN}✅ Node.js $(node -v) installed${NC}"

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${YELLOW}⚠️  Please logout and login again for Docker permissions${NC}"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Supabase CLI
echo -e "${YELLOW}⚡ Installing Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    curl -fsSL https://get.supabase.com | bash
fi

echo -e "${GREEN}✅ Supabase CLI installed${NC}"

# Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2...${NC}"
sudo npm install -g pm2

# Setup Git configuration
echo -e "${YELLOW}⚙️  Git Configuration${NC}"
read -p "Enter your Git name: " git_name
read -p "Enter your Git email: " git_email
git config --global user.name "$git_name"
git config --global user.email "$git_email"

# Create project directory
echo -e "${YELLOW}📁 Creating project directory...${NC}"
mkdir -p ~/projects/sanliurfa.com
cd ~/projects/sanliurfa.com
# Clone or setup project here
echo -e "${GREEN}✅ Project directory created at ~/projects/sanliurfa.com${NC}"

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo -e "${YELLOW}📦 Installing npm dependencies...${NC}"
    npm install --legacy-peer-deps
fi

echo ""
echo -e "${GREEN}🎉 WSL Development Environment Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. cd ~/projects/sanliurfa.com"
echo "2. npm run dev:wsl"
echo ""
echo "Access site at: http://localhost:1111"
