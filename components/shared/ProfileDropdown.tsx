"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import type { Role, User } from "@/lib/types";

interface ProfileDropdownProps {
  /** Pass `null` to render an "Account" placeholder while auth is unwired. */
  user: User | null;
  role: Role;
}

export function ProfileDropdown({ user, role }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const initials = user?.initials ?? "•";
  const avatarColor = user?.avatarColor ?? "bg-ink-400";
  const name = user?.name ?? "Account";
  const email = user?.email ?? "Not signed in";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-cream-200 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div
          className={`h-8 w-8 rounded-full ${avatarColor} text-cream-50 flex items-center justify-center text-xs font-bold ring-2 ring-cream-50`}
        >
          {initials}
        </div>
        <KeyboardArrowDownIcon
          style={{ fontSize: 16 }}
          className="text-ink-500"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-pop ring-1 ring-ink-200 z-40 overflow-hidden"
            role="menu"
          >
            <div className="px-4 py-3 bg-cream-100 border-b border-ink-100">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full ${avatarColor} text-cream-50 flex items-center justify-center text-sm font-bold`}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy-900 truncate">
                    {name}
                  </div>
                  <div className="text-[11px] text-ink-500 truncate">
                    {email}
                  </div>
                </div>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-full ring-1 ring-gold-200">
                {role}
              </div>
            </div>
            <div className="p-1">
              <button
                role="menuitem"
                onClick={() => go(`/${role}/profile`)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-cream-100 text-sm text-ink-700 transition"
              >
                <span className="text-ink-500">
                  <PersonOutlineIcon style={{ fontSize: 18 }} />
                </span>
                Profile
              </button>
              <button
                role="menuitem"
                onClick={() => go(`/${role}/settings`)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-cream-100 text-sm text-ink-700 transition"
              >
                <span className="text-ink-500">
                  <SettingsOutlinedIcon style={{ fontSize: 18 }} />
                </span>
                Settings
              </button>
            </div>
            <div className="border-t border-ink-100 p-1">
              <button
                onClick={() => router.push("/login")}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-rose-50 text-sm text-rose-700 transition"
              >
                <LogoutOutlinedIcon style={{ fontSize: 18 }} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
