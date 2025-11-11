import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { authAPI } from "../api/endpoints";
import type { User, LoginRequest, SignupRequest } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      setLoading(true);
      console.log('Checking session...');
      const response = await authAPI.session();
      console.log('Session response:', response.data);
      if (response.data.authenticated && response.data.user) {
        console.log('User authenticated:', response.data.user);
        setUser(response.data.user);
      } else {
        console.log('User not authenticated');
        setUser(null);
      }
    } catch (error) {
      // Silently fail on session check - user is just not logged in
      console.log("Session check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await authAPI.login(data);
    setUser(response.data.user);
  };

  const signup = async (data: SignupRequest) => {
    const response = await authAPI.signup(data);
    setUser(response.data.user);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
