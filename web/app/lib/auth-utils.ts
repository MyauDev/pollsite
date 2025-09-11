// Utility functions for authentication

export interface User {
  id: number;
  email: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

/**
 * Check if user is authenticated by calling the /api/auth/me endpoint
 */
export async function checkAuth(): Promise<AuthState> {
  try {
    const res = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'include',
    });

    if (res.ok) {
      const user: User = await res.json();
      return {
        isAuthenticated: true,
        user,
      };
    } else {
      return {
        isAuthenticated: false,
        user: null,
      };
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    return {
      isAuthenticated: false,
      user: null,
    };
  }
}

/**
 * Logout by clearing all auth-related cookies
 */
export function logout() {
  // Clear all auth cookies
  document.cookie = 'jwt=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'jwt_fallback=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'sessionid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  document.cookie = 'csrftoken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  
  // Redirect to home page
  window.location.href = '/';
}

/**
 * Get JWT token from cookies (client-side fallback only)
 */
export function getClientJWT(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'jwt_fallback') {
      return value;
    }
  }
  return null;
}
