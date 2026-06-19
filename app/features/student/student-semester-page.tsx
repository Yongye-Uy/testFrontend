"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useAsync } from "@/app/features/shared/use-async";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";
import type { ClassOffering } from "@/app/types/course";
import { useAuth } from "@/app/hooks/use-auth";
import { ProgressRing } from "./progress-ring";

function ClassCard({ cls }: { cls: ClassOffering }) {
  const lessons = useAsync(() => api.lessons.listForStudentClass(cls.id), [cls.id]);
  const continueLearning = useAsync(
    () => api.student.continueLearning(cls.id),
    [cls.id],
  );

  const allItems = lessons.data?.lessons.flatMap((l) => l.items) ?? [];
  const total = allItems.length;
  const completed = allItems.filter(
    (i) => i.progress_status === "completed",
  ).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cont = continueLearning.data as
    | { has_continue?: boolean; lesson_item_id?: number }
    | null;
  const hasItem = cont?.has_continue;
  const lessonItemId = cont?.lesson_item_id;

  return (
    <Link href={routes.classDetail(cls.id)}>
      <div className="group h-full cursor-pointer rounded-2xl border border-ink-200 bg-white p-5 shadow-sm transition hover:border-navy-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {cls.course_code && (
              <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
                {cls.course_code}
              </span>
            )}
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-700 ring-1 ring-emerald-200">
              Active
            </span>
          </div>
          <ProgressRing percent={percent} size={56} stroke={5} />
        </div>

        <h3 className="mt-3 font-serif-display text-[1.05rem] font-semibold leading-6 text-navy-900 line-clamp-2">
          {cls.course_title ?? "Class"}
        </h3>
        {cls.lecturer_name && (
          <p className="mt-1 text-[11px] text-ink-500">
            {cls.lecturer_name}
            {cls.semester_title ? ` · ${cls.semester_title}` : ""}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
          <span className="text-[11px] font-medium text-ink-500">
            {completed} of {total} lessons
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 transition group-hover:text-navy-900">
            {hasItem && lessonItemId ? "Continue" : "View class"}
            <ArrowForwardRoundedIcon style={{ fontSize: 14 }} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function StudentSemesterPage({ semesterId }: { semesterId: string }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const classes = useAsync(() => api.student.classes(), [user?.id]);

  const semesterClasses = (classes.data?.classes ?? []).filter(
    (c) => c.semester_id === semesterId,
  );

  const semesterTitle =
    semesterClasses[0]?.semester_title ?? `Semester ${semesterId}`;

  const filtered = search
    ? semesterClasses.filter(
        (c) =>
          c.course_title?.toLowerCase().includes(search.toLowerCase()) ||
          c.course_code?.toLowerCase().includes(search.toLowerCase()),
      )
    : semesterClasses;

  return (
    <>
      <PageHeader
        title={semesterTitle}
        description="Your classes for this term."
        breadcrumbs={[
          { label: "Home" },
          { label: "My Classes", href: routes.myClasses },
          { label: semesterTitle },
        ]}
        actions={
          <Link
            href={routes.myClasses}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-cream-100"
          >
            <ArrowBackRoundedIcon style={{ fontSize: 16 }} />
            Back to semesters
          </Link>
        }
      />

      <div className="mb-5">
        <input
          type="search"
          placeholder="Search by course code or class title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
        />
      </div>

      {classes.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse rounded-2xl border border-ink-200 bg-ink-100"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-500">No classes found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </div>
      )}
    </>
  );
}
