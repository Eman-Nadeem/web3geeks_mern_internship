"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: UserProfile | null;
}) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [isLoading, setIsLoading] = useState<boolean>(!initialUser);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUser) return;

    let isSubscribed = true;

    async function fetchCurrentUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (isSubscribed) {
          if (res.ok) {
            const json = await res.json();
            setUser(json.data);
          } else {
            setUser(null);
          }
        }
      } catch {
        if (isSubscribed) {
          setUser(null);
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    void fetchCurrentUser();

    return () => {
      isSubscribed = false;
    };
  }, [initialUser]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const updateProfile = async (data: { name?: string; avatarUrl?: string }) => {
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error || "Failed to update profile" };
      }

      const updated = await res.json();
      setUser(updated.data);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-updated", { detail: { user: updated.data } })
        );
      }
      router.refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
