"use client";

import React, { Fragment, useState } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { Role, User } from "@/lib/types";

interface Crumb {
  label: string;
  to?: string;
}

interface AppShellProps {
  role: Role;
  /** Pass null until auth is wired; topbar will show an "Account" placeholder. */
  user?: User | null;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  contextLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Omit the page header — used for full-bleed pages like Take Quiz. */
  bare?: boolean;
}

export function AppShell({
  role,
  user = null,
  title,
  subtitle,
  breadcrumbs,
  contextLabel,
  actions,
  children,
  bare = false,
}: AppShellProps) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-paragon-cream overflow-hidden">
      <Sidebar
        role={role}
        desktopCollapsed={desktopCollapsed}
        mobileOpen={mobileOpen}
        onToggleDesktop={() => setDesktopCollapsed((c) => !c)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          user={user}
          role={role}
          contextLabel={contextLabel}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {!bare && (title || breadcrumbs) && (
              <div className="px-4 lg:px-6 pt-4 pb-2">
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <nav className="flex items-center gap-1.5 text-xs text-ink-500 mb-2">
                    {breadcrumbs.map((b, i) => (
                      <Fragment key={i}>
                        {i > 0 && <span className="text-ink-300">/</span>}
                        <span
                          className={
                            i === breadcrumbs.length - 1
                              ? "text-navy-700 font-semibold"
                              : ""
                          }
                        >
                          {b.label}
                        </span>
                      </Fragment>
                    ))}
                  </nav>
                )}
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    {title && (
                      <h1 className="font-serif-display text-2xl text-navy-900 font-semibold tracking-tight">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="text-sm text-ink-600 mt-1">{subtitle}</p>
                    )}
                  </div>
                  {actions && (
                    <div className="flex items-center gap-2">{actions}</div>
                  )}
                </div>
                <div className="mt-4 h-px bg-gradient-to-r from-gold-500/50 via-ink-200 to-transparent" />
              </div>
            )}
            <div className={bare ? "" : "px-4 lg:px-6 py-4"}>{children}</div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
