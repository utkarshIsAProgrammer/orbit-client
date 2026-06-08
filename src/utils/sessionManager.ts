/**
 * Session Management with Token Refresh
 * 
 * This utility manages user sessions with automatic token refresh,
 * session timeout handling, and secure token storage.
 */

interface SessionData {
  token: string;
  refreshToken: string;
  userId: string;
  expiresAt: number;
}

class SessionManager {
  private static instance: SessionManager;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private refreshInProgress: boolean = false;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private readonly SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute

  private constructor() {
    this.initializeSessionCheck();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Store session data
   */
  setSession(data: SessionData): void {
    const sessionWithExpiry = {
      ...data,
      expiresAt: Date.now() + (data.expiresAt || 3600000), // Default 1 hour
    };

    localStorage.setItem('session', JSON.stringify(sessionWithExpiry));
    this.scheduleTokenRefresh(sessionWithExpiry.expiresAt);
  }

  /**
   * Get current session
   */
  getSession(): SessionData | null {
    const sessionStr = localStorage.getItem('session');
    if (!sessionStr) return null;

    try {
      const session = JSON.parse(sessionStr) as SessionData;
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }

      return session;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Get access token
   */
  getToken(): string | null {
    const session = this.getSession();
    return session?.token || null;
  }

  /**
   * Clear session
   */
  clearSession(): void {
    localStorage.removeItem('session');
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Schedule token refresh before expiry
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    const refreshTime = expiresAt - this.TOKEN_REFRESH_THRESHOLD;
    const delay = Math.max(0, refreshTime - Date.now());

    this.refreshTimeout = setTimeout(() => {
      this.refreshToken();
    }, delay);
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<boolean> {
    if (this.refreshInProgress) {
      return false;
    }

    const session = this.getSession();
    if (!session || !session.refreshToken) {
      return false;
    }

    this.refreshInProgress = true;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      
      this.setSession({
        token: data.token,
        refreshToken: data.refreshToken || session.refreshToken,
        userId: data.userId || session.userId,
        expiresAt: data.expiresAt || 3600000,
      });

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearSession();
      return false;
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Initialize periodic session check
   */
  private initializeSessionCheck(): void {
    setInterval(() => {
      const session = this.getSession();
      if (session) {
        const timeUntilExpiry = session.expiresAt - Date.now();
        
        // Refresh if token is about to expire
        if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD) {
          this.refreshToken();
        }
      }
    }, this.SESSION_CHECK_INTERVAL);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Get time until session expiry
   */
  getTimeUntilExpiry(): number | null {
    const session = this.getSession();
    if (!session) return null;
    return Math.max(0, session.expiresAt - Date.now());
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const session = this.getSession();
      if (session) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      this.clearSession();
      window.location.href = '/';
    }
  }
}

// Singleton instance
export const sessionManager = SessionManager.getInstance();

// Convenience functions
export const setSession = (data: SessionData) => sessionManager.setSession(data);
export const getSession = () => sessionManager.getSession();
export const getToken = () => sessionManager.getToken();
export const clearSession = () => sessionManager.clearSession();
export const isAuthenticated = () => sessionManager.isAuthenticated();
export const logout = () => sessionManager.logout();
