import { createContext, useContext, useState, useEffect } from "react";
import client from "@/api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("novatrade_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("novatrade_token"));
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!token;

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await client.post("/auth/login", { email, password });
      localStorage.setItem("novatrade_token", data.token);
      localStorage.setItem("novatrade_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Login failed" };
    } finally {
      setLoading(false);
    }
  }

  async function signup(username, email, password) {
    setLoading(true);
    try {
      const { data } = await client.post("/auth/signup", { username, email, password });
      localStorage.setItem("novatrade_token", data.token);
      localStorage.setItem("novatrade_user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Signup failed" };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("novatrade_token");
    localStorage.removeItem("novatrade_user");
    setToken(null);
    setUser(null);
  }

  // Refresh user data on mount
  useEffect(() => {
    if (token) {
      client.get("/auth/me").then(({ data }) => {
        setUser(data);
        localStorage.setItem("novatrade_user", JSON.stringify(data));
      }).catch(() => {
        logout();
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
