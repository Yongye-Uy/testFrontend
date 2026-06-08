import type { User } from "@/types/user";
import { isDirector, isSuperAdmin } from "./auth";

export type SidebarItem = {
  label: string;
  href: string;
  hint?: string;
};

export function sidebarForUser(user: User | null): SidebarItem[] {
  if (isSuperAdmin(user)) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Users", href: "/users" },
      { label: "Roles", href: "/roles" },
      { label: "Permissions", href: "/permissions", hint: "TODO" },
    ];
  }

  if (isDirector(user)) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Semesters", href: "/semesters" },
      { label: "Course Catalog", href: "/courses" },
      { label: "Batches", href: "/batches" },
      { label: "Users", href: "/users", hint: "TODO" },
    ];
  }

  return [
    { label: "Dashboard", href: "/dashboard" },
  ];
}
