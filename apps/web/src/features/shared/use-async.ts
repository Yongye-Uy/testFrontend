"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";

export function useAsync<T>(loader: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loaderRef = useRef(loader);
  const dependencyKey = useMemo(() => JSON.stringify(deps), [deps]);

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
    void load();
  }, [dependencyKey, load]);

  return { data, loading, error, reload: load, setData };
}
