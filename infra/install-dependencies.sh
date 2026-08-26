#!/bin/bash

set -e

echo "🔧 Installing Docker, Docker Compose, and dependencies..."

# Update system
echo "📦 Updating system packages..."
sudo dnf update -y

# Install Docker
echo "🐳 Installing Docker..."
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group
sudo usermod -aG docker ec2-user

# Install Docker Compose
echo "🐙 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Certbot for SSL
echo "🔐 Installing Certbot (SSL certificates)..."
sudo dnf install -y certbot python3-certbot python3-certbot-nginx

# Install git (useful for pulling code)
echo "📝 Installing git..."
sudo dnf install -y git

# Create app directory
echo "📁 Creating app directory..."
mkdir -p ~/app
cd ~/app

# Verify installations
echo ""
echo "✅ Verification:"
docker --version
docker-compose --version
certbot --version
git --version

echo ""
echo "🎉 All dependencies installed successfully!"
echo "ℹ️  You may need to log out and log back in for docker group permissions to take effect"
echo "ℹ️  Or run: newgrp docker"
