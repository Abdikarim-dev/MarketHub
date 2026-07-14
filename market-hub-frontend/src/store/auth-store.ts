import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/api";
import { clearTokens, setTokens } from "@/lib/api";

interface AuthState {
  user: User | null;
  access: string | null;
  refresh: string | null;
  hydrated: boolean;
  setSession: (payload: {
    user: User;
    access: string;
    refresh: string;
  }) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      hydrated: false,
      setSession: ({ user, access, refresh }) => {
        setTokens(access, refresh);
        set({ user, access, refresh });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        clearTokens();
        set({ user: null, access: null, refresh: null });
      },
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "mh-auth",
      partialize: (state) => ({
        user: state.user,
        access: state.access,
        refresh: state.refresh,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.access && state?.refresh) {
          setTokens(state.access, state.refresh);
        }
        state?.setHydrated(true);
      },
    },
  ),
);
