import { createContext, useContext, useEffect, useMemo, useState } from "react";
import ProjectService from "../services/ProjectService";

const AuthContext = createContext(null);

const TOKEN_KEY = "cipherstudio.authToken";
const USER_KEY = "cipherstudio.user";

const readStoredAuth = () => {
  if (typeof window === "undefined") return { token: null, user: null };
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const rawUser = window.localStorage.getItem(USER_KEY);
    return {
      token,
      user: rawUser ? JSON.parse(rawUser) : null
    };
  } catch (error) {
    console.error("Failed to read stored auth state", error);
    return { token: null, user: null };
  }
};

const persistAuthState = (token, user) => {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }

    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error("Failed to persist auth state", error);
  }
};

export const AuthProvider = ({ children }) => {
  const stored = readStoredAuth();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);

  useEffect(() => {
    ProjectService.setAuthToken(token ?? null);
  }, [token]);

  const login = async (credentials) => {
    const data = await ProjectService.login(credentials);
    ProjectService.setAuthToken(data.token ?? null);
    persistAuthState(data.token ?? null, data.user ?? null);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (payload) => {
    const data = await ProjectService.register(payload);
    ProjectService.setAuthToken(data.token ?? null);
    persistAuthState(data.token ?? null, data.user ?? null);
    setToken(data.token ?? null);
    setUser(data.user ?? null);
    return data;
  };

  const logout = () => {
    ProjectService.setAuthToken(null);
    persistAuthState(null, null);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
