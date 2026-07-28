"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { onDemoDataChange } from "@/lib/demo-db/client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            refetchOnWindowFocus: false,
            retry: 0,
          },
        },
      }),
  );

  // Every write to the demo database refreshes whatever is on screen, so views
  // never show data the visitor has just changed elsewhere.
  useEffect(() => onDemoDataChange(() => queryClient.invalidateQueries()), [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
