"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CastForEducationOutlinedIcon from "@mui/icons-material/CastForEducationOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import { motion, AnimatePresence } from "framer-motion";
import type { Role } from "@/lib/types";

const roles: {
  key: Role;
  label: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
}[] = [
  {
    key: "student",
    label: "Student",
    path: "/student",
    icon: <SchoolOutlinedIcon style={{ fontSize: 18 }} />,
    tone: "text-emerald-700 bg-emerald-50",
  },
  {
    key: "lecturer",
    label: "Lecturer",
    path: "/lecturer",
    icon: <CastForEducationOutlinedIcon style={{ fontSize: 18 }} />,
    tone: "text-navy-700 bg-navy-50",
  },
  {
    key: "director",
    label: "Director",
    path: "/director",
    icon: <AccountTreeOutlinedIcon style={{ fontSize: 18 }} />,
    tone: "text-gold-800 bg-gold-50",
  },
  {
    key: "admin",
    label: "Super Admin",
    path: "/admin",
    icon: <AdminPanelSettingsOutlinedIcon style={{ fontSize: 18 }} />,
    tone: "text-rose-700 bg-rose-50",
  },
];

interface RoleSwitcherProps {
  current: Role;
}

/**
 * Demo affordance: lets a reviewer hop between role-specific panels.
 * Remove or gate behind a feature flag once real auth is in place.
 */
export function RoleSwitcher({ current }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const active = roles.find((r) => r.key === current) ?? roles[0];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-full bg-navy-900 text-cream-50 hover:bg-navy-800 transition text-xs font-medium ring-1 ring-navy-700"
      >
        <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-gold-500/15 text-gold-400 text-[10px] uppercase tracking-wider font-bold">
          <VisibilityOutlinedIcon style={{ fontSize: 12 }} />
          Demo
        </span>
        <span>View as {active.label}</span>
        <KeyboardArrowDownIcon style={{ fontSize: 16 }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl2 shadow-pop ring-1 ring-ink-200 z-50 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-ink-100 bg-cream-100">
              <p className="text-[10px] uppercase tracking-wider font-bold text-ink-500">
                Prototype mode
              </p>
              <p className="text-xs text-ink-700 mt-0.5">
                Switch role to preview each panel
              </p>
            </div>
            <div className="p-1">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => {
                    setOpen(false);
                    router.push(r.path);
                  }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-cream-100 transition text-left ${r.key === current ? "bg-cream-100" : ""}`}
                >
                  <span
                    className={`h-8 w-8 rounded-lg flex items-center justify-center ${r.tone}`}
                  >
                    {r.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-navy-900">
                      {r.label}
                    </div>
                  </div>
                  {r.key === current && (
                    <span className="text-[10px] font-bold text-gold-700">
                      ACTIVE
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
