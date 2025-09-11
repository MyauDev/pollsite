"use client";
import { useState, useEffect } from 'react';
import { AuthState, checkAuth } from './auth-utils';

/**
 * React hook for authentication state
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      setLoading(true);
      try {
        const auth = await checkAuth();
        setAuthState(auth);
      } catch (error) {
        console.error('Auth verification failed:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
        });
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const refetchAuth = async () => {
    const auth = await checkAuth();
    setAuthState(auth);
  };

  return {
    ...authState,
    loading,
    refetchAuth,
  };
}
