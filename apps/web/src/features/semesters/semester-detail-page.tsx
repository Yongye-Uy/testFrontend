"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { backendCapabilities } from "@/lib/backend-capabilities";
import { courseLabel, programName } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";
import { SemesterModal } from "./semesters-page";
import type { ClassOffering } from "@/types/course";

type DetailTab = "offerings" | "retake-required" | "retake-batches";

export function SemesterDetailPage({ id }: { id: string }) {
  const [editOpen, setEditOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("offerings");
  const [actionError, setActionError] = useState("");
  const semester = useAsync(() => api.semesters.get(id), [id]);
  const classes = useAsync(() => api.semesters.classes(id), [id]);
  const courses = useAsync(() => api.courses.list(), []);
  const programs = useAsync(() => api.programs.list(), []);
  const archived = semester.data?.status === "archived";
  const editable = semester.data?.status === "draft";
  const classCount = classes.data?.classes.length ?? 0;

  const grouped = useMemo(() => {
    return (classes.data?.classes ?? []).reduce<Record<string, ClassOffering[]>>((acc, item) => {
      const course = courses.data?.courses.find((row) => row.id === item.course_id);
      const key = programName(programs.data?.programs ?? [], course?.program_id);
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [classes.data?.classes, courses.data?.courses, programs.data?.programs]);

  async function setStatus(status: "draft" | "active" | "archived") {
    setActionError("");
    try {
      await api.semesters.changeStatus(id, status);
      await semester.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Status change failed");
    }
  }

  async function reloadAll() {
    await classes.reload();
    await semester.reload();
  }

  return (
    <>
      <BackLink href="/semesters" label="Semesters" />
      <PageHeader
        title={semester.data?.title ?? "Semester detail"}
        description="Class offerings stay active-only here. Retake tabs are in place for UXUI parity and will connect after the retake API is delivered."
        breadcrumbs={[{ label: "Home" }, { label: "Semesters" }, { label: semester.data?.title ?? "Semester detail" }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(true)} disabled={!editable}>
              Edit
            </Button>
            <Button variant="gold" disabled>
              Assign Batch
            </Button>
            <Button onClick={() => setClassOpen(true)} disabled={archived}>
              Add class
            </Button>
          </>
        }
      />
      {(semester.loading || classes.loading || courses.loading || programs.loading) && <LoadingState label="Loading semester" />}
      {(semester.error || classes.error || courses.error || programs.error || actionError) && (
        <ErrorState message={semester.error || classes.error || courses.error || programs.error || actionError} />
      )}
      {semester.data && (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-cream-100">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300">Academic term</span>
                  <StatusBadge value={semester.data.status} />
                </div>
                <h2 className="mt-1 font-serif-display text-2xl font-semibold text-cream-50">{semester.data.title}</h2>
                <p className="mt-1 text-sm text-cream-100/80">{semester.data.start_date} to {semester.data.end_date}</p>
              </div>
              {semester.data.status === "draft" && (
                <Button variant="gold" onClick={() => setStatus("active")}>
                  Publish semester
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-4">
            <InfoMetric label="Start" value={semester.data.start_date} />
            <InfoMetric label="End" value={semester.data.end_date} />
            <InfoMetric label="Offerings" value={String(classCount)} />
            <InfoMetric label="Batches" value={backendCapabilities.semesterBatchAssignment ? "Live" : "Soon"} />
          </div>
          {archived && (
            <div className="border-t border-gold-200 bg-gold-50 px-5 py-3 text-sm text-ink-700">
              <strong className="text-navy-900">Archived semester:</strong> view-only historical record. Editing, class creation, and batch assignment are disabled.
            </div>
          )}
        </Card>
      )}

      <SemesterDetailTabs active={activeTab} classCount={classCount} onChange={setActiveTab} />

      {activeTab === "offerings" && (
        <>
          {classes.data?.classes.length === 0 && (
            <EmptyState title="No class offerings" description="Add a course to this semester. Lecturer assignment can happen later." />
          )}
          <div className="space-y-5">
            {Object.entries(grouped).map(([program, rows]) => (
              <Card className="overflow-hidden" key={program}>
                <div className="flex items-center justify-between gap-3 border-b border-navy-100 bg-navy-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <h2 className="font-serif-display text-lg font-semibold text-navy-900">{program}</h2>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                      {rows.length} class{rows.length === 1 ? "" : "es"}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-4 py-3">Course</th>
                        <th className="px-4 py-3">Lecturer</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {rows.map((item) => {
                        const course = courses.data?.courses.find((row) => row.id === item.course_id);
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3 font-semibold text-navy-900">{courseLabel(course)}</td>
                            <td className="px-4 py-3 text-ink-600">{item.lecturer_id || "Unassigned"}</td>
                            <td className="px-4 py-3">
                              <StatusBadge value={item.status} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/classes/${item.id}`} className="font-semibold text-navy-700">
                                Open class
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-5 overflow-hidden">
            <div className="flex flex-col justify-between gap-3 border-b border-ink-100 bg-cream-100 px-5 py-4 md:flex-row md:items-center">
              <div>
                <h2 className="font-semibold text-navy-900">Assigned Batches</h2>
                <p className="mt-1 text-sm text-ink-600">Attach active or pending batches to this semester, then map them to classes.</p>
              </div>
              <Button variant="gold" disabled>
                Assign Batch
              </Button>
            </div>
            <div className="p-5">
              <CapabilityNotice
                title="Semester batch assignment is waiting on Backend2.0 API exposure"
                description="The UI is ready for assigned batches, manage classes, and remove-from-semester confirmation flows. Those actions stay disabled for now because the synced backend does not expose semester batch endpoints yet."
              />
            </div>
          </Card>
        </>
      )}

      {activeTab === "retake-required" && (
        <ComingSoonPanel
          title="Retake Required"
          description="This tab is intentionally in place for UXUI parity. It will connect once the retake-required API arrives from the other team."
        />
      )}

      {activeTab === "retake-batches" && (
        <ComingSoonPanel
          title="Retake Batches"
          description="This tab is intentionally in place for UXUI parity. Retake batch records and actions will connect after the external retake API is ready."
        />
      )}

      {semester.data && <SemesterModal open={editOpen} onClose={() => setEditOpen(false)} onDone={semester.reload} initial={semester.data} />}
      <AddClassModal
        open={classOpen}
        onClose={() => setClassOpen(false)}
        onDone={reloadAll}
        semesterId={id}
        courses={courses.data?.courses ?? []}
        programs={programs.data?.programs ?? []}
      />
    </>
  );
}

function SemesterDetailTabs({
  active,
  classCount,
  onChange,
}: {
  active: DetailTab;
  classCount: number;
  onChange: (value: DetailTab) => void;
}) {
  const tabs: { id: DetailTab; label: string; count: number }[] = [
    { id: "offerings", label: "Class Offerings", count: classCount },
    { id: "retake-required", label: "Retake Required", count: 0 },
    { id: "retake-batches", label: "Retake Batches", count: 0 },
  ];

  return (
    <div className="mb-5 -mt-2 flex items-center gap-1 border-b border-ink-200">
      {tabs.map((item) => {
        const selected = item.id === active;
        return (
          <button
            className={`relative px-4 py-2.5 text-sm font-semibold transition ${selected ? "text-navy-900" : "text-ink-500 hover:text-navy-800"}`}
            key={item.id}
            onClick={() => onChange(item.id)}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              {item.label}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-navy-100 text-navy-800" : "bg-cream-200 text-ink-600"}`}>
                {item.count}
              </span>
            </span>
            {selected && <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gold-500" />}
          </button>
        );
      })}
    </div>
  );
}

function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gold-700">Upcoming soon</p>
      <h2 className="mt-1 font-serif-display text-2xl font-semibold text-navy-900">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">{description}</p>
    </Card>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function AddClassModal({
  open,
  onClose,
  onDone,
  semesterId,
  courses,
  programs,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  semesterId: string;
  courses: { id: string; code: string; title: string; program_id: string }[];
  programs: { id: string; name: string }[];
}) {
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.semesters.addClass(semesterId, courseId);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add class failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add class offering"
      description="Creates an active class offering without a lecturer. Courses are grouped visually by program in the label."
      eyebrow="Director · Semester"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Course">
          <select className={inputClass} value={courseId} onChange={(event) => setCourseId(event.target.value)} required>
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {programName(programs, course.program_id)} / {course.code} - {course.title}
              </option>
            ))}
          </select>
        </Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Add class</Button>
        </div>
      </form>
    </Modal>
  );
}
