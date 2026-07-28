"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Loads data for a screen from the demo database.
 *
 * Pages in this build are client components, but the query code inside the
 * loader is the same code the server components used to run — the demo database
 * speaks the same dialect. Any mutation invalidates every query (see
 * QueryProvider), so views stay in step without manual cache plumbing.
 */
export function useDemoData<T>(
  key: readonly unknown[],
  loader: () => Promise<T>,
  options: { enabled?: boolean } = {},
) {
  const query = useQuery({
    queryKey: key,
    queryFn: loader,
    enabled: options.enabled ?? true,
    staleTime: 0,
  });

  return {
    data: query.data,
    loading: query.isPending && (options.enabled ?? true),
    error: query.error,
  };
}
