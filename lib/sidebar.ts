import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { User } from "@/types/user";
import { isDirector, isSuperAdmin } from "./auth";

export type SidebarItem = {
  label: string;
  href: string;
  hint?: string;
  icon?: SvgIconComponent;
};

export function sidebarForUser(user: User | null): SidebarItem[] {
  if (isSuperAdmin(user)) {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: DashboardOutlinedIcon,
      },
      {
        label: "Users",
        href: "/users",
        icon: PeopleAltOutlinedIcon,
      },
      {
        label: "Roles & Permissions",
        href: "/roles",
        icon: VerifiedUserOutlinedIcon,
      },
    ];
  }

  if (isDirector(user)) {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: DashboardOutlinedIcon,
      },
      {
        label: "Semesters",
        href: "/semesters",
        icon: CalendarMonthOutlinedIcon,
      },
      {
        label: "Course Catalog",
        href: "/courses",
        icon: MenuBookOutlinedIcon,
      },
      {
        label: "Batches",
        href: "/batches",
        icon: GroupsOutlinedIcon,
      },
      {
        label: "Users",
        href: "/users",
        icon: PeopleAltOutlinedIcon,
      },
    ];
  }

  return [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: DashboardOutlinedIcon,
    },
  ];
}
