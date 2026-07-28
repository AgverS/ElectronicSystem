"use client";

import { useCallback, useState } from "react";

export function useTableSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      if (allSelected) return new Set<string>();
      return new Set<string>(ids);
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  function isAllSelected(ids: string[]) {
    return ids.length > 0 && ids.every((id) => selected.has(id));
  }

  function isIndeterminate(ids: string[]) {
    return ids.some((id) => selected.has(id)) && !isAllSelected(ids);
  }

  return { selected, toggle, toggleAll, clear, isAllSelected, isIndeterminate };
}
