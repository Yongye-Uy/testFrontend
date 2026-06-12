import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
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
        icon: DashboardRoundedIcon,
      },
      {
        label: "Users",
        href: "/users",
        icon: PeopleAltRoundedIcon,
      },
      {
        label: "Roles & Permissions",
        href: "/roles",
        icon: ShieldRoundedIcon,
      },
    ];
  }

  if (isDirector(user)) {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: DashboardRoundedIcon,
      },
      {
        label: "Semesters",
        href: "/semesters",
        icon: CalendarMonthRoundedIcon,
      },
      {
        label: "Course Catalog",
        href: "/courses",
        icon: MenuBookRoundedIcon,
      },
      {
        label: "Batches",
        href: "/batches",
        icon: GroupsRoundedIcon,
      },
      {
        label: "Users",
        href: "/users",
        icon: PeopleAltRoundedIcon,
      },
    ];
  }

  return [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: DashboardRoundedIcon,
    },
  ];
}
