"use client";

import MenuIcon from "@mui/icons-material/Menu";
import { ProfileDropdown } from "./ProfileDropdown";
import { RoleSwitcher } from "./RoleSwitcher";
import type { Role, User } from "@/lib/types";

interface TopbarProps {
  /** Pass null until auth is wired; the dropdown renders an "Account" placeholder. */
  user: User | null;
  role: Role;
  contextLabel?: string;
  onOpenMobileSidebar?: () => void;
}

export function Topbar({
  user,
  role,
  contextLabel,
  onOpenMobileSidebar,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-cream-50/85 backdrop-blur-md border-b border-ink-200">
      <div className="flex items-center gap-3 px-4 lg:px-6 py-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation"
          className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center text-ink-700 hover:bg-cream-200 transition"
        >
          <MenuIcon />
        </button>

        <div className="flex-1" />

        {contextLabel && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cream-200/70 text-xs font-medium text-ink-700 ring-1 ring-ink-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {contextLabel}
          </div>
        )}

        <RoleSwitcher current={role} />
        <ProfileDropdown user={user} role={role} />
      </div>
    </header>
  );
}
