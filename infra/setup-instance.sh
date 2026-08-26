#!/bin/bash

EC2_IP="35.180.12.92"
SSH_KEY="/Users/yazidmekhtoub/.ssh/amanu-ssh-key.pem"

echo "Setting up SSL on $EC2_IP..."

scp -i "$SSH_KEY" infra/ec2-setup.sh ec2-user@$EC2_IP:~/
ssh -i "$SSH_KEY" ec2-user@$EC2_IP "chmod +x ec2-setup.sh && ./ec2-setup.sh"

echo "✅ Done! Visit https://cevilens.com"
