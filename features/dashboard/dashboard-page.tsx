"use client";

import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { useAsync } from "@/features/shared/use-async";
import { useLecturerClasses } from "@/features/classes/use-lecturer-classes";
import { LecturerClassCard } from "@/features/classes/lecturer-class-card";
import { useAuth } from "@/hooks/use-auth";
import { isDirector, isLecturer, isSuperAdmin } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { backendCapabilities } from "@/lib/backend-capabilities";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { user } = useAuth();
  const lecturer = useLecturerClasses();
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
            icon={<SchoolOutlinedIcon style={{ fontSize: 20 }} />}
          />
          <Metric
            title="Catalog Courses"
            value={courses.data?.courses.length ?? 0}
            href="/courses"
            icon={<AutoStoriesOutlinedIcon style={{ fontSize: 20 }} />}
          />
          <Metric
            title="Active Semesters"
            value={activeSemesters}
            href="/semesters"
            icon={<CalendarMonthOutlinedIcon style={{ fontSize: 20 }} />}
          />
          <MetricLabel
            title="Batch Directory"
            value={backendCapabilities.batchDirectory ? "Live" : "Soon"}
            href="/batches"
            icon={<GroupsOutlinedIcon style={{ fontSize: 20 }} />}
          />
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">
              Academic workflow
            </p>
            <h2 className="mt-1 font-serif-display text-[1.1rem] font-semibold leading-7 text-navy-900">
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
            <h2 className="mt-1 font-serif-display text-[1.1rem] font-semibold leading-7 text-navy-900">
              Preparation
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-600">
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

  if (isLecturer(user)) {
    const overview = lecturer.data;
    const classes = overview?.classes ?? [];
    const classCount = classes.length;
    const semesterTitle = overview?.activeSemester?.title;

    return (
      <>
        <PageHeader
          title={`${greeting()}, ${user?.full_name ?? "Lecturer"}`}
          description="Here's what's happening across your classes today."
          breadcrumbs={[{ label: "Home" }, { label: "Dashboard" }]}
        />

        {lecturer.error && <ErrorState message={lecturer.error} />}

        {lecturer.loading ? (
          <PageSkeleton rows={2} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                title="Students"
                value={String(overview?.totalStudents ?? 0)}
                helper={
                  semesterTitle
                    ? `across ${classCount} class${classCount === 1 ? "" : "es"} · ${semesterTitle}`
                    : `across ${classCount} class${classCount === 1 ? "" : "es"}`
                }
                href="/classes"
                icon={<GroupsOutlinedIcon sx={{ fontSize: 20 }} />}
              />
              <StatCard
                title="Lessons Published"
                value="Coming soon"
                helper="Lesson publishing isn't exposed by the backend yet."
                icon={<AutoStoriesOutlinedIcon sx={{ fontSize: 20 }} />}
                muted
              />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-serif-display text-[1.1rem] font-semibold leading-7 text-navy-900">
                  My classes
                </h2>
                <Link
                  href="/classes"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition hover:text-navy-900"
                >
                  View all classes
                  <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
                </Link>
              </div>

              <div className="mt-4">
                {classCount === 0 ? (
                  <EmptyState
                    title="No classes assigned"
                    description="You have no classes assigned for the current semester yet. They'll appear here once a director assigns you to a class."
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {classes.map((item) => (
                      <LecturerClassCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-navy-900">{title}</h2>
                  <p className="mt-2 text-sm text-ink-600">{description}</p>
                </div>
                <ArrowOutwardRoundedIcon
                  style={{ fontSize: 18 }}
                  className="mt-0.5 text-ink-400"
                />
              </div>
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
  icon,
}: {
  title: string;
  value: number;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card hover className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              {title}
            </p>
            <p className="mt-2 font-serif-display text-[1.65rem] font-semibold leading-8 text-navy-900">
              {value}
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            {icon}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function MetricLabel({
  title,
  value,
  href,
  icon,
}: {
  title: string;
  value: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card hover className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              {title}
            </p>
            <p className="mt-2 font-serif-display text-[1.65rem] font-semibold leading-8 text-navy-900">
              {value}
            </p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            {icon}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon,
  href,
  muted = false,
}: {
  title: string;
  value: string;
  helper?: string;
  icon?: React.ReactNode;
  href?: string;
  muted?: boolean;
}) {
  const inner = (
    <Card hover={Boolean(href)} className="h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            {title}
          </p>
          <p
            className={`mt-2 font-serif-display text-[1.65rem] font-semibold leading-8 ${
              muted ? "text-ink-400" : "text-navy-900"
            }`}
          >
            {value}
          </p>
          {helper && <p className="mt-1 text-sm text-ink-500">{helper}</p>}
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
          {icon}
        </span>
      </div>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-navy-900">{title}</p>
          <p className="mt-1 text-sm text-ink-600">{description}</p>
        </div>
        <ArrowOutwardRoundedIcon
          style={{ fontSize: 18 }}
          className="mt-0.5 text-ink-400"
        />
      </div>
    </Link>
  );
}
