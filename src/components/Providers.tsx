"use client";
import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { ToastProvider } from "@/components/Toast";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CartProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
