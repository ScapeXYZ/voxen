"use client";
import { useEffect, useState } from "react";
import { credentialProvider } from "@/lib/voxen/credentials/provider";
import type {
  Credential,
  CredentialProvider,
} from "@/lib/voxen/credentials/types";
export function useCredentialSearch(
  query: string,
  provider: CredentialProvider = credentialProvider,
) {
  const [state, setState] = useState<{
    results: Credential[];
    loading: boolean;
    error: string;
  }>({ results: [], loading: true, error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ results: [], loading: true, error: "" });
    const timer = setTimeout(() => {
      provider
        .search(query, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted)
            setState({ results, loading: false, error: "" });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setState({
              results: [],
              loading: false,
              error: "Could not load credentials.",
            });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, provider, retry]);
  return { ...state, retry: () => setRetry((n) => n + 1) };
}
