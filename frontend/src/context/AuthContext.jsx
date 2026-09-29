import { createContext, useContext, useEffect, useState } from "react";
import { login as loginRequest, register as registerRequest, fetchMe, updateName } from "../api/auth";
import {
  clearStoredSession,
  hasStoredSession,
  isDefiniteAuthFailure,
  readStoredUser,
  refreshSession,
  withWake,
  writeStoredUser,
} from "../api/client";

const AuthContext = createContext(null);
const WAKE_ATTEMPTS = 4;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (hasStoredSession() ? readStoredUser() : null));
  const [loading, setLoading] = useState(() => hasStoredSession() && !readStoredUser());
  const [connecting, setConnecting] = useState(() => hasStoredSession());

  useEffect(() => {
    if (!hasStoredSession()) {
      writeStoredUser(null);
      setLoading(false);
      setConnecting(false);
      return undefined;
    }

    let cancelled = false;

    async function slideRefresh() {
      if (!localStorage.getItem("mindarena_refresh_token")) return;
      try {
        await withWake(() => refreshSession(), WAKE_ATTEMPTS);
      } catch (error) {
        if (!isDefiniteAuthFailure(error)) return;
        clearStoredSession();
        if (!cancelled) setUser(null);
      }
    }

    (async () => {
      try {
        const me = await fetchMe(WAKE_ATTEMPTS);
        if (cancelled) return;
        setUser(me);
        writeStoredUser(me);
        await slideRefresh();
      } catch (error) {
        if (cancelled) return;
        if (isDefiniteAuthFailure(error)) {
          clearStoredSession();
          setUser(null);
          return;
        }
        setUser(readStoredUser());
      } finally {
        if (!cancelled) {
          setConnecting(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function persistTokens({ access_token, refresh_token }) {
    localStorage.setItem("mindarena_access_token", access_token);
    localStorage.setItem("mindarena_refresh_token", refresh_token);
  }

  function remember(next) {
    writeStoredUser(next);
    setUser(next);
  }

  async function login(credentials) {
    const data = await loginRequest(credentials);
    persistTokens(data);
    remember(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await registerRequest(payload);
    persistTokens(data);
    remember(data.user);
    return data.user;
  }

  function logout() {
    clearStoredSession();
    setUser(null);
  }

  async function refreshUser() {
    const data = await fetchMe();
    remember(data);
    return data;
  }

  async function saveName(fullName) {
    const data = await updateName(fullName);
    remember(data);
    return data;
  }

  return (
    <AuthContext.Provider value={{ user, loading, connecting, login, register, logout, refreshUser, saveName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
