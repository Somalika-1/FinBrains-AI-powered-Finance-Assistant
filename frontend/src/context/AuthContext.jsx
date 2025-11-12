import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../config';
import { login as loginApi, register as registerApi, verifyEmail as verifyEmailApi, forgotPassword as forgotPasswordApi, resetPassword as resetPasswordApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    else localStorage.removeItem(STORAGE_KEYS.token);
  }, [token]);

  const login = async ({ email, password, rememberMe = false }) => {
    setLoading(true);
    try {
      const { data } = await loginApi({ email, password, rememberMe });
      const jwt = data?.data?.token || data?.token || data?.jwt;
      setToken(jwt);
      return { success: true };
    } catch (e) {
      return { success: false, message: e?.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const { data } = await registerApi(payload);
      // Some APIs auto-login on register and return token; if not, redirect to login
      const jwt = data?.data?.token || data?.token || data?.jwt;
      if (jwt) setToken(jwt);
      return { success: true };
    } catch (e) {
      return { success: false, message: e?.response?.data?.message || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setToken(null);

  const verifyEmail = async (token) => {
    try { return (await verifyEmailApi(token)).data; } catch (e) { return e?.response?.data || { success:false }; }
  };
  const forgotPassword = async (email) => {
    try { return (await forgotPasswordApi(email)).data; } catch (e) { return e?.response?.data || { success:false }; }
  };
  const resetPassword = async (token, newPassword) => {
    try { return (await resetPasswordApi(token, newPassword)).data; } catch (e) { return e?.response?.data || { success:false }; }
  };

  const value = useMemo(() => ({ token, isAuthenticated: !!token, login, register, logout, loading, verifyEmail, forgotPassword, resetPassword }), [token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
