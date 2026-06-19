"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/app/services/api-client";
import { routes } from "@/lib/routes";
import { useAuth } from "@/app/hooks/use-auth";
import type { ClassOffering, LessonItem } from "@/app/types/course";

type GradeEntry = {
  lessonItemId: string;
  submissionId: string;
  title: string;
  scorePercent: number | null;
  passed: boolean | null;
  passThreshold: number;
  submittedAt?: string;
};

type ClassGrades = {
  cls: ClassOffering;
  entries: GradeEntry[];
  loading: boolean;
};

function ScoreBadge({ percent, passed }: { percent: number | null; passed: boolean | null }) {
  if (percent === null) {
    return (
      <span className="text-[11px] font-semibold text-ink-500">Submitted</span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-[1.1rem] font-bold text-navy-900">{percent}%</span>
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
          passed
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
            : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        {passed ? "Passed" : "Failed"}
      </span>
    </div>
  );
}

function ClassGradeGroup({ classGrades }: { classGrades: ClassGrades }) {
  const [open, setOpen] = useState(true);
  const { cls, entries, loading } = classGrades;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      {/* Class header — click to toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-cream-50"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {cls.course_code && (
              <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
                {cls.course_code}
              </span>
            )}
            {!loading && (
              <span className="text-[10px] text-ink-500">
                {entries.length} item{entries.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <h3 className="mt-1 font-serif-display text-[1rem] font-semibold text-navy-900 truncate">
            {cls.course_title ?? `Class ${cls.id}`}
          </h3>
        </div>
        <ExpandMoreRoundedIcon
          style={{ fontSize: 20 }}
          className={`shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-ink-100">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-ink-100"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">
              No graded assessments yet.
            </p>
          ) : (
            entries.map((entry) => (
              <Link
                key={entry.submissionId}
                href={routes.quizResult(cls.id, entry.submissionId)}
                className="flex items-center gap-4 border-b border-ink-100 px-5 py-4 last:border-0 transition hover:bg-cream-50"
              >
                <AssignmentOutlinedIcon
                  style={{ fontSize: 18 }}
                  className="shrink-0 text-gold-600"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-900 truncate">
                    {entry.title}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    Pass {entry.passThreshold}%
                  </p>
                </div>

                <ScoreBadge percent={entry.scorePercent} passed={entry.passed} />
                <ChevronRightRoundedIcon
                  style={{ fontSize: 18 }}
                  className="shrink-0 text-ink-400"
                />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StudentGradesSemesterPage({ semesterId }: { semesterId: string }) {
  const { user } = useAuth();
  const [classGrades, setClassGrades] = useState<ClassGrades[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterTitle, setSemesterTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      try {
        setError(null);
        // 1. Get all student classes, filter to this semester
        const classesRes = await api.student.classes();
        const semesterClasses = (classesRes.classes ?? []).filter(
          (c: ClassOffering) => c.semester_id === semesterId,
        );

        if (semesterClasses.length > 0) {
          setSemesterTitle(
            semesterClasses[0].semester_title ?? `Semester ${semesterId}`,
          );
        }

        // Initialise the state with loading=true per class
        setClassGrades(
          semesterClasses.map((cls: ClassOffering) => ({
            cls,
            entries: [],
            loading: true,
          })),
        );

        // 2. For each class, load lesson items and resolve grades
        await Promise.all(
          semesterClasses.map(async (cls: ClassOffering) => {
            try {
              const lessonsRes = await api.lessons.listForStudentClass(cls.id);
              const allItems: LessonItem[] = lessonsRes.lessons.flatMap(
                (l: { items: LessonItem[] }) => l.items,
              );

              // Only process completed assessments
              const completedAssessments = allItems.filter(
                (item) =>
                  item.item_type === "assessment" &&
                  item.progress_status === "completed",
              );

              const entries: GradeEntry[] = [];

              await Promise.all(
                completedAssessments.map(async (item) => {
                  try {
                    // assessmentStatus returns { status, submission_id?, score?, passed? }
                    const status = await api.student.assessmentStatus(
                      cls.id,
                      item.id,
                      String(user!.id),
                    );

                    if (!status?.submission_id) return;

                    const subId = String(status.submission_id);
                    let scorePercent: number | null = null;
                    let passed: boolean | null = null;

                    // Try to get the graded result for the score
                    const result = await api.submissions
                      .result(subId)
                      .catch(() => null);

                    if (result) {
                      scorePercent = result.score_percent ?? null;
                      passed = result.passed ?? null;
                    } else if (status.score !== undefined) {
                      scorePercent = status.score ?? null;
                      passed = status.passed ?? null;
                    }

                    entries.push({
                      lessonItemId: item.id,
                      submissionId: subId,
                      title: item.title,
                      scorePercent,
                      passed,
                      passThreshold: item.pass_threshold_percent ?? 70,
                    });
                  } catch {
                    // skip individual item on error
                  }
                }),
              );

              // Sort by title
              entries.sort((a, b) => a.title.localeCompare(b.title));

              setClassGrades((prev) =>
                prev.map((cg) =>
                  cg.cls.id === cls.id ? { ...cg, entries, loading: false } : cg,
                ),
              );
            } catch {
              setClassGrades((prev) =>
                prev.map((cg) =>
                  cg.cls.id === cls.id ? { ...cg, entries: [], loading: false } : cg,
                ),
              );
            }
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load grades.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [semesterId, user?.id]);

  return (
    <>
      <PageHeader
        title="Grades"
        description={
          semesterTitle
            ? `Assessment results for ${semesterTitle}`
            : "Assessment results for this semester"
        }
        breadcrumbs={[
          { label: "Home" },
          { label: "Grades", href: routes.grades },
          { label: semesterTitle || "Semester" },
        ]}
        actions={
          <Link
            href={routes.grades}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-700 shadow-sm transition hover:bg-cream-100"
          >
            <ArrowBackRoundedIcon style={{ fontSize: 16 }} />
            All semesters
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-ink-200 bg-ink-100"
            />
          ))}
        </div>
      ) : classGrades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <p className="text-sm text-ink-500">
            No classes found for this semester.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classGrades.map((cg) => (
            <ClassGradeGroup key={cg.cls.id} classGrades={cg} />
          ))}
        </div>
      )}
    </>
  );
}
