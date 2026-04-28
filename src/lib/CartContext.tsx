"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { API } from "@/lib/api";

interface CartContextType {
  cartCount: number;
  addToCart: (listingId: number, quantity?: number) => Promise<{ success: boolean; message?: string }>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn } = useAuth();
  const [cartCount, setCartCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!token) { setCartCount(0); return; }
    try {
      const res = await fetch(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCartCount(data.cart?.items?.length || 0);
    } catch {
      setCartCount(0);
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) refreshCart();
    else setCartCount(0);
  }, [isLoggedIn, refreshCart]);

  const addToCart = useCallback(async (listingId: number, quantity = 1) => {
    if (!token) return { success: false, message: "Daxil olun" };
    try {
      const res = await fetch(`${API}/cart/add`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshCart();
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: "Xəta baş verdi" };
    }
  }, [token, refreshCart]);

  return (
    <CartContext.Provider value={{ cartCount, addToCart, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
