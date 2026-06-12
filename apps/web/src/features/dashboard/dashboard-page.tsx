"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { isDirector, isSuperAdmin } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { backendCapabilities } from "@/lib/backend-capabilities";
import { useAsync } from "@/features/shared/use-async";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { CapabilityNotice } from "@/components/shared/capability-notice";

export function DashboardPage() {
  const { user } = useAuth();
  const programs = useAsync(
    () =>
      isDirector(user)
        ? api.programs.list()
        : Promise.resolve({ programs: [] }),
    [user?.id, user?.role],
  );
  const courses = useAsync(
    () =>
      isDirector(user) ? api.courses.list() : Promise.resolve({ courses: [] }),
    [user?.id, user?.role],
  );
  const semesters = useAsync(
    () =>
      isDirector(user)
        ? api.semesters.list()
        : Promise.resolve({ semesters: [] }),
    [user?.id, user?.role],
  );

  if (isDirector(user)) {
    const loading = programs.loading || courses.loading || semesters.loading;
    const error = programs.error || courses.error || semesters.error;
    const activeSemesters =
      semesters.data?.semesters.filter((item) => item.status === "active")
        .length ?? 0;
    const draftSemesters =
      semesters.data?.semesters.filter((item) => item.status === "draft")
        .length ?? 0;

    return (
      <>
        <PageHeader
          title="Director Dashboard"
          description="Academic setup overview for course catalog, semesters, and master batches."
          breadcrumbs={[{ label: "Home" }, { label: "Dashboard" }]}
        />
        {loading && <LoadingState label="Loading director dashboard" />}
        {error && <ErrorState message={error} />}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Programs"
            value={programs.data?.programs.length ?? 0}
            href="/courses"
          />
          <Metric
            title="Catalog Courses"
            value={courses.data?.courses.length ?? 0}
            href="/courses"
          />
          <Metric
            title="Active Semesters"
            value={activeSemesters}
            href="/semesters"
          />
          <MetricLabel
            title="Batch Directory"
            value={backendCapabilities.batchDirectory ? "Live" : "Soon"}
            href="/batches"
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
              Academic workflow
            </p>
            <h2 className="mt-1 font-serif-display text-xl font-semibold text-navy-900">
              Director setup path
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <WorkflowCard
                title="1. Catalog"
                description="Create courses grouped by program."
                href="/courses"
              />
              <WorkflowCard
                title="2. Semester"
                description="Open classes from catalog records."
                href="/semesters"
              />
              <WorkflowCard
                title="3. Batches"
                description="Assign master batches to semesters."
                href="/batches"
              />
            </div>
          </Card>
          <Card className="p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
              Current state
            </p>
            <h2 className="mt-1 font-serif-display text-xl font-semibold text-navy-900">
              Preparation
            </h2>
            <p className="mt-3 text-sm text-ink-600">
              {draftSemesters} draft semester{draftSemesters === 1 ? "" : "s"}{" "}
              waiting for setup or publication.
            </p>
          </Card>
        </div>
        {!backendCapabilities.batchDirectory && (
          <div className="mt-5">
            <CapabilityNotice
              title="Batch directory pages are waiting on Backend2.0 batch read endpoints"
              description="Create batch is already wired, but list/detail/status/student-roster APIs are not exposed by the current backend contract yet. The Director batch screens stay available so the frontend can match the UXUI and fail gracefully instead of breaking."
            />
          </div>
        )}
      </>
    );
  }

  const cards = isSuperAdmin(user)
    ? [
        ["Users", "/users", "Manage users, statuses, and password resets."],
        ["Roles", "/roles", "Manage custom roles and role metadata."],
      ]
    : [
        ["Course Catalog", "/courses", "Manage master course catalog records."],
        ["Semesters", "/semesters", "Open course offerings by semester."],
        ["Batches", "/batches", "Manage generation and general batches."],
      ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Simple Phase 1 landing page. Full analytics are intentionally not implemented yet."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([title, href, description]) => (
          <Link key={href} href={href}>
            <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <h2 className="font-semibold text-navy-900">{title}</h2>
              <p className="mt-2 text-sm text-ink-600">{description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function Metric({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card hover className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
          {title}
        </p>
        <p className="mt-2 font-serif-display text-3xl font-semibold text-navy-900">
          {value}
        </p>
      </Card>
    </Link>
  );
}

function MetricLabel({
  title,
  value,
  href,
}: {
  title: string;
  value: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card hover className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
          {title}
        </p>
        <p className="mt-2 font-serif-display text-3xl font-semibold text-navy-900">
          {value}
        </p>
      </Card>
    </Link>
  );
}

function WorkflowCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      className="rounded-xl bg-cream-100 p-4 ring-1 ring-ink-100 transition hover:bg-navy-50"
      href={href}
    >
      <p className="font-semibold text-navy-900">{title}</p>
      <p className="mt-1 text-sm text-ink-600">{description}</p>
    </Link>
  );
}
