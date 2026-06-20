"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Reorder } from "framer-motion";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DragIndicatorRoundedIcon from "@mui/icons-material/DragIndicatorRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/app/services/api-client";
import type { ClassLesson, LessonItem } from "@/app/types/course";
import { useAsync } from "@/app/features/shared/use-async";

type LecturerClassTab =
  | "overview"
  | "lessons"
  | "gradebook"
  | "student-progress";

export function LecturerClassDetailPage({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState<LecturerClassTab>("overview");
  const router = useRouter();
  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [reuseOpen, setReuseOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<LessonItem | null>(null);
  const [actionInfo, setActionInfo] = useState("");
  const [materialTarget, setMaterialTarget] = useState<string | null>(null);
  const [assessmentTarget, setAssessmentTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "item" | "week";
    id: string;
    label: string;
  } | null>(null);
  const classItem = useAsync(() => api.classes.get(id), [id]);
  const courses = useAsync(() => api.courses.list(), []);
  const semester = useAsync(async () => {
    if (!classItem.data?.semester_id) return null;
    return api.semesters.get(classItem.data.semester_id);
  }, [classItem.data?.semester_id]);
  const batches = useAsync(() => api.classes.batches(id), [id]);
  const enrollments = useAsync(() => api.classes.enrollments(id), [id]);
  const studentIdsKey = (enrollments.data?.enrollments ?? [])
    .map((item) => item.student_id)
    .join(",");
  const roster = useAsync(async () => {
    const ids = studentIdsKey ? studentIdsKey.split(",") : [];
    if (ids.length === 0) return { users: [] };
    return api.users.byIds(ids);
  }, [studentIdsKey]);
  const studentById = new Map(
    (roster.data?.users ?? []).map((user) => [user.id, user]),
  );
  const lessons = useAsync(async () => {
    const res = await api.lessons.listForClass(id);
    const detailed = await Promise.all(
      res.lessons.map((lesson) =>
        api.lessons.get(id, lesson.id).catch(() => ({ ...lesson, items: [] })),
      ),
    );
    return detailed.sort((a, b) => a.lesson_order - b.lesson_order);
  }, [id]);

  // Local mirror of the lessons so framer-motion drag reorder is immediate;
  // re-synced whenever the server data changes (load / create / delete).
  const [weeks, setWeeks] = useState<ClassLesson[]>([]);
  const weeksRef = useRef(weeks);
  useEffect(() => {
    weeksRef.current = weeks;
  }, [weeks]);
  useEffect(() => {
    if (lessons.data) setWeeks(lessons.data);
  }, [lessons.data]);

  async function persistWeekOrder() {
    try {
      await api.lessons.reorderLessons(
        id,
        weeksRef.current.map((week) => week.id),
      );
    } catch {
      await lessons.reload();
    }
  }
  function reorderItems(lessonId: string, items: ClassLesson["items"]) {
    setWeeks((prev) =>
      prev.map((week) => (week.id === lessonId ? { ...week, items } : week)),
    );
  }
  async function persistItemOrder(lessonId: string) {
    const week = weeksRef.current.find((item) => item.id === lessonId);
    if (!week) return;
    try {
      await api.lessons.reorderItems(
        id,
        lessonId,
        week.items.map((item) => item.id),
      );
    } catch {
      await lessons.reload();
    }
  }
  async function unlockItem(lessonItemId: string) {
    try {
      await api.lessons.unlockItem(id, lessonItemId);
      await lessons.reload();
    } catch {
      await lessons.reload();
    }
  }
  function editItem(item: LessonItem) {
    setActionInfo("");
    if (item.item_type === "assessment") {
      router.push(`/assessments/${item.item_id}`);
    } else {
      setActionInfo(
        "Editing materials in place isn't wired to the backend yet — delete and re-add for now.",
      );
    }
  }
  function archiveItem() {
    setActionInfo(
      "Archiving a single item isn't exposed by the course-service yet — it's on the backlog.",
    );
  }

  const allItems = weeks.flatMap((lesson) => lesson.items);
  const assessmentItems = allItems.filter(
    (item) => item.item_type === "assessment",
  );
  const releasedAssessments = assessmentItems.filter(
    (item) => item.status === "published",
  ).length;
  const totalItems = allItems.length;
  const unlockedItems = allItems.filter((item) => item.is_unlocked).length;
  const deliveredPct = totalItems
    ? Math.round((unlockedItems / totalItems) * 100)
    : 0;
  const publishedLessons = weeks.filter(
    (lesson) =>
      lesson.items.length > 0 && lesson.items.every((item) => item.is_unlocked),
  ).length;
  const upcoming = weeks.flatMap((lesson, weekIndex) =>
    lesson.items
      .filter((item) => !item.is_unlocked)
      .map((item) => ({ item, week: weekIndex + 1 })),
  );

  const course = courses.data?.courses.find(
    (item) => item.id === classItem.data?.course_id,
  );
  const semesterTitle = semester.data?.title;
  const batchLabel = batches.data?.batches[0]?.name ?? null;
  const studentCount = enrollments.data?.enrollments.length ?? 0;
  const title = course?.title ?? `Class ${id}`;
  const code = course?.code ?? "Class";
  const description =
    course?.description?.trim() ||
    "Foundational concepts for this class. Lesson and gradebook workflows connect once the teaching backend is exposed.";

  const subtitleParts = [code, semesterTitle, batchLabel].filter(Boolean);

  const loading =
    classItem.loading ||
    courses.loading ||
    semester.loading ||
    batches.loading ||
    enrollments.loading;
  const error =
    classItem.error ||
    courses.error ||
    semester.error ||
    batches.error ||
    enrollments.error;

  return (
    <>
      <BackLink href="/classes" label="My Classes" />
      <PageHeader
        title={title}
        description={subtitleParts.join(" · ")}
        breadcrumbs={[
          { label: "Home" },
          { label: "My Classes", href: "/classes" },
          { label: code },
        ]}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {studentCount} student{studentCount === 1 ? "" : "s"} enrolled
          </span>
        }
      />

      {loading && <PageSkeleton rows={4} />}
      {error && <ErrorState message={error} />}

      {classItem.data && (
        <>
          <LecturerClassTabs active={activeTab} onChange={setActiveTab} />

          {actionInfo && (
            <div className="mb-5 flex items-start justify-between gap-3 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-800 ring-1 ring-gold-200">
              <span>{actionInfo}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setActionInfo("")}
                className="shrink-0 text-gold-700 hover:text-gold-900"
              >
                <CloseRoundedIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
              <Card className="overflow-hidden p-0">
                <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-6 text-cream-100">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300">
                        {code}
                        {batchLabel ? ` · ${batchLabel}` : ""}
                      </p>
                      <h2 className="mt-2 font-serif-display text-[1.4rem] font-semibold leading-8 text-cream-50">
                        {title}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-100/85">
                        {description}
                      </p>
                    </div>
                    <ProgressRing value={deliveredPct} label="Delivered" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
                  <OverviewStat
                    icon={<Groups2OutlinedIcon fontSize="small" />}
                    label="Students"
                    value={String(studentCount)}
                    helper="enrolled"
                  />
                  <OverviewStat
                    icon={<AutoStoriesOutlinedIcon fontSize="small" />}
                    label="Lessons"
                    value={`${publishedLessons}/${weeks.length}`}
                    helper="published"
                  />
                  <OverviewStat
                    icon={<AssignmentOutlinedIcon fontSize="small" />}
                    label="Assessments"
                    value={`${releasedAssessments}/${assessmentItems.length}`}
                    helper="released"
                  />
                  <OverviewStat
                    icon={<InsightsOutlinedIcon fontSize="small" />}
                    label="Class progress"
                    value={`${deliveredPct}%`}
                    helper="items unlocked"
                  />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif-display text-[1.15rem] font-semibold leading-7 text-navy-900">
                    Upcoming deliverables
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                    Next up
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  Items still locked or pending publication.
                </p>
                <div className="mt-4 space-y-2">
                  {upcoming.length === 0 ? (
                    <p className="rounded-xl bg-cream-100 px-4 py-6 text-center text-sm text-ink-500">
                      Everything is unlocked. Nothing pending.
                    </p>
                  ) : (
                    upcoming.slice(0, 5).map(({ item, week }) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-ink-100 bg-cream-50 px-3 py-2.5"
                      >
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            item.item_type === "assessment"
                              ? "bg-gold-50 text-gold-700"
                              : "bg-navy-50 text-navy-700"
                          }`}
                        >
                          <ItemIcon item={item} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-navy-900">
                            {item.title}
                          </p>
                          <p className="text-xs text-ink-500">Week {week}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("lessons")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 text-sm font-semibold text-navy-700 transition hover:text-navy-900"
                >
                  Go to lessons →
                </button>
              </Card>
            </div>
          )}

          {activeTab === "lessons" && (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                    Lessons
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-600">
                    {weeks.length} week{weeks.length === 1 ? "" : "s"} ·{" "}
                    {weeks.reduce(
                      (sum, lesson) => sum + lesson.items.length,
                      0,
                    )}{" "}
                    items · drag to reorder
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setArchivedOpen(true)}
                    leftIcon={<Inventory2OutlinedIcon fontSize="small" />}
                  >
                    View archived items
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setReuseOpen(true)}
                    leftIcon={<HistoryRoundedIcon fontSize="small" />}
                  >
                    Reuse lessons
                  </Button>
                  <Button
                    onClick={() => setLessonModalOpen(true)}
                    leftIcon={<AddRoundedIcon fontSize="small" />}
                  >
                    Add week
                  </Button>
                </div>
              </div>
              {lessons.loading && <LoadingState label="Loading lessons" />}
              {lessons.error && <ErrorState message={lessons.error} />}
              {!lessons.loading && weeks.length === 0 ? (
                <Card className="p-8 text-center">
                  <h3 className="font-serif-display text-[1.25rem] font-semibold text-navy-900">
                    No lessons yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
                    Add your first week to start organizing materials and
                    assessments for this class.
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button
                      onClick={() => setLessonModalOpen(true)}
                      leftIcon={<AddRoundedIcon fontSize="small" />}
                    >
                      Add week
                    </Button>
                  </div>
                </Card>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={weeks}
                  onReorder={setWeeks}
                  className="space-y-4"
                >
                  {weeks.map((lesson, index) => (
                    <Reorder.Item
                      key={lesson.id}
                      value={lesson}
                      onDragEnd={() => persistWeekOrder()}
                      className="list-none"
                    >
                      <WeekCard
                        lesson={lesson}
                        index={index}
                        onReorderItems={(items) =>
                          reorderItems(lesson.id, items)
                        }
                        onPersistItems={() => persistItemOrder(lesson.id)}
                        onUnlock={unlockItem}
                        onAddMaterial={() => setMaterialTarget(lesson.id)}
                        onAddAssessment={() => setAssessmentTarget(lesson.id)}
                        onReuse={() => setReuseOpen(true)}
                        onAddWeek={() => setLessonModalOpen(true)}
                        onPreview={(item) => setPreviewItem(item)}
                        onEdit={editItem}
                        onArchive={archiveItem}
                        onDeleteWeek={() =>
                          setDeleteTarget({
                            kind: "week",
                            id: lesson.id,
                            label: lesson.title,
                          })
                        }
                        onDeleteItem={(item) =>
                          setDeleteTarget({
                            kind: "item",
                            id: item.id,
                            label: item.title,
                          })
                        }
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              )}
            </>
          )}

          {activeTab === "gradebook" && (
            <ComingSoonPanel
              title="Gradebook"
              description="Per-class grade aggregation will connect to grading-service once class-scoped gradebook reads are available."
            />
          )}

          {activeTab === "student-progress" && (
            <Card className="overflow-hidden p-0">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
                  Student roster
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  Students enrolled in this class. Lesson-completion progress
                  connects once progress reads are exposed.
                </p>
              </div>
              {roster.loading && <LoadingState label="Loading roster" />}
              {studentCount === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-ink-500">
                  No students are enrolled in this class yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                      <tr>
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Progress</th>
                        <th className="px-5 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {enrollments.data?.enrollments.map((enrollment) => {
                        const student = studentById.get(enrollment.student_id);
                        return (
                          <tr key={enrollment.id}>
                            <td className="px-5 py-3">
                              <p className="font-semibold text-navy-900">
                                {student?.full_name ??
                                  `Student ${enrollment.student_id}`}
                              </p>
                              <p className="mt-0.5 text-ink-500">
                                {student?.email ?? "—"}
                              </p>
                            </td>
                            <td className="px-5 py-3 text-ink-400">
                              Coming soon
                            </td>
                            <td className="px-5 py-3 text-right">
                              <StatusBadge value={enrollment.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <AddLessonModal
        classId={id}
        open={lessonModalOpen}
        onClose={() => setLessonModalOpen(false)}
        onDone={async () => {
          setLessonModalOpen(false);
          await lessons.reload();
        }}
      />

      <ArchivedItemsModal
        classId={id}
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
      />

      <ReuseLessonsModal
        classId={id}
        open={reuseOpen}
        onClose={() => setReuseOpen(false)}
        onDone={async () => {
          setReuseOpen(false);
          await lessons.reload();
        }}
      />

      <PreviewModal
        code={code}
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      <AddMaterialModal
        classId={id}
        code={code}
        lessonId={materialTarget}
        onClose={() => setMaterialTarget(null)}
        onDone={async () => {
          setMaterialTarget(null);
          await lessons.reload();
        }}
      />

      <AddAssessmentModal
        classId={id}
        lessonId={assessmentTarget}
        onClose={() => setAssessmentTarget(null)}
        onDone={async () => {
          setAssessmentTarget(null);
          await lessons.reload();
        }}
      />

      <DeleteLessonItemModal
        classId={id}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={async () => {
          setDeleteTarget(null);
          await lessons.reload();
        }}
      />
    </>
  );
}

function DeleteLessonItemModal({
  classId,
  target,
  onClose,
  onDone,
}: {
  classId: string;
  target: { kind: "item" | "week"; id: string; label: string } | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!target) return;
    setLoading(true);
    setError("");
    try {
      if (target.kind === "week") {
        await api.lessons.remove(classId, target.id);
      } else {
        await api.lessons.deleteItem(classId, target.id);
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={target?.kind === "week" ? "Delete week" : "Delete item"}
      description={
        target?.kind === "week"
          ? "This removes the week and its materials/assessments from the class. This can't be undone."
          : "This removes the item from the week. This can't be undone."
      }
      eyebrow="Lecturer · Lessons"
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-cream-100 px-4 py-3 text-sm text-navy-900">
          {target?.label}
        </p>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" loading={loading} onClick={confirm}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddLessonModal({
  classId,
  open,
  onClose,
  onDone,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.lessons.create(classId, title.trim());
      setTitle("");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create lesson failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add lesson"
      description="Create a lesson to group materials and assessments for this class."
      eyebrow="Lecturer · Lessons"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Lesson title">
          <input
            className={inputClass}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Week 1 · Foundations"
            required
          />
        </Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Add lesson</Button>
        </div>
      </form>
    </Modal>
  );
}

function ArchivedItemsModal({
  classId,
  open,
  onClose,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
}) {
  const archived = useAsync(
    () =>
      open ? api.lessons.archived(classId) : Promise.resolve({ lessons: [] }),
    [open ? "open" : "closed", classId],
  );
  const lessons = archived.data?.lessons ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Archived items"
      description="Items archived from this class are kept here for history and reference. They are read-only."
      eyebrow="Lessons"
    >
      <div className="space-y-4">
        {archived.loading && <LoadingState label="Loading archived items" />}
        {archived.error && <ErrorState message={archived.error} />}
        {!archived.loading && lessons.length === 0 ? (
          <p className="rounded-xl bg-cream-100 px-4 py-10 text-center text-sm text-ink-600">
            No archived items yet.
          </p>
        ) : (
          <div className="max-h-[360px] space-y-2 overflow-y-auto">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-cream-50 px-4 py-3"
              >
                <span className="font-medium text-navy-900">
                  {lesson.title}
                </span>
                <span className="text-xs text-ink-500">
                  {lesson.item_count} item{lesson.item_count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PreviewModal({
  code,
  item,
  onClose,
}: {
  code: string;
  item: LessonItem | null;
  onClose: () => void;
}) {
  const isAssessment = item?.item_type === "assessment";
  const badge = item ? (isAssessment ? "Assessment" : materialBadge(item)) : "";

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item?.title ?? "Preview"}
      description="This is exactly how students will see this item."
      eyebrow="Lecturer · Preview as student"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Close preview
        </Button>
      }
    >
      {item && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gold-50 px-4 py-3 text-sm font-semibold text-gold-800 ring-1 ring-gold-200">
            <span>Preview mode — interactions are read-only.</span>
            <span className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] uppercase tracking-wider">
              {badge}
            </span>
          </div>

          <div className="rounded-xl bg-navy-900 px-5 py-4 text-cream-100">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cream-50/10 text-gold-300">
                <ItemIcon item={item} />
              </span>
              <div>
                <p className="font-semibold text-cream-50">{item.title}</p>
                <p className="text-xs text-cream-100/70">
                  {badge}
                  {isAssessment ? ` · ${assessmentMeta(item)}` : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-ink-100 bg-cream-50/60 px-5 py-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
              {code} · {isAssessment ? "Assessment" : "Material"}
            </p>
            <h3 className="mt-1 font-serif-display text-[1.3rem] font-semibold text-navy-900">
              {item.title}
            </h3>
            {item.description ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {item.description}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-500">
                No description was provided for this{" "}
                {isAssessment ? "assessment" : "material"}.
              </p>
            )}

            {isAssessment && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <PreviewFact
                  label="Questions"
                  value={String(item.question_count ?? 0)}
                />
                <PreviewFact
                  label="Time limit"
                  value={
                    item.time_limit_seconds
                      ? `${Math.round(item.time_limit_seconds / 60)} min`
                      : "None"
                  }
                />
                <PreviewFact
                  label="Pass mark"
                  value={
                    item.pass_threshold_percent != null
                      ? `${Math.round(item.pass_threshold_percent)}%`
                      : "—"
                  }
                />
              </div>
            )}

            {!isAssessment && item.link_url && (
              <a
                href={item.link_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-cream-50 transition hover:bg-navy-900"
              >
                <OpenInNewRoundedIcon sx={{ fontSize: 16 }} /> Open resource
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-0.5 font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function ReuseLessonsModal({
  classId,
  open,
  onClose,
  onDone,
}: {
  classId: string;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const openKey = open ? "open" : "closed";
  const classes = useAsync(
    () => (open ? api.classes.list() : Promise.resolve({ classes: [] })),
    [openKey],
  );
  const courses = useAsync(
    () => (open ? api.courses.list() : Promise.resolve({ courses: [] })),
    [openKey],
  );
  const semesters = useAsync(
    () => (open ? api.semesters.list() : Promise.resolve({ semesters: [] })),
    [openKey],
  );
  const sourceLessons = useAsync(
    () =>
      expanded
        ? api.lessons.listForClass(expanded)
        : Promise.resolve({ lessons: [] }),
    [expanded],
  );

  const courseById = new Map(
    (courses.data?.courses ?? []).map((course) => [course.id, course]),
  );
  const semesterById = new Map(
    (semesters.data?.semesters ?? []).map((sem) => [sem.id, sem]),
  );

  const rows = (classes.data?.classes ?? [])
    .filter((item) => item.id !== classId)
    .map((item) => {
      const course = courseById.get(item.course_id);
      return {
        id: item.id,
        code: course?.code ?? `Class ${item.id}`,
        title: course?.title ?? "Untitled course",
        semester: semesterById.get(item.semester_id)?.title ?? "",
      };
    })
    .filter((row) => {
      const value = query.trim().toLowerCase();
      if (!value) return true;
      return `${row.code} ${row.title}`.toLowerCase().includes(value);
    });

  function toggleLesson(lessonId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      for (const lessonId of selected) {
        await api.lessons.reuseLesson(classId, lessonId);
      }
      setSelected(new Set());
      setExpanded(null);
      setQuery("");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reuse lessons failed");
    } finally {
      setSubmitting(false);
    }
  }

  const loadingClasses =
    classes.loading || courses.loading || semesters.loading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reuse lessons"
      description="Search any class, expand it, and copy whole lessons (with their materials and assessments) into this class."
      eyebrow="Lecturer · Carry over"
    >
      <div className="space-y-4">
        <Field label="Search class">
          <input
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by class code or title..."
          />
        </Field>

        {loadingClasses && <LoadingState label="Loading classes" />}
        {(classes.error || courses.error) && (
          <ErrorState message={classes.error || courses.error} />
        )}

        {!loadingClasses && (
          <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-ink-100 bg-white p-2">
            {rows.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-500">
                No other classes found.
              </p>
            ) : (
              rows.map((row) => {
                const isOpen = expanded === row.id;
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-ink-100 bg-cream-50"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : row.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span className="flex items-center gap-2">
                        {isOpen ? (
                          <KeyboardArrowDownRoundedIcon
                            sx={{ fontSize: 18 }}
                            className="text-ink-400"
                          />
                        ) : (
                          <KeyboardArrowRightRoundedIcon
                            sx={{ fontSize: 18 }}
                            className="text-ink-400"
                          />
                        )}
                        <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
                          {row.code}
                        </span>
                        <span className="font-semibold text-navy-900">
                          {row.title}
                        </span>
                      </span>
                      {row.semester && (
                        <span className="text-xs text-ink-500">
                          {row.semester}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-ink-100 px-4 py-2">
                        {sourceLessons.loading && (
                          <LoadingState label="Loading lessons" />
                        )}
                        {!sourceLessons.loading &&
                        (sourceLessons.data?.lessons.length ?? 0) === 0 ? (
                          <p className="py-3 text-sm text-ink-500">
                            This class has no lessons to reuse.
                          </p>
                        ) : (
                          sourceLessons.data?.lessons.map((lesson) => (
                            <label
                              key={lesson.id}
                              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(lesson.id)}
                                onChange={() => toggleLesson(lesson.id)}
                              />
                              <span className="flex-1 text-sm font-medium text-navy-900">
                                {lesson.title}
                              </span>
                              <span className="text-xs text-ink-500">
                                {lesson.item_count} item
                                {lesson.item_count === 1 ? "" : "s"}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {error && <ErrorState message={error} />}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-ink-500">
            {selected.size} lesson{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={submitting}
              disabled={selected.size === 0}
              onClick={submit}
            >
              Reuse selected lessons
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

function mimeToMaterialType(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

function AddMaterialModal({
  classId,
  code,
  lessonId,
  onClose,
  onDone,
}: {
  classId: string;
  code: string;
  lessonId: string | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", description: "", linkUrl: "" });
  const [source, setSource] = useState<"upload" | "link">("link");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [setOpenDate, setSetOpenDate] = useState(false);
  const [openDateValue, setOpenDateValue] = useState("");
  const [unlockRule, setUnlockRule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setForm({ title: "", description: "", linkUrl: "" });
    setSource("link");
    setPickedFile(null);
    setUploadProgress(null);
    setSetOpenDate(false);
    setOpenDateValue("");
    setUnlockRule(false);
    setError("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("File exceeds 50 MB limit.");
      return;
    }
    setError("");
    setPickedFile(file);
    // pre-fill title from file name if title is empty
    if (!form.title.trim()) {
      setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError("File exceeds 50 MB limit."); return; }
    setError("");
    setPickedFile(file);
    if (!form.title.trim()) setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
  }


  async function submit() {
    if (!lessonId) return;
    if (!form.title.trim()) { setError("Material title is required."); return; }
    if (source === "upload" && !pickedFile) { setError("Please pick a file to upload."); return; }
    if (source === "link" && !form.linkUrl.trim()) { setError("Please enter a URL."); return; }

    setLoading(true);
    setError("");
    try {
      const unlockFields = {
        ...(unlockRule ? { requirePrevious: true } : {}),
        ...(setOpenDate && openDateValue ? { requireOpenDate: true, scheduledOpenDate: new Date(openDateValue).toISOString() } : {}),
      };
      if (source === "upload" && pickedFile) {
        setUploadProgress(0);
        const { object_key, file_name, mime_type } = await api.lessons.uploadFile(pickedFile, setUploadProgress);
        await api.lessons.addMaterial(classId, lessonId, {
          title: form.title.trim(),
          description: form.description.trim(),
          type: mimeToMaterialType(mime_type),
          file: { fileObjectKey: object_key, fileName: file_name, mimeType: mime_type },
          ...unlockFields,
        });
      } else {
        await api.lessons.addMaterial(classId, lessonId, {
          title: form.title.trim(),
          description: form.description.trim(),
          type: "link",
          linkUrl: form.linkUrl.trim(),
          ...unlockFields,
        });
      }
      reset();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add material failed");
      setUploadProgress(null);
    } finally {
      setLoading(false);
    }
  }

  const canSave = source === "link"
    ? !!form.title.trim() && !!form.linkUrl.trim()
    : !!form.title.trim() && !!pickedFile;

  return (
    <Modal
      open={lessonId !== null}
      onClose={() => { reset(); onClose(); }}
      title="Create material"
      description="Add a reading, PDF, video, or external link to this class."
      eyebrow={`${code} · New material`}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button variant="gold" loading={loading} disabled={!canSave} onClick={submit}>
            Save material
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Material title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Variables & Data Types"
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief learning objective for this material..."
          />
        </Field>

        {/* Source toggle */}
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Source
          </p>
          <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setSource("upload")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                source === "upload" ? "bg-navy-800 text-cream-50" : "text-ink-600 hover:bg-cream-100"
              }`}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 16 }} /> Upload file
            </button>
            <button
              type="button"
              onClick={() => setSource("link")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                source === "link" ? "bg-navy-800 text-cream-50" : "text-ink-600 hover:bg-cream-100"
              }`}
            >
              <LinkRoundedIcon sx={{ fontSize: 16 }} /> Add link
            </button>
          </div>

          {source === "upload" ? (
            <div className="mt-3">
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
                  pickedFile
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-ink-200 bg-cream-50/60 hover:border-navy-300 hover:bg-cream-100"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.mp4,.webm"
                  onChange={handleFileChange}
                />
                {pickedFile ? (
                  <>
                    <PictureAsPdfOutlinedIcon sx={{ fontSize: 28 }} className="text-emerald-500" />
                    <p className="mt-2 font-semibold text-navy-900">{pickedFile.name}</p>
                    <p className="mt-1 text-xs text-ink-500">
                      {(pickedFile.size / 1024 / 1024).toFixed(1)} MB · click to change
                    </p>
                  </>
                ) : (
                  <>
                    <CloudUploadOutlinedIcon sx={{ fontSize: 28 }} className="text-ink-400" />
                    <p className="mt-2 font-semibold text-navy-900">Drop file or click to upload</p>
                    <p className="mt-1 text-xs text-ink-500">PDF, DOCX, DOC, TXT, MP4 · max 50 MB</p>
                  </>
                )}
              </div>

              {/* Upload progress bar */}
              {uploadProgress !== null && (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-600">
                    <span>Uploading…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-gold-500 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <Field label="Link URL">
                <input
                  className={inputClass}
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="https://..."
                  type="url"
                />
              </Field>
            </div>
          )}
        </div>

        {/* Unlock rules */}
        <div className="space-y-3 border-t border-ink-100 pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={setOpenDate}
              onChange={(e) => setSetOpenDate(e.target.checked)}
            />
            <span>
              <span className="text-sm font-semibold text-navy-900">Set open date</span>
              {setOpenDate ? (
                <input
                  type="date"
                  className={`${inputClass} mt-2`}
                  value={openDateValue}
                  onChange={(e) => setOpenDateValue(e.target.value)}
                />
              ) : (
                <span className="mt-0.5 block text-xs text-ink-500">
                  No scheduled open date — availability governed by unlock rule below.
                </span>
              )}
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={unlockRule}
              onChange={(e) => setUnlockRule(e.target.checked)}
            />
            <span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Unlock rule</span>
              <span className="mt-0.5 block text-sm text-navy-900">
                Require students to complete the previous item before this one unlocks
              </span>
            </span>
          </label>
        </div>

        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

function AddAssessmentModal({
  classId,
  lessonId,
  onClose,
  onDone,
}: {
  classId: string;
  lessonId: string | null;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unlockRule, setUnlockRule] = useState(false);
  const [setOpenDate, setSetOpenDate] = useState(false);
  const [openDateValue, setOpenDateValue] = useState("");
  const assessments = useAsync(
    () =>
      lessonId !== null
        ? api.assessments.list()
        : Promise.resolve({ assessments: [] }),
    [lessonId],
  );

  function buildNew() {
    if (!lessonId) return;
    router.push(
      `/assessments/new?classId=${encodeURIComponent(
        classId,
      )}&lessonId=${encodeURIComponent(lessonId)}`,
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!lessonId) return;
    setLoading(true);
    setError("");
    try {
      if (!selectedId) throw new Error("Select an assessment first.");
      await api.lessons.addAssessment(classId, lessonId, selectedId, {
        ...(unlockRule ? { requirePrevious: true } : {}),
        ...(setOpenDate && openDateValue ? { requireOpenDate: true, scheduledOpenDate: new Date(openDateValue).toISOString() } : {}),
      });
      setSelectedId("");
      setUnlockRule(false);
      setSetOpenDate(false);
      setOpenDateValue("");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add assessment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={lessonId !== null}
      onClose={onClose}
      title="Add assessment"
      description="Attach an assessment you've authored to this lesson."
      eyebrow="Lecturer · Assessments"
    >
      <form onSubmit={submit} className="space-y-4">
        {assessments.loading && <LoadingState label="Loading assessments" />}
        {assessments.error && <ErrorState message={assessments.error} />}
        {!assessments.loading &&
          (assessments.data?.assessments.length ?? 0) === 0 && (
            <div className="rounded-xl bg-cream-100 px-4 py-6 text-center">
              <p className="text-sm text-ink-600">
                You haven&apos;t authored any assessments yet.
              </p>
              <Button
                type="button"
                variant="gold"
                className="mt-3"
                onClick={buildNew}
              >
                Build new assessment
              </Button>
            </div>
          )}
        {(assessments.data?.assessments.length ?? 0) > 0 && (
          <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-ink-100 bg-white p-3">
            {assessments.data?.assessments.map((assessment) => (
              <label
                key={assessment.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                  selectedId === assessment.id
                    ? "border-navy-300 bg-navy-50"
                    : "border-ink-100 bg-cream-50 hover:border-ink-200"
                }`}
              >
                <input
                  checked={selectedId === assessment.id}
                  className="mt-1"
                  name="assessment_id"
                  onChange={() => setSelectedId(assessment.id)}
                  type="radio"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">
                    {assessment.title}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {assessment.question_count} question
                    {assessment.question_count === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusBadge value={assessment.status} />
              </label>
            ))}
          </div>
        )}
        <div className="space-y-2 rounded-xl border border-ink-100 bg-cream-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Unlock rules</p>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={unlockRule}
              onChange={(e) => setUnlockRule(e.target.checked)}
            />
            Require previous item to be completed
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={setOpenDate}
              onChange={(e) => { setSetOpenDate(e.target.checked); if (!e.target.checked) setOpenDateValue(""); }}
            />
            Schedule open date
          </label>
          {setOpenDate && (
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
              value={openDateValue}
              onChange={(e) => setOpenDateValue(e.target.value)}
            />
          )}
        </div>
        {error && <ErrorState message={error} />}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={buildNew}>
            <AddRoundedIcon sx={{ fontSize: 16 }} /> Build new assessment
          </Button>
          <Button disabled={!selectedId} loading={loading}>Add assessment</Button>
        </div>
      </form>
    </Modal>
  );
}

function assessmentMeta(item: LessonItem) {
  return [
    item.question_count != null
      ? `${item.question_count} question${item.question_count === 1 ? "" : "s"}`
      : null,
    item.time_limit_seconds
      ? `${Math.round(item.time_limit_seconds / 60)} min`
      : null,
    item.pass_threshold_percent != null
      ? `pass ${Math.round(item.pass_threshold_percent)}%`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function materialBadge(item: LessonItem) {
  const type = (item.material_type ?? "").toLowerCase();
  if (type === "pdf") return "PDF";
  if (type === "document") return "DOC";
  if (type === "text") return "TXT";
  if (type === "link") return "LINK";
  return "MATERIAL";
}

function ItemIcon({ item }: { item: LessonItem }) {
  if (item.item_type === "assessment")
    return <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />;
  const type = (item.material_type ?? "").toLowerCase();
  if (type === "pdf") return <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />;
  if (type === "link") return <LinkRoundedIcon sx={{ fontSize: 18 }} />;
  return <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />;
}

type MenuAction = {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
};

function KebabMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More actions"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg p-1.5 text-ink-400 transition hover:bg-cream-100 hover:text-navy-700"
      >
        <MoreVertRoundedIcon fontSize="small" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl border border-ink-100 bg-white py-2 shadow-pop">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[15px] font-semibold transition hover:bg-cream-100 ${
                action.danger
                  ? "text-rose-600 hover:bg-rose-50"
                  : "text-navy-800"
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FooterLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-navy-700 transition hover:bg-cream-100 hover:text-navy-900"
    >
      {children}
    </button>
  );
}

function WeekCard({
  lesson,
  index,
  onReorderItems,
  onPersistItems,
  onUnlock,
  onAddMaterial,
  onAddAssessment,
  onReuse,
  onAddWeek,
  onPreview,
  onEdit,
  onArchive,
  onDeleteWeek,
  onDeleteItem,
}: {
  lesson: ClassLesson;
  index: number;
  onReorderItems: (items: LessonItem[]) => void;
  onPersistItems: () => void;
  onUnlock: (lessonItemId: string) => void;
  onAddMaterial: () => void;
  onAddAssessment: () => void;
  onReuse: () => void;
  onAddWeek: () => void;
  onPreview: (item: LessonItem) => void;
  onEdit: (item: LessonItem) => void;
  onArchive: (item: LessonItem) => void;
  onDeleteWeek: () => void;
  onDeleteItem: (item: LessonItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  // Local items state so framer-motion Reorder has a controlled array it can mutate.
  const [localItems, setLocalItems] = useState(lesson.items);
  useEffect(() => { setLocalItems(lesson.items); }, [lesson.items]);

  function handleReorder(items: LessonItem[]) {
    setLocalItems(items);
    onReorderItems(items);
  }

  const materialCount = localItems.filter(
    (item) => item.item_type !== "assessment",
  ).length;
  const assessmentCount = localItems.filter(
    (item) => item.item_type === "assessment",
  ).length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-cream-100/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <DragIndicatorRoundedIcon
            fontSize="small"
            className="cursor-grab text-ink-300"
          />
          <button
            type="button"
            aria-label={collapsed ? "Expand week" : "Collapse week"}
            onClick={() => setCollapsed((value) => !value)}
            className="rounded-lg p-1 text-ink-500 transition hover:bg-cream-200"
          >
            {collapsed ? (
              <KeyboardArrowRightRoundedIcon sx={{ fontSize: 20 }} />
            ) : (
              <KeyboardArrowDownRoundedIcon sx={{ fontSize: 20 }} />
            )}
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
              Week {index + 1}
            </p>
            <h3 className="mt-0.5 font-serif-display text-[1.05rem] font-semibold leading-7 text-navy-900">
              {lesson.title}
            </h3>
            <p className="mt-0.5 text-xs text-ink-500">
              {materialCount} material{materialCount === 1 ? "" : "s"} ·{" "}
              {assessmentCount} assessment{assessmentCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <KebabMenu
          actions={[
            {
              label: "Add material",
              icon: <AddRoundedIcon sx={{ fontSize: 18 }} />,
              onClick: onAddMaterial,
            },
            {
              label: "Add assessment",
              icon: <AddRoundedIcon sx={{ fontSize: 18 }} />,
              onClick: onAddAssessment,
            },
            {
              label: "Delete week",
              icon: <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />,
              onClick: onDeleteWeek,
              danger: true,
            },
          ]}
        />
      </div>

      {!collapsed && (
        <>
          {lesson.items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-500">
              No materials or assessments in this week yet.
            </p>
          ) : (
            <Reorder.Group
              axis="y"
              values={localItems}
              onReorder={handleReorder}
              className="divide-y divide-ink-100"
            >
              {localItems.map((item) => {
                const isAssessment = item.item_type === "assessment";
                return (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    onDragEnd={onPersistItems}
                    className="flex list-none items-center justify-between gap-3 bg-white px-5 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <DragIndicatorRoundedIcon
                        fontSize="small"
                        className="cursor-grab text-ink-300"
                      />
                      <span
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isAssessment
                            ? "bg-gold-50 text-gold-700"
                            : "bg-navy-50 text-navy-700"
                        }`}
                      >
                        <ItemIcon item={item} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isAssessment
                                ? "bg-gold-100 text-gold-800"
                                : "bg-navy-50 text-navy-600 ring-1 ring-navy-100"
                            }`}
                          >
                            {isAssessment ? "Assessment" : materialBadge(item)}
                          </span>
                          {isAssessment && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                item.is_unlocked
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-ink-100 text-ink-600 ring-1 ring-ink-200"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                              {item.is_unlocked ? "Available" : "Locked"}
                            </span>
                          )}
                          <span className="truncate font-semibold text-navy-900">
                            {item.title}
                          </span>
                        </div>
                        {isAssessment && (
                          <p className="mt-0.5 text-xs text-ink-500">
                            {assessmentMeta(item)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Preview as student"
                        title="Preview as student"
                        onClick={() => onPreview(item)}
                        className="rounded-lg p-1.5 text-ink-400 transition hover:bg-cream-100 hover:text-navy-700"
                      >
                        <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                      </button>
                      <KebabMenu
                        actions={[
                          ...(item.is_unlocked
                            ? []
                            : [
                                {
                                  label: "Make available",
                                  icon: (
                                    <LockOpenRoundedIcon
                                      sx={{ fontSize: 18 }}
                                    />
                                  ),
                                  onClick: () => onUnlock(item.id),
                                },
                              ]),
                          {
                            label: "Edit",
                            icon: <EditOutlinedIcon sx={{ fontSize: 18 }} />,
                            onClick: () => onEdit(item),
                          },
                          {
                            label: "Archive",
                            icon: <ArchiveOutlinedIcon sx={{ fontSize: 18 }} />,
                            onClick: () => onArchive(item),
                          },
                          {
                            label: "Delete",
                            icon: (
                              <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                            ),
                            onClick: () => onDeleteItem(item),
                            danger: true,
                          },
                        ]}
                      />
                    </div>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}

          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-ink-100 bg-cream-50/50 px-5 py-2.5">
            <FooterLink onClick={onAddMaterial}>
              <AddRoundedIcon sx={{ fontSize: 16 }} /> Material
            </FooterLink>
            <span className="text-ink-300">·</span>
            <FooterLink onClick={onAddAssessment}>
              <AddRoundedIcon sx={{ fontSize: 16 }} /> Assessment
            </FooterLink>
            <span className="text-ink-300">·</span>
            <FooterLink onClick={onReuse}>
              <HistoryRoundedIcon sx={{ fontSize: 16 }} /> Reuse lessons
            </FooterLink>
            <span className="text-ink-300">·</span>
            <FooterLink onClick={onAddWeek}>
              <AddRoundedIcon sx={{ fontSize: 16 }} /> Add week
            </FooterLink>
          </div>
        </>
      )}
    </Card>
  );
}

function LecturerClassTabs({
  active,
  onChange,
}: {
  active: LecturerClassTab;
  onChange: (value: LecturerClassTab) => void;
}) {
  const tabs: { id: LecturerClassTab; label: string; icon: ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <MenuBookOutlinedIcon fontSize="small" />,
    },
    {
      id: "lessons",
      label: "Lessons",
      icon: <AutoStoriesOutlinedIcon fontSize="small" />,
    },
    {
      id: "gradebook",
      label: "Gradebook",
      icon: <AssignmentOutlinedIcon fontSize="small" />,
    },
    {
      id: "student-progress",
      label: "Student Progress",
      icon: <Groups2OutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <Card className="mb-5 p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                selected
                  ? "bg-navy-800 text-cream-50 shadow-soft"
                  : "text-ink-600 hover:bg-cream-100 hover:text-navy-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function OverviewStat({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 font-serif-display text-[1.6rem] font-semibold leading-8 text-navy-900">
        {value}
      </p>
      <p className="mt-0.5 text-sm text-ink-500">{helper}</p>
    </div>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative h-[88px] w-[88px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-cream-50/20"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-gold-400"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.05rem] font-bold leading-none text-cream-50">
          {clamped}%
        </span>
        <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-gold-300">
          {label}
        </span>
      </div>
    </div>
  );
}

function ComingSoonPanel({
  title,
  description,
  className = "",
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Card className={`p-8 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-700">
        Coming soon
      </p>
      <h2 className="mt-2 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-ink-600">{description}</p>
    </Card>
  );
}
