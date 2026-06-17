import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import MonitorHeartOutlinedIcon from "@mui/icons-material/MonitorHeartOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { User } from "@/types/user";
import { isDirector, isLecturer, isSuperAdmin } from "./auth";

export type SidebarItem = {
  label: string;
  href: string;
  hint?: string;
  icon?: SvgIconComponent;
  permission?: string;
  comingSoon?: boolean;
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
    permission: "semester.create",
  },
  {
    label: "Course Catalog",
    href: "/courses",
    icon: MenuBookOutlinedIcon,
    permission: "course.create",
  },
  {
    label: "Batches",
    href: "/batches",
    icon: GroupsOutlinedIcon,
    permission: "batch.read",
  },
  // System Admin section
  {
    label: "System Health",
    href: "/system-health",
    icon: MonitorHeartOutlinedIcon,
    permission: "config.read",
    comingSoon: true,
  },
  {
    label: "Configuration",
    href: "/configuration",
    icon: TuneOutlinedIcon,
    permission: "config.read",
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: ExtensionOutlinedIcon,
    permission: "integration.read",
  },
  {
    label: "API Gateway",
    href: "/api-gateway",
    icon: RouterOutlinedIcon,
    permission: "config.read",
    comingSoon: true,
  },
  {
    label: "Storage",
    href: "/storage",
    icon: StorageOutlinedIcon,
    permission: "config.read",
    comingSoon: true,
  },
  {
    label: "Observability",
    href: "/observability",
    icon: BarChartOutlinedIcon,
    permission: "config.read",
    comingSoon: true,
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
    return ALL_SIDEBAR_ITEMS.filter(
      (item) => item.href !== "/roles" && !item.permission?.startsWith("config") && !item.permission?.startsWith("integration"),
    );
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
