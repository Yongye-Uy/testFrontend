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

// 15 accent colours — picked once per card using a stable hash of the class id
const ACCENTS = [
  { bar: "bg-navy-700",    ring: "#16306e", tag: "bg-navy-50 text-navy-700"       },
  { bar: "bg-gold-500",    ring: "#d4a017", tag: "bg-gold-50 text-gold-700"        },
  { bar: "bg-emerald-600", ring: "#059669", tag: "bg-emerald-50 text-emerald-700"  },
  { bar: "bg-rose-500",    ring: "#f43f5e", tag: "bg-rose-50 text-rose-700"        },
  { bar: "bg-violet-600",  ring: "#7c3aed", tag: "bg-violet-50 text-violet-700"    },
  { bar: "bg-sky-500",     ring: "#0ea5e9", tag: "bg-sky-50 text-sky-700"          },
  { bar: "bg-amber-500",   ring: "#f59e0b", tag: "bg-amber-50 text-amber-700"      },
  { bar: "bg-teal-600",    ring: "#0d9488", tag: "bg-teal-50 text-teal-700"        },
  { bar: "bg-pink-500",    ring: "#ec4899", tag: "bg-pink-50 text-pink-700"        },
  { bar: "bg-indigo-600",  ring: "#4f46e5", tag: "bg-indigo-50 text-indigo-700"    },
  { bar: "bg-cyan-500",    ring: "#06b6d4", tag: "bg-cyan-50 text-cyan-700"        },
  { bar: "bg-lime-600",    ring: "#65a30d", tag: "bg-lime-50 text-lime-700"        },
  { bar: "bg-fuchsia-600", ring: "#c026d3", tag: "bg-fuchsia-50 text-fuchsia-700"  },
  { bar: "bg-orange-500",  ring: "#f97316", tag: "bg-orange-50 text-orange-700"    },
  { bar: "bg-red-600",     ring: "#dc2626", tag: "bg-red-50 text-red-700"          },
] as const;

function accentFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StatusPill({ value }: { value: string }) {
  const map: Record<string, string> = {
    active:      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    available:   "bg-emerald-50 text-emerald-700 ring-emerald-200",
    in_progress: "bg-blue-50 text-blue-700 ring-blue-200",
    "in-progress":"bg-blue-50 text-blue-700 ring-blue-200",
    unlocked:    "bg-navy-50 text-navy-700 ring-navy-200",
    completed:   "bg-slate-50 text-slate-600 ring-slate-200",
    locked:      "bg-ink-50 text-ink-400 ring-ink-200",
  };
  const cls = map[value.toLowerCase()] ?? "bg-ink-50 text-ink-500 ring-ink-200";
  const label = value.replace(/_/g, " ");
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function ContinueLearningCard({ cls, encouragement }: { cls: ClassOffering; encouragement?: string }) {
  const continueLearning = useAsync(() => api.student.continueLearning(cls.id), [cls.id]);
  const lessons = useAsync(() => api.lessons.listForStudentClass(cls.id), [cls.id]);

  const accent = accentFor(cls.id);
  const allLessons = lessons.data?.lessons ?? [];
  const total = allLessons.length;
  // A lesson counts as completed when every one of its items is completed
  const completed = allLessons.filter((l) =>
    l.items.length > 0 && l.items.every((i) => i.progress_status === "completed"),
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cont = continueLearning.data as
    | { has_continue?: boolean; lesson_title?: string; item_type?: string; lesson_item_id?: number }
    | null;
  const hasItem = cont?.has_continue && cont.lesson_item_id;
  const href = hasItem
    ? (cont?.item_type === "assessment"
        ? routes.quiz(cls.id, String(cont.lesson_item_id))
        : routes.lessonViewer(cls.id, String(cont.lesson_item_id!)))
    : routes.classDetail(cls.id);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-ink-100 transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Coloured top bar */}
      <div className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} />

      <div className="p-5 pt-6">
        {/* Code + status + ring */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {cls.course_code && (
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider ${accent.tag}`}>
                  {cls.course_code}
                </span>
              )}
              <StatusPill value={cls.status} />
            </div>
            <h3 className="mt-2 font-serif-display text-[1rem] font-semibold leading-snug text-navy-900 line-clamp-2">
              {cls.course_title ?? "Class"}
            </h3>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {[cls.lecturer_name, cls.semester_title].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ProgressRing percent={percent} size={56} stroke={5} accentColor={accent.ring} />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-end justify-between border-t border-ink-100 pt-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">Lessons</p>
            <p className="mt-0.5 text-sm font-semibold text-navy-900">
              {completed} of {total}
            </p>
          </div>
          <div className="text-right">
            {encouragement && (
              <p className="text-[11px] italic text-emerald-700">{encouragement}</p>
            )}
            <Link
              href={href}
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 transition group-hover:gap-2"
            >
              {hasItem ? "Continue" : "View class"}
              <ArrowForwardRoundedIcon style={{ fontSize: 14 }} />
            </Link>
          </div>
        </div>
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
    if (diffD === 0) return diffH <= 0 ? "Opens today" : `Opens in ${diffH}h`;
    if (diffD === 1) return "Opens tomorrow";
    return `Opens in ${diffD} days`;
  }

  // Simple encouragement labels for the first few cards
  const encouragements = ["You're on a roll!", "Half-way there.", undefined];

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.full_name?.split(" ")[0] ?? user.email}`}
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
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-serif-display text-xl font-semibold text-navy-900">
              Continue learning
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Pick up exactly where you left off.
            </p>
          </div>
          <Link
            href={routes.myClasses}
            className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 transition hover:text-navy-900"
          >
            View all classes
            <ChevronRightRoundedIcon style={{ fontSize: 16 }} />
          </Link>
        </div>

        {classes.loading ? (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-50 animate-pulse rounded-2xl bg-ink-100" />
            ))}
          </div>
        ) : activeClasses.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
            <AutoStoriesOutlinedIcon style={{ fontSize: 32 }} className="text-ink-300" />
            <p className="mt-2 text-sm text-ink-500">
              No active classes yet.{" "}
              <Link href={routes.myClasses} className="underline text-navy-700">
                My Classes
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeClasses.map((cls, i) => (
              <ContinueLearningCard
                key={cls.id}
                cls={cls}
                encouragement={encouragements[i]}
              />
            ))}
          </div>
        )}
      </section>

      {/* Coming up this week */}
      <section className="mt-8">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif-display text-lg font-semibold text-navy-900">
              Coming up this week
            </h3>
            {upcomingItems.length > 0 && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                {upcomingItems.length} item{upcomingItems.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {upcoming.loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-100" />
              ))}
            </div>
          ) : upcomingItems.length === 0 ? (
            <div className="flex items-center gap-3 py-2 text-sm text-ink-500">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-navy-800">
                <CalendarTodayOutlinedIcon style={{ fontSize: 18 }} />
              </div>
              Nothing scheduled for the next 7 days. You&apos;re all caught up!
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {upcomingItems.map((item) => {
                const href =
                  item.item_type === "assessment"
                    ? routes.quiz(String(item.class_id), String(item.lesson_item_id))
                    : routes.lessonViewer(String(item.class_id), String(item.lesson_item_id));
                return (
                  <div
                    key={item.lesson_item_id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-navy-800">
                      <ScheduleOutlinedIcon style={{ fontSize: 18 }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.course_code && (
                          <span className="rounded bg-cream-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-navy-800">
                            {item.course_code}
                          </span>
                        )}
                        {item.progress_status && (
                          <StatusPill value={item.progress_status} />
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-navy-900">
                        {item.lesson_title}
                      </p>
                      {item.scheduled_open_date && (
                        <p className="text-xs text-ink-500">
                          {formatUpcomingTime(item.scheduled_open_date)}
                        </p>
                      )}
                    </div>

                    <Link
                      href={href}
                      className="shrink-0 rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-700 shadow-sm transition hover:bg-cream-100"
                    >
                      Open
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </>
  );
}
