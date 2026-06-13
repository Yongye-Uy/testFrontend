"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass, textareaClass } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api-client";
import { programName } from "./course-utils";
import { useAsync } from "@/features/shared/use-async";
import type { Program } from "@/types/course";

const NEW_PROGRAM_VALUE = "__new_program__";

export function CoursesPage() {
  const [programId, setProgramId] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [expandedPrograms, setExpandedPrograms] = useState<
    Record<string, boolean>
  >({});
  const programs = useAsync(() => api.programs.list(), []);
  const courses = useAsync(
    () => api.courses.list(programId || undefined),
    [programId],
  );
  const grouped = useMemo(() => {
    const rows = courses.data?.courses ?? [];
    return rows.reduce<Record<string, typeof rows>>((acc, course) => {
      const key = programName(programs.data?.programs ?? [], course.program_id);
      acc[key] = [...(acc[key] ?? []), course];
      return acc;
    }, {});
  }, [courses.data?.courses, programs.data?.programs]);

  useEffect(() => {
    const keys = Object.keys(grouped);
    if (keys.length === 0) return;
    setExpandedPrograms((current) => {
      const next = { ...current };
      keys.forEach((key, index) => {
        if (next[key] === undefined) next[key] = index === 0;
      });
      return next;
    });
  }, [grouped]);

  async function reloadAll() {
    await programs.reload();
    await courses.reload();
  }

  return (
    <>
      <PageHeader
        title="Course Catalog"
        description="Master course list grouped by program. Creating a catalog record does not create a class offering."
        breadcrumbs={[{ label: "Home" }, { label: "Course Catalog" }]}
        actions={
          <Button
            leftIcon={<AddRoundedIcon fontSize="small" />}
            onClick={() => setCourseOpen(true)}
          >
            Create course
          </Button>
        }
      />
      <Card className="mb-4 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-navy-100">
            <FilterListRoundedIcon fontSize="small" />
          </span>
          <div className="min-w-0 flex-1">
            <Field label="Program filter">
              <div className="relative">
                <SearchRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <select
                  className={`${inputClass} pl-10`}
                  value={programId}
                  onChange={(event) => setProgramId(event.target.value)}
                >
                  <option value="">All programs</option>
                  {(programs.data?.programs ?? []).map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>
        </div>
      </Card>
      {(programs.loading || courses.loading) && (
        <LoadingState label="Loading course catalog" />
      )}
      {(programs.error || courses.error) && (
        <ErrorState message={programs.error || courses.error} />
      )}
      {courses.data?.courses.length === 0 && (
        <EmptyState
          title="No courses found"
          description="Create a course catalog record to get started."
        />
      )}
      <div className="space-y-5">
        {Object.entries(grouped).map(([program, rows]) => (
          <Card key={program} className="overflow-hidden p-0">
            <button
              className="flex w-full items-center justify-between gap-3 bg-navy-50 px-4 py-4 text-left"
              onClick={() =>
                setExpandedPrograms((current) => ({
                  ...current,
                  [program]: !current[program],
                }))
              }
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="text-navy-700">
                  {expandedPrograms[program] ? (
                    <KeyboardArrowDownRoundedIcon fontSize="small" />
                  ) : (
                    <KeyboardArrowRightRoundedIcon fontSize="small" />
                  )}
                </span>
                <span className="inline-flex items-center gap-2 font-serif-display text-[0.95rem] font-semibold text-navy-900">
                  <MenuBookOutlinedIcon fontSize="small" />
                  {program}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 ring-1 ring-ink-200">
                  {rows.length} course{rows.length === 1 ? "" : "s"}
                </span>
              </div>
            </button>
            {expandedPrograms[program] && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="px-4 py-3">Course Code</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {rows.map((course) => (
                      <tr key={course.id}>
                        <td className="px-4 py-3 font-bold text-gold-700">
                          {course.code}
                        </td>
                        <td className="px-4 py-3 font-semibold text-navy-900">
                          {course.title}
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {course.description || "No description"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/courses/${course.id}`}
                            className="font-semibold text-navy-700"
                          >
                            Open course
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </div>
      <CourseModal
        open={courseOpen}
        onClose={() => setCourseOpen(false)}
        onDone={reloadAll}
        programs={programs.data?.programs ?? []}
      />
    </>
  );
}

export function CourseModal({
  open,
  onClose,
  onDone,
  programs,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  programs: Program[];
  initial?: {
    id: string;
    program_id: string;
    code: string;
    title: string;
    description: string;
  };
}) {
  const [localPrograms, setLocalPrograms] = useState(programs);
  const [newProgramOpen, setNewProgramOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [form, setForm] = useState({
    program_id: initial?.program_id ?? "",
    code: initial?.code ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [programLoading, setProgramLoading] = useState(false);

  useEffect(() => {
    setLocalPrograms(programs);
  }, [programs]);

  useEffect(() => {
    if (!open) return;
    setForm({
      program_id: initial?.program_id ?? "",
      code: initial?.code ?? "",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
    });
    setError("");
    setNewProgramOpen(false);
    setNewProgramName("");
  }, [initial, open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (initial) await api.courses.update(initial.id, form);
      else await api.courses.create(form);
      onClose();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save course failed");
    } finally {
      setLoading(false);
    }
  }

  async function createProgram() {
    if (!newProgramName.trim()) return;
    setProgramLoading(true);
    setError("");
    try {
      const program = await api.programs.create(newProgramName.trim());
      setLocalPrograms((current) => [
        ...current.filter((item) => item.id !== program.id),
        program,
      ]);
      setForm((current) => ({ ...current, program_id: program.id }));
      setNewProgramName("");
      setNewProgramOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create program failed");
    } finally {
      setProgramLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit course" : "Create course"}
      eyebrow="Director · Course Catalog"
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Program/Department">
          <select
            className={inputClass}
            value={form.program_id}
            onChange={(e) => {
              if (e.target.value === NEW_PROGRAM_VALUE) {
                setNewProgramOpen(true);
                return;
              }
              setForm({ ...form, program_id: e.target.value });
            }}
            required
          >
            <option value="">Select program</option>
            {localPrograms.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
            <option value={NEW_PROGRAM_VALUE}>+ New program</option>
          </select>
        </Field>
        {newProgramOpen && (
          <div className="rounded-2xl bg-gold-50/70 p-4 ring-1 ring-gold-100">
            <Field label="New program name">
              <input
                className={inputClass}
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                placeholder="Example: Computer Science"
              />
            </Field>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setNewProgramOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="gold"
                type="button"
                loading={programLoading}
                onClick={createProgram}
              >
                Create and select
              </Button>
            </div>
          </div>
        )}
        <Field label="Course code">
          <input
            className={inputClass}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
        </Field>
        <Field label="Title">
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <textarea
            className={textareaClass}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
