// frontend/src/utils/auth.ts
export interface User {
    id: string;
    username: string;
    name: string;
    email?: string;
    avatar: string;
    githubToken?: string;
  }
  
  export class AuthService {
    private static readonly TOKEN_KEY = 'mobilebytes_auth_token';
    private static readonly API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
    // Get stored token
    static getToken(): string | null {
      try {
        const token = localStorage.getItem(this.TOKEN_KEY);
        console.log('🔍 Getting token from localStorage:', { hasToken: !!token, tokenPreview: token?.substring(0, 20) + '...' });
        return token;
      } catch (error) {
        console.error('❌ Error accessing localStorage:', error);
        return null;
      }
    }
  
    // Store token
    static setToken(token: string): void {
      try {
        localStorage.setItem(this.TOKEN_KEY, token);
        console.log('✅ Token stored in localStorage:', { tokenPreview: token.substring(0, 20) + '...' });
        
        // Verify it was stored
        const stored = localStorage.getItem(this.TOKEN_KEY);
        console.log('✅ Token verification:', { stored: !!stored, matches: stored === token });
      } catch (error) {
        console.error('❌ Error storing token in localStorage:', error);
      }
    }
  
    // Remove token
    static removeToken(): void {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  
    // Helper function to decode base64url (JWT uses base64url encoding)
    private static base64UrlDecode(str: string): string {
      // Replace URL-safe characters and add padding if needed
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error('Invalid base64url string');
        }
        base64 += new Array(5 - pad).join('=');
      }
      
      return atob(base64);
    }
  
    // Check if user is authenticated
    static isAuthenticated(): boolean {
      const token = this.getToken();
      console.log('🔍 isAuthenticated check starting...', { hasToken: !!token });
      
      if (!token) {
        console.log('❌ No token found in isAuthenticated');
        return false;
      }
  
      try {
        // Ensure token has 3 parts (header.payload.signature)
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.error('❌ Invalid token format - not 3 parts:', parts.length);
          return false;
        }
  
        // Decode the payload using base64url decoding
        const payload = JSON.parse(this.base64UrlDecode(parts[1]));
        const currentTime = Date.now() / 1000;
        const isValid = payload.exp > currentTime;
        
        console.log('🔍 Token validation:', {
          exp: payload.exp,
          current: currentTime,
          isValid,
          user: payload.user?.username,
          timeUntilExpiry: payload.exp - currentTime
        });
        
        if (!isValid) {
          console.log('❌ Token is expired, removing...');
          this.removeToken();
        }
        
        return isValid;
      } catch (error) {
        console.error('❌ Token validation error:', error);
        console.log('❌ Removing invalid token...');
        this.removeToken();
        return false;
      }
    }
  
    // Get user from token
    static getUser(): User | null {
      const token = this.getToken();
      if (!token) {
        console.log('❌ No token for getUser()');
        return null;
      }
  
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          console.error('❌ Invalid token format in getUser()');
          return null;
        }
  
        // Decode the payload using base64url decoding
        const payload = JSON.parse(this.base64UrlDecode(parts[1]));
        console.log('✅ User from token:', payload.user);
        return payload.user;
      } catch (error) {
        console.error('❌ Error getting user from token:', error);
        return null;
      }
    }
  
    // Start GitHub OAuth flow
    static loginWithGitHub(): void {
      window.location.href = `${this.API_BASE}/auth/github`;
    }
  
    // Handle OAuth callback (extract token from URL)
    static handleOAuthCallback(): User | null {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');
  
      console.log('🔍 Checking OAuth callback...', { hasToken: !!token, error });
  
      if (error) {
        console.error('❌ OAuth error:', error);
        return null;
      }
  
      if (token) {
        console.log('✅ Token found in URL, storing...');
        this.setToken(token);
        
        // Clean up URL immediately
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        const user = this.getUser();
        console.log('✅ User extracted from token:', user);
        return user;
      }
  
      console.log('ℹ️ No token in URL, checking localStorage...');
      return null;
    }
  
    // Logout
    static async logout(): Promise<void> {
      const token = this.getToken();
      
      if (token) {
        try {
          await fetch(`${this.API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      }
  
      this.removeToken();
    }
  
    // Make authenticated API request
    static async apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
      const token = this.getToken();
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };
  
      return fetch(`${this.API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });
    }
  
    // Test GitHub connection
    static async testGitHubConnection(): Promise<any> {
      try {
        const response = await this.apiRequest('/auth/test-github');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('GitHub connection test failed:', error);
        throw error;
      }
    }
  }