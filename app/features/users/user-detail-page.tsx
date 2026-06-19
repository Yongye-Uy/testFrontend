"use client";

import Link from "next/link";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAuth } from "@/app/hooks/use-auth";
import { isDirector, isSuperAdmin } from "@/lib/auth";
import { api } from "@/app/services/api-client";
import type { User } from "@/app/types/user";
import { useAsync } from "@/app/features/shared/use-async";

export function UserDetailPage({ id }: { id: string }) {
  const { user: viewer } = useAuth();
  const {
    data: user,
    loading,
    error,
  } = useAsync(() => api.users.get(id), [id]);

  return (
    <>
      <BackLink href="/users" label="Users" />
      {loading && <SkeletonCard />}
      {error && <ErrorState message={error} />}
      {user && (
        <div className="mx-auto max-w-4xl">
          {isDirector(viewer) && !isSuperAdmin(viewer) ? (
            <DirectorUserDetail user={user} />
          ) : (
            <AdminUserDetail user={user} />
          )}
        </div>
      )}
    </>
  );
}

function AdminUserDetail({ user }: { user: User }) {
  return (
    <Card className="overflow-hidden" padding="none">
      <header className="flex items-start justify-between gap-4 border-b border-ink-100 bg-cream-50 px-6 py-5">
        <div>
          <h1 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
            {user.full_name}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {prettyRole(user)} - {user.email}
          </p>
        </div>
        <Link
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-cream-100 hover:text-navy-800"
          href="/users"
        >
          Close
        </Link>
      </header>

      <div className="p-6">
        <SummaryBanner user={user} />

        <section className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Account information
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <DetailField label="Full name" value={user.full_name} />
            <DetailField label="Email" value={user.email} />
            <DetailField label="Role" value={prettyRole(user)} />
            <DetailField label="Account ID" value={user.id} />
            <DetailField
              label="Account status"
              value={<StatusBadge value={user.status} />}
            />
            <DetailField label="Joined" value={formatDate(user.created_at)} />
            <DetailField
              label="Invitation status"
              value={invitationStatus(user)}
            />
            <DetailField
              label="Email verified"
              value={user.email_verified ? "Yes" : "No"}
            />
            <DetailField label="Auth provider" value={user.auth_provider} />
          </div>
        </section>

        <div className="mt-5">
          <CapabilityNotice
            title="Account actions are partially available in the current backend contract"
            description="This admin view uses live account detail reads. Reset password still depends on a backend route that is not exposed yet."
          />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-cream-50 px-6 py-4">
        <Button variant="outline" disabled>
          Reset user password
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" disabled>
            Change status
          </Button>
          <Link
            className="inline-flex min-h-10 items-center rounded-lg px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-cream-100"
            href="/users"
          >
            Close
          </Link>
        </div>
      </footer>
    </Card>
  );
}

function DirectorUserDetail({ user }: { user: User }) {
  const lecturerView = prettyRole(user).includes("lecturer");

  return (
    <Card className="overflow-hidden" padding="none">
      <header className="flex items-start justify-between gap-4 border-b border-ink-100 bg-cream-50 px-6 py-5">
        <div>
          <h1 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
            {user.full_name}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {prettyRole(user)} - {user.email}
          </p>
        </div>
        <Link
          className="rounded-lg px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-cream-100 hover:text-navy-800"
          href="/users"
        >
          Close
        </Link>
      </header>

      <div className="p-6">
        <SummaryBanner user={user} />

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <DetailField
            label={lecturerView ? "Department" : "Program"}
            value="Upcoming"
          />
          <DetailField
            label={lecturerView ? "Active Classes" : "Active Enrollments"}
            value="Upcoming"
          />
          <DetailField
            label={lecturerView ? "Archived Classes" : "Archived Enrollments"}
            value="Upcoming"
          />
          <DetailField
            label={lecturerView ? "Avg Delivery" : "Avg Progress"}
            value="Upcoming"
          />
        </div>

        <section className="mt-6">
          <p className="flex items-center gap-2 text-[0.95rem] font-semibold text-navy-900">
            <span className="text-gold-600">o</span>
            {lecturerView
              ? "Current Teaching Assignments"
              : "Current Academic Assignments"}
          </p>
          <div className="mt-3 rounded-xl border border-dashed border-ink-200 bg-cream-50 px-4 py-6 text-sm text-ink-500">
            {lecturerView
              ? "Class and delivery metrics belong to academic service flows that are not exposed in the current backend contract yet."
              : "Student academic progress details will appear here once the academic user detail APIs are available."}
          </div>
        </section>

        <section className="mt-5">
          <p className="flex items-center gap-2 text-[0.95rem] font-semibold text-navy-900">
            <span className="text-gold-600">o</span>
            {lecturerView
              ? "Past Teaching Assignments"
              : "Past Academic Records"}
          </p>
          <div className="mt-3 rounded-xl border border-dashed border-ink-200 bg-cream-50 px-4 py-6 text-sm text-ink-500">
            Historical academic assignment detail is reserved for future backend
            support.
          </div>
        </section>

        <div className="mt-5">
          <CapabilityNotice
            title="Director detail view is intentionally academic-focused"
            description="This screen follows the UXUI direction for Director people management. Account security actions stay limited, while academic assignment and delivery data remain placeholders until the backend exposes those reads."
          />
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-cream-50 px-6 py-4">
        <Button variant="secondary" disabled>
          Change status
        </Button>
        <Link
          className="inline-flex min-h-10 items-center rounded-lg px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-cream-100"
          href="/users"
        >
          Close
        </Link>
      </footer>
    </Card>
  );
}

function SummaryBanner({ user }: { user: User }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="h-14 bg-gradient-to-r from-navy-900 to-navy-700" />
      <div className="flex items-start gap-4 px-5 pb-4">
        <div className="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] border-4 border-white bg-navy-800 text-base font-bold text-cream-50 shadow-soft">
          {initials(user.full_name || user.email)}
        </div>
        <div className="min-w-0 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif-display text-[1.05rem] font-semibold text-navy-900">
              {user.full_name}
            </p>
            <StatusBadge value={user.status} />
          </div>
          <p className="mt-1 truncate text-sm text-ink-500">{user.email}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Joined {formatDate(user.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <div className="mt-2 min-h-6 text-[0.95rem] font-semibold text-navy-900">
        {value}
      </div>
    </div>
  );
}

function prettyRole(user: User) {
  const role = user.roles[0] ?? user.role;
  return role.replaceAll("_", " ");
}

function invitationStatus(user: User) {
  return user.status === "pending" ? "Pending" : "Accepted";
}

function formatDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
