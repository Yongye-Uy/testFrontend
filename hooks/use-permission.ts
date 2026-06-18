"use client";

import { usePermissionsContext } from "@/contexts/permissions-context";
import { useAuth } from "./use-auth";
import { canManageDirectorWorkflow, canManageUsers } from "@/lib/permissions";
import { isSuperAdmin } from "@/lib/auth";

export function usePermission() {
  const { user } = useAuth();
  const { hasPermission } = usePermissionsContext();

  return {
    // Role-based helpers (kept for backwards compatibility)
    canManageUsers: canManageUsers(user),
    canManageDirectorWorkflow: canManageDirectorWorkflow(user),
    isSuperAdmin: isSuperAdmin(user),

    // API-permission–based check — use this for new pages.
    // Super-admins bypass the check; others need the permission code in their list.
    hasPermission,
  };
}
