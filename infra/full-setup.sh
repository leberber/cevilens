#!/bin/bash

set -e

EC2_IP="35.180.12.92"
SSH_KEY="/Users/yazidmekhtoub/.ssh/Elsuq-ssh-key.pem"
EC2_USER="ec2-user"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🚀 CEVITAL FULL SETUP - EC2 Instance Configuration"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Target EC2: $EC2_IP"
echo "SSH Key: $SSH_KEY"
echo ""

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

# Step 1: Install dependencies
echo "═══════════════════════════════════════════════════════════"
echo "STEP 1: Installing Docker, Docker Compose, and Certbot..."
echo "═══════════════════════════════════════════════════════════"

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$(dirname "$0")/install-dependencies.sh" "$EC2_USER@$EC2_IP":~/
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "chmod +x ~/install-dependencies.sh && ~/install-dependencies.sh"

echo ""
echo "✅ Dependencies installed!"
echo ""

# Step 2: Setup Nginx and SSL
echo "═══════════════════════════════════════════════════════════"
echo "STEP 2: Setting up Nginx and SSL certificates..."
echo "═══════════════════════════════════════════════════════════"

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no "$(dirname "$0")/ec2-setup.sh" "$EC2_USER@$EC2_IP":~/
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_IP" "chmod +x ~/ec2-setup.sh && ~/ec2-setup.sh"

echo ""
echo "✅ Nginx and SSL configured!"
echo ""

# Step 3: Ready for deployment
echo "═══════════════════════════════════════════════════════════"
echo "✅ EC2 INSTANCE SETUP COMPLETE!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next step: Deploy the application"
echo ""
echo "Run from your Mac:"
echo "  cd /Users/yazidmekhtoub/Desktop/cevital"
echo "  ./deploy.sh"
echo ""
echo "Or test the connection:"
echo "  ssh -i $SSH_KEY $EC2_USER@$EC2_IP"
echo ""
