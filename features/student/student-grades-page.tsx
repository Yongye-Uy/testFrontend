"use client";

import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { api } from "@/lib/api-client";
import type { ClassOffering } from "@/types/course";
import { useAuth } from "@/hooks/use-auth";

type SubmissionRow = {
  id: string;
  assessment_id: string;
  lesson_item_id: string;
  class_id: string;
  student_id: string;
  status: string;
  submitted_at?: string;
};

type GradeEntry = {
  submissionId: string;
  assessmentTitle: string;
  submittedAt: string;
  percent: number;
  passed: boolean;
  threshold: number;
};

type ClassGrades = {
  cls: ClassOffering;
  entries: GradeEntry[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ClassGradeGroup({ group }: { group: ClassGrades }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-cream-50"
      >
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {group.cls.course_code && (
              <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
                {group.cls.course_code}
              </span>
            )}
            <span className="text-[10px] text-ink-500">
              {group.entries.length} item{group.entries.length === 1 ? "" : "s"}
            </span>
          </div>
          <h3 className="mt-1 font-serif-display text-[1rem] font-semibold text-navy-900">
            {group.cls.course_title ?? `Class ${group.cls.id}`}
          </h3>
        </div>
        <ExpandMoreRoundedIcon
          style={{ fontSize: 20 }}
          className={`shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-ink-100">
          {group.entries.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">
              No graded assessments yet.
            </p>
          ) : (
            group.entries.map((entry) => (
              <div
                key={entry.submissionId}
                className="flex items-center gap-4 border-b border-ink-100 px-5 py-4 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-900 truncate">
                    {entry.assessmentTitle}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    Submitted {formatDate(entry.submittedAt)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[1.1rem] font-bold text-navy-900">
                      {entry.percent}%
                    </p>
                    <p className="text-[10px] text-ink-500">
                      Pass {entry.threshold}%
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${
                      entry.passed
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-rose-50 text-rose-700 ring-rose-200"
                    }`}
                  >
                    {entry.passed ? "Passed" : "Failed"}
                  </span>

                  <ChevronRightRoundedIcon
                    style={{ fontSize: 18 }}
                    className="text-ink-400"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function StudentGradesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ClassGrades[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      try {
        const classesRes = await api.student.classes();
        const classes = classesRes.classes;

        const submissionsRaw = (await api.student.submissions(
          user!.id,
        )) as SubmissionRow[];

        const result: ClassGrades[] = [];

        for (const cls of classes) {
          const classSubmissions = submissionsRaw.filter(
            (s) => s.class_id === cls.id && s.status === "submitted",
          );

          const entries: GradeEntry[] = [];

          for (const sub of classSubmissions) {
            try {
              // Client-side score calculation
              const qs = (await api.submissions.questions(sub.id)) as Array<{
                id: string;
                question_text: string;
                type: string;
              }>;

              const [selRaw, ...optsPerQ] = await Promise.all([
                api.submissions.selectedOptions(sub.id),
                ...qs.map((q) =>
                  api.submissions.questionOptions(sub.id, q.id),
                ),
              ]);

              const selList = selRaw as Array<{
                question_id: string;
                option_id: string;
              }>;
              const selByQ: Record<string, Set<string>> = {};
              for (const s of selList) {
                if (!selByQ[s.question_id]) selByQ[s.question_id] = new Set();
                selByQ[s.question_id].add(s.option_id);
              }

              let correctCount = 0;
              for (let i = 0; i < qs.length; i++) {
                const opts = optsPerQ[i] as Array<{
                  id: string;
                  is_correct: boolean;
                }>;
                const sel = selByQ[qs[i].id] ?? new Set();
                const correctIds = new Set(
                  opts.filter((o) => o.is_correct).map((o) => o.id),
                );
                const isCorrect =
                  sel.size === correctIds.size &&
                  [...sel].every((id) => correctIds.has(id));
                if (isCorrect) correctCount++;
              }

              const percent =
                qs.length > 0 ? Math.round((correctCount / qs.length) * 100) : 0;
              const threshold = 70;

              // Get assessment title from lessons
              const lessons = await api.lessons
                .listForStudentClass(cls.id)
                .then((r) => r.lessons);
              const item = lessons
                .flatMap((l) => l.items)
                .find((i) => i.item_id === sub.assessment_id);

              entries.push({
                submissionId: sub.id,
                assessmentTitle: item?.title ?? `Assessment #${sub.assessment_id}`,
                submittedAt: sub.submitted_at ?? new Date().toISOString(),
                percent,
                passed: percent >= threshold,
                threshold,
              });
            } catch {
              // skip submission on error
            }
          }

          if (entries.length > 0 || classes.length <= 5) {
            result.push({ cls, entries });
          }
        }

        setGroups(result);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user?.id]);

  return (
    <>
      <PageHeader
        title="Grades"
        description="Every assessment grade across your enrolled classes, grouped by class."
        breadcrumbs={[{ label: "Home" }, { label: "Grades" }]}
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-ink-200 bg-ink-100"
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <p className="text-sm text-ink-500">
            No graded assessments yet. Complete a quiz to see your grades here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <ClassGradeGroup key={g.cls.id} group={g} />
          ))}
        </div>
      )}
    </>
  );
}
