"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useAsync } from "@/app/features/shared/use-async";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";
import type { ClassOffering } from "@/app/types/course";
import type { User } from "@/app/types/user";
import { ProgressRing } from "./progress-ring";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatusPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
    unlocked: "bg-navy-50 text-navy-700 ring-navy-200",
    completed: "bg-slate-50 text-slate-600 ring-slate-200",
    locked: "bg-ink-50 text-ink-400 ring-ink-200",
  };
  const cls = map[value.toLowerCase()] ?? "bg-ink-50 text-ink-500 ring-ink-200";
  const label = value.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ${cls}`}
    >
      {label}
    </span>
  );
}

function ContinueLearningCard({ cls }: { cls: ClassOffering }) {
  const continueLearning = useAsync(
    () => api.student.continueLearning(cls.id),
    [cls.id],
  );
  const lessons = useAsync(
    () => api.lessons.listForStudentClass(cls.id),
    [cls.id],
  );

  const allItems = lessons.data?.lessons.flatMap((l) => l.items) ?? [];
  const total = allItems.length;
  const completed = allItems.filter(
    (i) => i.progress_status === "completed",
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cont = continueLearning.data as
    | { has_continue?: boolean; lesson_title?: string; item_type?: string; lesson_item_id?: number }
    | null;

  const hasItem = cont?.has_continue;
  const lessonItemId = cont?.lesson_item_id;

  return (
    <div className="min-w-[280px] max-w-[320px] shrink-0 snap-start rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {cls.course_code && (
            <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
              {cls.course_code}
            </span>
          )}
          <StatusPill value={cls.status} />
        </div>
        <ProgressRing percent={percent} size={56} stroke={5} />
      </div>

      <h3 className="mt-3 font-serif-display text-[1rem] font-semibold leading-6 text-navy-900 line-clamp-2">
        {cls.course_title ?? "Class"}
      </h3>
      {cls.semester_title && (
        <p className="mt-1 text-[11px] text-ink-500">{cls.semester_title}</p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <span className="text-[11px] text-ink-500">
          {completed} of {total} lessons
        </span>
        {hasItem && lessonItemId ? (
          <Link
            href={routes.lessonViewer(cls.id, String(lessonItemId))}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 transition hover:text-navy-900"
          >
            Continue
            <ArrowForwardRoundedIcon style={{ fontSize: 14 }} />
          </Link>
        ) : (
          <Link
            href={routes.classDetail(cls.id)}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 transition hover:text-navy-900"
          >
            View class
            <ArrowForwardRoundedIcon style={{ fontSize: 14 }} />
          </Link>
        )}
      </div>
    </div>
  );
}

export function StudentDashboard({ user }: { user: User }) {
  const classes = useAsync(() => api.student.classes(), [user.id]);
  const upcoming = useAsync(() => api.student.upcomingWeek(), [user.id]);

  const activeClasses = (classes.data?.classes ?? []).filter(
    (c) => c.semester_status === "active" || c.status === "active",
  );

  const upcomingItems = (upcoming.data ?? []) as Array<{
    lesson_item_id: number;
    lesson_title: string;
    item_type: string;
    scheduled_open_date: string;
    class_id: number;
    course_title: string;
    course_code: string;
    progress_status: string;
  }>;

  function formatUpcomingTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.round(diffMs / 3600000);
    const diffD = Math.round(diffMs / 86400000);
    if (diffD === 0) {
      return diffH <= 0 ? "Opens today" : `Opens in ${diffH}h`;
    }
    if (diffD === 1) return "Opens tomorrow";
    return `Opens in ${diffD} days`;
  }

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.full_name ?? user.email}`}
        description="Keep the momentum — small steps, big growth."
        breadcrumbs={[{ label: "Home" }, { label: "Dashboard" }]}
        actions={
          <Link
            href={routes.myClasses}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-navy-800"
          >
            <MenuBookOutlinedIcon style={{ fontSize: 16 }} />
            Browse my classes
          </Link>
        }
      />

      {/* Continue Learning */}
      <section className="mt-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-[1.05rem] font-semibold text-navy-900">
              Continue learning
            </h2>
            <p className="text-[11px] text-ink-500">
              Pick up exactly where you left off
            </p>
          </div>
          <Link
            href={routes.myClasses}
            className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition hover:text-navy-900"
          >
            View all classes
            <ChevronRightRoundedIcon style={{ fontSize: 18 }} />
          </Link>
        </div>

        {classes.loading ? (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-[280px] max-w-[320px] shrink-0 animate-pulse rounded-2xl border border-ink-200 bg-ink-100 h-[180px]"
              />
            ))}
          </div>
        ) : activeClasses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
            <AutoStoriesOutlinedIcon
              style={{ fontSize: 32 }}
              className="text-ink-300"
            />
            <p className="mt-2 text-sm text-ink-500">
              No active classes yet. Check{" "}
              <Link href={routes.myClasses} className="underline text-navy-700">
                My Classes
              </Link>{" "}
              to see all enrollments.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2">
            {activeClasses.map((cls) => (
              <ContinueLearningCard key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </section>

      {/* Coming up this week */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif-display text-[1.05rem] font-semibold text-navy-900">
            Coming up this week
          </h2>
          {upcomingItems.length > 0 && (
            <span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-navy-700 ring-1 ring-navy-100">
              {upcomingItems.length} item{upcomingItems.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {upcoming.loading ? (
            [1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl border border-ink-200 bg-ink-100"
              />
            ))
          ) : upcomingItems.length === 0 ? (
            <Card className="p-5">
              <div className="flex items-center gap-3 text-sm text-ink-500">
                <CalendarTodayOutlinedIcon
                  style={{ fontSize: 20 }}
                  className="shrink-0 text-ink-400"
                />
                Nothing scheduled for the next 7 days. You're all caught up!
              </div>
            </Card>
          ) : (
            upcomingItems.map((item) => (
              <div
                key={item.lesson_item_id}
                className="flex items-center gap-4 rounded-xl border border-ink-200 bg-white px-4 py-3"
              >
                <ScheduleOutlinedIcon
                  style={{ fontSize: 20 }}
                  className="shrink-0 text-ink-400"
                />
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {item.course_code && (
                    <span className="shrink-0 rounded bg-navy-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-700">
                      {item.course_code}
                    </span>
                  )}
                  {item.progress_status && (
                    <StatusPill value={item.progress_status} />
                  )}
                  <span className="truncate text-sm font-medium text-navy-900">
                    {item.lesson_title}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] text-ink-500">
                  {formatUpcomingTime(item.scheduled_open_date)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
