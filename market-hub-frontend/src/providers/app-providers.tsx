"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/auth-store";

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeClient);
  const logout = useAuthStore((s) => s.logout);

  React.useEffect(() => {
    const onLogout = () => logout();
    window.addEventListener("mh:logout", onLogout);
    return () => window.removeEventListener("mh:logout", onLogout);
  }, [logout]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={client}>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
