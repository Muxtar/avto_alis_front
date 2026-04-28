"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API } from "@/lib/api";

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  type: string;
  role: string;
  profileComplete?: boolean;
  sellerVerified?: boolean;
  sellerApplication?: { status: string; rejectionReason?: string | null; submittedAt?: string } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoggedIn: boolean;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check userToken first, then fallback to adminToken for admin auto-login
    let savedToken = localStorage.getItem("userToken");
    let savedUser = localStorage.getItem("userData");

    // If no userToken but adminToken exists, use admin token for user side too
    if (!savedToken) {
      const adminToken = localStorage.getItem("adminToken");
      if (adminToken) {
        savedToken = adminToken;
      }
    }

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => {
          setUser(d.user);
          setToken(savedToken);
          localStorage.setItem("userToken", savedToken!);
          localStorage.setItem("userData", JSON.stringify(d.user));
        })
        .catch(() => { setToken(null); setUser(null); localStorage.removeItem("userToken"); localStorage.removeItem("userData"); })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("userToken", newToken);
    localStorage.setItem("userData", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("courierToken");
    localStorage.removeItem("courierData");
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!user, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
