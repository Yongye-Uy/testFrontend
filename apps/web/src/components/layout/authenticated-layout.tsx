"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sidebarForUser, type SidebarItem } from "@/lib/sidebar";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { Button } from "@/components/ui/button";
import { isDirector } from "@/lib/auth";
import type { User } from "@/types/user";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const items = sidebarForUser(user);
  const director = isDirector(user);
  const groups = director ? directorGroups(items) : [{ label: "", items }];

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login");
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paragon-cream text-sm text-ink-600">
        Loading session...
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-paragon-cream text-ink-800">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-navy-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-ink-200 bg-white shadow-[2px_0_10px_-4px_rgba(15,44,92,0.08)] transition lg:static lg:translate-x-0 ${collapsed ? "lg:w-[72px]" : "lg:w-64"}`}
      >
        <div
          className={`border-b border-ink-100 px-5 py-5 ${collapsed ? "lg:flex lg:justify-center lg:px-3" : ""}`}
        >
          <Link href="/dashboard" className="min-w-0">
            <div className="text-sm font-bold tracking-[0.2em] text-navy-900">
              {collapsed ? "EP" : "EPPLMS"}
            </div>
            {!collapsed && (
              <div className="text-[10px] uppercase tracking-widest text-gold-700">
                Learning Platform
              </div>
            )}
          </Link>
        </div>
        {!collapsed && (
          <div className="px-5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              {user.is_super_admin
                ? "Super Admin"
                : director
                  ? "Director Portal"
                  : "Portal"}
            </p>
          </div>
        )}
        <nav
          className={`flex-1 space-y-4 overflow-y-auto pb-4 ${collapsed ? "px-2 pt-3" : "px-3"}`}
        >
          {groups.map((group, index) => (
            <div key={`${group.label}-${index}`}>
              {!collapsed && group.label && (
                <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400">
                  {group.label}
                </p>
              )}
              {collapsed && index > 0 && (
                <div className="mx-3 my-2 h-px bg-ink-100" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink
                    item={item}
                    collapsed={collapsed}
                    key={item.href}
                    pathname={pathname}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-ink-100 p-3">
          {!collapsed && (
            <div className="mb-2 flex items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              <span>Version</span>
              <span className="font-mono">v1.0.0</span>
            </div>
          )}
          <button
            className="hidden w-full rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-500 hover:bg-cream-100 lg:block"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </aside>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-ink-200 bg-cream-50/85 px-4 py-3 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              Menu
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900">
                {user.full_name}
              </p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
            {director && (
              <div className="hidden items-center gap-2 rounded-lg bg-cream-200/70 px-3 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-ink-200 md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Director workspace
              </div>
            )}
            <ProfileMenu user={user} logout={logout} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function directorGroups(items: SidebarItem[]) {
  const people = new Set(["/users"]);
  return [
    {
      label: "Academic",
      items: items.filter((item) => !people.has(item.href)),
    },
    { label: "People", items: items.filter((item) => people.has(item.href)) },
  ].filter((group) => group.items.length > 0);
}

function SidebarLink({
  item,
  collapsed,
  pathname,
  onClick,
}: {
  item: SidebarItem;
  collapsed: boolean;
  pathname: string;
  onClick: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative flex items-center rounded-lg text-sm font-medium transition ${collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2"} ${active ? "bg-navy-50 text-navy-900" : "text-ink-600 hover:bg-cream-100 hover:text-navy-900"}`}
    >
      {active && !collapsed && (
        <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-gold-500" />
      )}
      <span
        className={`flex min-w-0 items-center gap-3 ${collapsed ? "justify-center" : ""}`}
      >
        <span className="shrink-0 text-ink-500 group-hover:text-inherit">
          {Icon ? <Icon fontSize="small" /> : null}
        </span>
        <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
      </span>
      {item.hint && !collapsed && (
        <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[10px] text-gold-700 ring-1 ring-gold-200">
          {item.hint}
        </span>
      )}
    </Link>
  );
}

function ProfileMenu({ user, logout }: { user: User; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials =
    user.full_name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    "U";

  useEffect(() => {
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-cream-200"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-bold text-cream-50 ring-2 ring-cream-50">
          {initials}
        </span>
        <span className="text-xs text-ink-500">v</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-ink-200">
          <div className="border-b border-ink-100 bg-cream-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-cream-50">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-navy-900">
                  {user.full_name}
                </p>
                <p className="truncate text-[11px] text-ink-500">
                  {user.email}
                </p>
              </div>
            </div>
            <span className="mt-2 inline-flex rounded-full bg-gold-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-700 ring-1 ring-gold-200">
              {user.role}
            </span>
          </div>
          <div className="p-1">
            <MenuLink
              href="/profile"
              label="Profile"
              onDone={() => setOpen(false)}
            />
            <MenuLink
              href="/settings"
              label="Settings"
              onDone={() => setOpen(false)}
            />
          </div>
          <div className="border-t border-ink-100 p-1">
            <button
              className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-rose-700 transition hover:bg-rose-50"
              onClick={logout}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onDone,
}: {
  href: string;
  label: string;
  onDone: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onDone}
      className="block rounded-lg px-2.5 py-2 text-sm text-ink-700 transition hover:bg-cream-100"
    >
      {label}
    </Link>
  );
}

export function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <LayoutInner>{children}</LayoutInner>
    </AuthProvider>
  );
}
