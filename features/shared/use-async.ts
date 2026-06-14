"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loaderRef = useRef(loader);
  // Track the stringified key without memoizing — JSON.stringify only runs when
  // the ref value changes, not on every render.
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loaderRef.current());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const key = JSON.stringify(deps);
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, load]);

  return { data, loading, error, reload: load, setData };
}
