"use client";

import { useSession } from "next-auth/react";

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}
