import type { User } from "@/app/types/user";
import { isDirector, isSuperAdmin } from "./auth";

export function canManageUsers(user: User | null) {
  return isSuperAdmin(user);
}

export function canManageDirectorWorkflow(user: User | null) {
  return isSuperAdmin(user) || isDirector(user);
}
