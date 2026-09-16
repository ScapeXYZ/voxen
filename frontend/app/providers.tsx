"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { WalletProvider } from "@/lib/genlayer/WalletProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  // Use useState to ensure QueryClient is only created once per component lifecycle
  // This prevents the client from being recreated on every render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const handleTheme = (event: Event) => setTheme((event as CustomEvent<"light" | "dark">).detail);
    syncTheme();
    window.addEventListener("voxen-theme-change", handleTheme);
    return () => window.removeEventListener("voxen-theme-change", handleTheme);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>{children}</WalletProvider>
      <Toaster
        position="top-right"
        theme={theme}
        richColors
        closeButton
        offset="80px"
      />
    </QueryClientProvider>
  );
}
