import type { User } from "@/types/user";
import { isDirector, isLecturer, isSuperAdmin } from "./auth";

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
      { label: "Assessments", href: "/assessments" },
      { label: "Permissions", href: "/permissions" },
    ];
  }

  if (isDirector(user)) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Semesters", href: "/semesters" },
      { label: "Course Catalog", href: "/courses" },
      { label: "Batches", href: "/batches" },
      { label: "Users", href: "/users" },
    ];
  }

  if (isLecturer(user)) {
    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Assessments", href: "/assessments" },
    ];
  }

  return [{ label: "Dashboard", href: "/dashboard" }];
}
