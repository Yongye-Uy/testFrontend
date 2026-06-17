import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { User } from "@/types/user";
import { isDirector, isLecturer, isSuperAdmin } from "./auth";

export type SidebarItem = {
  label: string;
  href: string;
  hint?: string;
  icon?: SvgIconComponent;
  permission?: string;
};

// Master list — each item declares its required RBAC permission code.
// Items with no permission are always visible (e.g. Dashboard).
const ALL_SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardOutlinedIcon },
  {
    label: "Users",
    href: "/users",
    icon: PeopleAltOutlinedIcon,
    permission: "user.list",
  },
  {
    label: "Roles & Permissions",
    href: "/roles",
    icon: VerifiedUserOutlinedIcon,
    permission: "role.read",
  },
  {
    label: "Semesters",
    href: "/semesters",
    icon: CalendarMonthOutlinedIcon,
    // write permission = manages resource; semester.read alone means reference data for other pages
    permission: "semester.create",
  },
  {
    label: "Course Catalog",
    href: "/courses",
    icon: MenuBookOutlinedIcon,
    // write permission = manages resource; course.read alone means reference data for batch/class pages
    permission: "course.create",
  },
  {
    label: "Batches",
    href: "/batches",
    icon: GroupsOutlinedIcon,
    permission: "batch.read",
  },
  {
    label: "Configuration",
    href: "/configuration",
    icon: TuneOutlinedIcon,
    permission: "config.read",
  },
];

// Permission-based sidebar — driven by the user's actual RBAC permissions.
export function sidebarForPermissions(permissions: string[]): SidebarItem[] {
  const permSet = new Set(permissions);
  return ALL_SIDEBAR_ITEMS.filter(
    (item) => !item.permission || permSet.has(item.permission),
  );
}

// Role-based fallback used while the permissions API call is in-flight.
export function sidebarForUser(user: User | null): SidebarItem[] {
  if (isSuperAdmin(user)) {
    return ALL_SIDEBAR_ITEMS;
  }

  if (isDirector(user)) {
    return ALL_SIDEBAR_ITEMS.filter((item) => item.href !== "/roles");
  }

  if (isLecturer(user)) {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: DashboardOutlinedIcon,
      },
      {
        label: "My Classes",
        href: "/classes",
        icon: MenuBookOutlinedIcon,
      },
    ];
  }

  return ALL_SIDEBAR_ITEMS.filter((item) => !item.permission);
}
