"use client";

import { canManageDirectorWorkflow, canManageUsers } from "@/lib/permissions";
import { useAuth } from "./use-auth";

export function usePermission() {
  const { user } = useAuth();
  return {
    canManageUsers: canManageUsers(user),
    canManageDirectorWorkflow: canManageDirectorWorkflow(user),
  };
}
