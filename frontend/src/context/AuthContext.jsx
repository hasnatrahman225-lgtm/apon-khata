import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On every app launch (new device, new browser, after logout+login) we try
  // to restore the session purely from the token + /auth/me. The actual data
  // recovery guarantee comes from the backend: it's keyed by email, not by
  // this token or this device.
  useEffect(() => {
    const token = localStorage.getItem("khata_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.login({ email, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function register(payload) {
    const res = await api.register(payload);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function loginWithGoogle(idToken) {
    const res = await api.loginWithGoogle(idToken);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function resetPassword(email, newPassword) {
    const res = await api.resetPassword({ email, newPassword });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, resetPassword, loginWithGoogle, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
