"use client";
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { API } from "@/lib/api";
import { getSocket } from "@/lib/callSocket";

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
  unreadMessages: number;      // oxunmamış mesaj sayı (qlobal, real-time)
  refreshUnread: () => void;   // sayı yenidən çək (məs. söhbət açılıb oxunanda)
  refreshUser: () => void;     // /me yenidən çək (təsdiq, rol, blok dəyişəndə)
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // refreshUser (useCallback) logout-u ondan ƏVVƏL tanıdılan funksiyadan çağırır.
  const logoutRef = useRef<() => void>(() => {});

  // Oxunmamış mesaj sayını serverdən çək.
  const refreshUnread = useCallback(() => {
    const t = token || (typeof localStorage !== "undefined" ? localStorage.getItem("userToken") : null);
    if (!t) { setUnreadMessages(0); return; }
    fetch(`${API}/messages-unread`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json()).then((d) => setUnreadMessages(d.count || 0)).catch(() => {});
  }, [token]);

  // İstifadəçi məlumatını (/me) təzələ. Admin kimliyi/satıcılığı/biznesi
  // təsdiqləyəndə, rolu dəyişəndə və ya bloklayanda səhifə yenilənmədən
  // bütün sayt (menyu, düymələr, "təsdiqli" nişanları) yeni vəziyyəti görsün.
  const refreshUser = useCallback(() => {
    const t = token || (typeof localStorage !== "undefined" ? localStorage.getItem("userToken") : null);
    if (!t) return;
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) return;
        // Admin hesabı bloklayıb — açıq sessiya da dərhal bağlanır.
        if (d.user.isBlocked) {
          try { window.alert("Hesabınız administrator tərəfindən bloklanıb."); } catch { /* boş */ }
          logoutRef.current();
          return;
        }
        setUser(d.user);
        localStorage.setItem("userData", JSON.stringify(d.user));
      })
      .catch(() => {});
  }, [token]);

  // Qlobal socket bağlantısı — istifadəçi hansı səhifədə olsa da onlayn sayılır
  // (presence işləsin) və gələn mesaj chat badge-ini real-time yeniləsin.
  // `user` deyil `userId` asılılığı: /me təzələnəndə socket abunəliyi yenidən
  // qurulmasın.
  const userId = user?.id;
  useEffect(() => {
    if (!token || !userId) { setUnreadMessages(0); return; }
    refreshUnread();
    const socket = getSocket(token);           // qoşulmanı qur (singleton)
    const bump = () => refreshUnread();
    const PROFILE_KINDS = ["account", "identity", "seller", "business"];
    const onLive = (e: { kind?: string }) => { if (e?.kind && PROFILE_KINDS.includes(e.kind)) refreshUser(); };
    socket.on("chat:message", bump);
    socket.on("chat:read", bump);
    socket.on("chat:deleted", bump);
    socket.on("live:update", onLive);
    return () => {
      socket.off("chat:message", bump);
      socket.off("chat:read", bump);
      socket.off("chat:deleted", bump);
      socket.off("live:update", onLive);
    };
  }, [token, userId, refreshUnread, refreshUser]);

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
      // Zədəli userData (məs. "undefined") bütün tətbiqi çökdürməməlidir —
      // parse xətasında sadəcə saxlanmış məlumatı atırıq, /me onsuz da yenilləyir.
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); }
        catch { localStorage.removeItem("userData"); }
      }
      fetch(`${API}/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => {
          // Cavabda user yoxdursa "undefined" sətri yazmırıq — sessiyanı bitiririk.
          if (!d?.user) throw new Error("user yoxdur");
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
    // Cari cihaz sessiyasını serverdə bağla (fire-and-forget, token silinməzdən əvvəl).
    const t = token || (typeof localStorage !== "undefined" ? localStorage.getItem("userToken") : null);
    if (t) {
      try {
        fetch(`${API}/me/logout`, { method: "POST", headers: { Authorization: `Bearer ${t}` }, keepalive: true }).catch(() => {});
      } catch { /* yox */ }
    }
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
  useEffect(() => { logoutRef.current = logout; });

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!user, authLoading, unreadMessages, refreshUnread, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
