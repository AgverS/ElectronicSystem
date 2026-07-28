"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

/**
 * Returns a function that refreshes ALL data after a mutation:
 * invalidates every React Query cache entry (so client-fetched tables
 * refetch) and refreshes the server-component tree (so revalidatePath
 * results show up too). Call it after any create/update/delete.
 */
export function useRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return () => {
    queryClient.invalidateQueries();
    router.refresh();
  };
}
