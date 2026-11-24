import { useEffect, useState } from "react";
import { getMe } from "@/api/jataka";

export interface AuthUser {
  id: string;
  username: string;
  full_name: string | null;
  role: "admin" | "astrologer";
}

export interface AuthState {
  loading: boolean;
  user: AuthUser | null;
}

let cached: AuthUser | null | undefined;

export function setCachedUser(user: AuthUser | null) {
  cached = user;
}

// Fetches the current user from the server and primes the cache used by useAuth.
export async function loadUser(): Promise<AuthUser | null> {
  cached = ((await getMe()) as AuthUser | null) ?? null;
  return cached;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);

  useEffect(() => {
    if (cached !== undefined) return;
    let mounted = true;
    void loadUser().then((u) => {
      if (!mounted) return;
      setUser(u);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, user };
}
