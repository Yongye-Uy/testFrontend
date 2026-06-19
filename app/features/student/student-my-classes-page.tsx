"use client";

import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { useAsync } from "@/app/features/shared/use-async";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";
import type { ClassOffering } from "@/app/types/course";
import { useAuth } from "@/app/hooks/use-auth";

function groupBySemester(classes: ClassOffering[]) {
  const map = new Map<
    string,
    {
      semesterId: string;
      semesterTitle: string;
      semesterStatus: string;
      classes: ClassOffering[];
    }
  >();
  for (const cls of classes) {
    const key = cls.semester_id;
    if (!map.has(key)) {
      map.set(key, {
        semesterId: cls.semester_id,
        semesterTitle: cls.semester_title ?? `Semester ${cls.semester_id}`,
        semesterStatus: cls.semester_status ?? "active",
        classes: [],
      });
    }
    map.get(key)!.classes.push(cls);
  }
  return Array.from(map.values());
}

function SemesterCard({
  semesterId,
  semesterTitle,
  semesterStatus,
  classCount,
}: {
  semesterId: string;
  semesterTitle: string;
  semesterStatus: string;
  classCount: number;
}) {
  const isArchived = semesterStatus === "archived";
  const statusColor = isArchived
    ? "bg-ink-50 text-ink-500 ring-ink-200"
    : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarMonthOutlinedIcon
            style={{ fontSize: 18 }}
            className="text-navy-700"
          />
          <h3 className="font-serif-display text-[1rem] font-semibold text-navy-900">
            {semesterTitle}
          </h3>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ring-1 ${statusColor}`}
        >
          {semesterStatus}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <span className="flex items-center gap-1.5 text-[12px] text-ink-500">
          <span className="font-semibold text-navy-800">{classCount}</span>{" "}
          class{classCount === 1 ? "" : "es"}
        </span>
        <Link
          href={routes.semesterClasses(semesterId)}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-navy-700 transition hover:text-navy-900"
        >
          {isArchived ? "View archive" : "Open semester"}
          <ChevronRightRoundedIcon style={{ fontSize: 16 }} />
        </Link>
      </div>
    </div>
  );
}

export function StudentMyClassesPage() {
  const { user } = useAuth();
  const classes = useAsync(() => api.student.classes(), [user?.id]);

  const allClasses = classes.data?.classes ?? [];
  const activeSemesters = groupBySemester(
    allClasses.filter((c) => c.semester_status === "active"),
  );
  const archivedSemesters = groupBySemester(
    allClasses.filter((c) => c.semester_status === "archived"),
  );

  return (
    <>
      <PageHeader
        title="My Classes"
        description="Browse your active term or revisit materials from past semesters."
        breadcrumbs={[{ label: "Home" }, { label: "My Classes" }]}
      />

      {classes.loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-ink-200 bg-ink-100"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Active */}
          <section>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-display text-[1.1rem] font-semibold text-navy-900">
                Active
              </h2>
              <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700 ring-1 ring-navy-100">
                {activeSemesters.length}
              </span>
            </div>

            {activeSemesters.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                No active semester enrollments.
              </p>
            ) : (
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeSemesters.map((s) => (
                  <SemesterCard
                    key={s.semesterId}
                    semesterId={s.semesterId}
                    semesterTitle={s.semesterTitle}
                    semesterStatus={s.semesterStatus}
                    classCount={s.classes.length}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Archived */}
          {archivedSemesters.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <h2 className="font-serif-display text-[1.1rem] font-semibold text-navy-900">
                  Archived
                </h2>
                <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-200">
                  {archivedSemesters.length}
                </span>
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {archivedSemesters.map((s) => (
                  <SemesterCard
                    key={s.semesterId}
                    semesterId={s.semesterId}
                    semesterTitle={s.semesterTitle}
                    semesterStatus={s.semesterStatus}
                    classCount={s.classes.length}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
