"use client";

import { useEffect, useState } from "react";
import { api, type PlatformConfig } from "@/app/services/api-client";

const DEFAULT: PlatformConfig = {
  platform_name: "EPPLMS",
  institution_name: "",
  institution_location: "",
  session_timeout_minutes: 60,
  refresh_token_days: 7,
  password_min_length: 8,
  allowed_email_domains: [],
};

let cached: PlatformConfig | null = null;

export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig>(cached ?? DEFAULT);

  useEffect(() => {
    if (cached) {
      setConfig(cached);
      return;
    }
    api.platformConfig
      .get()
      .then((data) => {
        cached = data;
        setConfig(data);
      })
      .catch(() => {});
  }, []);

  return config;
}

// Call this after a successful UpdatePlatformConfig so cache is refreshed.
export function invalidatePlatformConfigCache() {
  cached = null;
}
