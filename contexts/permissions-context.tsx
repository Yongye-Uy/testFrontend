"use client";

import { createContext, useContext } from "react";

type PermissionsContextValue = {
  permissions: string[] | null;
  hasPermission: (code: string) => boolean;
};

export const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: null,
  hasPermission: () => false,
});

export function usePermissionsContext() {
  return useContext(PermissionsContext);
}
