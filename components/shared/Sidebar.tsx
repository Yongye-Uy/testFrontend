"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/branding/Logo";
import type { Role } from "@/lib/types";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import GradeOutlinedIcon from "@mui/icons-material/GradeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import IntegrationInstructionsOutlinedIcon from "@mui/icons-material/IntegrationInstructionsOutlined";
import RouterOutlinedIcon from "@mui/icons-material/RouterOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import MonitorHeartOutlinedIcon from "@mui/icons-material/MonitorHeartOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  /** When true, only matches the exact path (no nested-route highlight). */
  end?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const ic = { fontSize: 20 } as const;

const navByRole: Record<Role, NavGroup[]> = {
  student: [
    {
      items: [
        {
          to: "/student",
          label: "Dashboard",
          icon: <DashboardOutlinedIcon style={ic} />,
          end: true,
        },
        {
          to: "/student/courses",
          label: "My Classes",
          icon: <MenuBookOutlinedIcon style={ic} />,
        },
        {
          to: "/student/grades",
          label: "Grades",
          icon: <GradeOutlinedIcon style={ic} />,
        },
      ],
    },
  ],
  lecturer: [
    {
      items: [
        {
          to: "/lecturer",
          label: "Dashboard",
          icon: <DashboardOutlinedIcon style={ic} />,
          end: true,
        },
        {
          to: "/lecturer/courses",
          label: "My Classes",
          icon: <MenuBookOutlinedIcon style={ic} />,
        },
      ],
    },
  ],
  director: [
    {
      label: "Academic",
      items: [
        {
          to: "/director",
          label: "Dashboard",
          icon: <DashboardOutlinedIcon style={ic} />,
          end: true,
        },
        {
          to: "/director/semesters",
          label: "Semesters",
          icon: <CalendarMonthOutlinedIcon style={ic} />,
        },
        {
          to: "/director/courses",
          label: "Course Catalog",
          icon: <MenuBookOutlinedIcon style={ic} />,
        },
        {
          to: "/director/batches",
          label: "Batches",
          icon: <GroupsOutlinedIcon style={ic} />,
        },
      ],
    },
    {
      label: "People",
      items: [
        {
          to: "/director/users",
          label: "Users",
          icon: <PeopleAltOutlinedIcon style={ic} />,
        },
      ],
    },
  ],
  admin: [
    {
      label: "Identity & Access",
      items: [
        {
          to: "/admin",
          label: "Dashboard",
          icon: <DashboardOutlinedIcon style={ic} />,
          end: true,
        },
        {
          to: "/admin/users",
          label: "Users",
          icon: <PeopleAltOutlinedIcon style={ic} />,
        },
        {
          to: "/admin/rbac",
          label: "Roles & Permissions",
          icon: <VerifiedUserOutlinedIcon style={ic} />,
        },
      ],
    },
    {
      label: "Platform",
      items: [
        {
          to: "/admin/system-health",
          label: "System Health",
          icon: <MonitorHeartOutlinedIcon style={ic} />,
        },
        {
          to: "/admin/configuration",
          label: "Configuration",
          icon: <TuneOutlinedIcon style={ic} />,
        },
        {
          to: "/admin/integrations",
          label: "Integrations",
          icon: <IntegrationInstructionsOutlinedIcon style={ic} />,
        },
        {
          to: "/admin/gateway",
          label: "API Gateway",
          icon: <RouterOutlinedIcon style={ic} />,
        },
        {
          to: "/admin/storage",
          label: "Storage",
          icon: <StorageOutlinedIcon style={ic} />,
        },
      ],
    },
    {
      label: "Observability",
      items: [
        {
          to: "/admin/observability",
          label: "Observability",
          icon: <SpeedOutlinedIcon style={ic} />,
        },
      ],
    },
  ],
};

const roleLabel: Record<Role, string> = {
  student: "Student Portal",
  lecturer: "Lecturer Portal",
  director: "Director Portal",
  admin: "System Admin",
};

interface SidebarProps {
  role: Role;
  desktopCollapsed: boolean;
  mobileOpen: boolean;
  onToggleDesktop: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  role,
  desktopCollapsed,
  mobileOpen,
  onToggleDesktop,
  onCloseMobile,
}: SidebarProps) {
  const groups = navByRole[role];
  return (
    <>
      <DesktopSidebar
        role={role}
        groups={groups}
        collapsed={desktopCollapsed}
        onToggle={onToggleDesktop}
      />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-navy-950/40 backdrop-blur-sm z-40"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-ink-200 shadow-2xl z-50 flex flex-col"
            >
              <SidebarBody
                role={role}
                groups={groups}
                collapsed={false}
                onItemClick={onCloseMobile}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function DesktopSidebar({
  role,
  groups,
  collapsed,
  onToggle,
}: {
  role: Role;
  groups: NavGroup[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`hidden lg:flex shrink-0 bg-white border-r border-ink-200 shadow-[2px_0_10px_-4px_rgba(15,44,92,0.08)] text-ink-700 flex-col relative transition-[width] duration-300 ease-out ${collapsed ? "w-[72px]" : "w-64"}`}
    >
      <SidebarBody role={role} groups={groups} collapsed={collapsed} />
      <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-7 h-6 w-6 rounded-full bg-white ring-1 ring-ink-200 shadow-card flex items-center justify-center text-navy-700 hover:bg-cream-100 hover:text-navy-900 transition z-10"
      >
        {collapsed ? (
          <KeyboardDoubleArrowRightIcon style={{ fontSize: 16 }} />
        ) : (
          <KeyboardDoubleArrowLeftIcon style={{ fontSize: 16 }} />
        )}
      </button>
    </aside>
  );
}

function SidebarBody({
  role,
  groups,
  collapsed,
  onItemClick,
}: {
  role: Role;
  groups: NavGroup[];
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (to: string, end?: boolean) => {
    if (!pathname) return false;
    if (end) return pathname === to;
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <>
      <div
        className={`px-5 py-5 border-b border-ink-100 ${collapsed ? "flex justify-center px-3" : ""}`}
      >
        <Logo variant="dark" compact={collapsed} />
      </div>

      {!collapsed && (
        <div className="px-5 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 font-semibold">
            {roleLabel[role]}
          </p>
        </div>
      )}

      <nav
        className={`flex-1 ${collapsed ? "px-2 pt-3" : "px-3"} space-y-4 overflow-y-auto pb-4`}
      >
        {groups.map((g, gi) => (
          <div key={gi}>
            {!collapsed && g.label && (
              <p className="px-3 mb-1 text-[9px] uppercase tracking-[0.2em] text-ink-400 font-bold">
                {g.label}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-3 my-2 h-px bg-ink-100" />
            )}
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = isActive(it.to, it.end);
                return (
                  <Link
                    key={it.to}
                    href={it.to}
                    onClick={onItemClick}
                    title={collapsed ? it.label : undefined}
                    className={`group flex items-center gap-3 ${collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"} rounded-lg text-sm font-medium transition relative ${active ? "bg-navy-50 text-navy-900" : "text-ink-600 hover:bg-cream-100 hover:text-navy-900"}`}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-gold-500 rounded-r-full" />
                    )}
                    <span
                      className={
                        active
                          ? "text-navy-800"
                          : "text-ink-500 group-hover:text-navy-700"
                      }
                    >
                      {it.icon}
                    </span>
                    {!collapsed && <span>{it.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
