"use client";

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
  const programs = useAsync(() => api.programs.list(), []);
  const courses = useAsync(() => api.courses.list(programId || undefined), [programId]);
  const grouped = useMemo(() => {
    const rows = courses.data?.courses ?? [];
    return rows.reduce<Record<string, typeof rows>>((acc, course) => {
      const key = programName(programs.data?.programs ?? [], course.program_id);
      acc[key] = [...(acc[key] ?? []), course];
      return acc;
    }, {});
  }, [courses.data?.courses, programs.data?.programs]);

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
        actions={<Button onClick={() => setCourseOpen(true)}>Create course</Button>}
      />
      <Card className="mb-4 p-4">
        <Field label="Program filter">
          <select className={inputClass} value={programId} onChange={(event) => setProgramId(event.target.value)}>
            <option value="">All programs</option>
            {(programs.data?.programs ?? []).map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
        </Field>
      </Card>
      {(programs.loading || courses.loading) && <LoadingState label="Loading course catalog" />}
      {(programs.error || courses.error) && <ErrorState message={programs.error || courses.error} />}
      {courses.data?.courses.length === 0 && <EmptyState title="No courses found" description="Create a course catalog record to get started." />}
      <div className="space-y-5">
        {Object.entries(grouped).map(([program, rows]) => (
          <Card key={program} className="overflow-hidden">
            <div className="border-b border-ink-100 bg-navy-50 px-4 py-3 font-serif-display text-lg font-semibold text-navy-900">{program}</div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((course) => (
                <Link href={`/courses/${course.id}`} key={course.id}>
                  <div className="rounded-xl border border-ink-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
                    <p className="text-xs font-bold uppercase tracking-wider text-gold-700">{course.code}</p>
                    <h2 className="mt-1 font-semibold text-navy-900">{course.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-600">{course.description || "No description"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <CourseModal open={courseOpen} onClose={() => setCourseOpen(false)} onDone={reloadAll} programs={programs.data?.programs ?? []} />
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
  initial?: { id: string; program_id: string; code: string; title: string; description: string };
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
      setLocalPrograms((current) => [...current.filter((item) => item.id !== program.id), program]);
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
    <Modal open={open} onClose={onClose} title={initial ? "Edit course" : "Create course"} eyebrow="Director · Course Catalog">
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
            {localPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
            <option value={NEW_PROGRAM_VALUE}>+ New program</option>
          </select>
        </Field>
        {newProgramOpen && (
          <div className="rounded-2xl bg-gold-50/70 p-4 ring-1 ring-gold-100">
            <Field label="New program name">
              <input className={inputClass} value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} placeholder="Example: Computer Science" />
            </Field>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setNewProgramOpen(false)}>Cancel</Button>
              <Button variant="gold" type="button" loading={programLoading} onClick={createProgram}>Create and select</Button>
            </div>
          </div>
        )}
        <Field label="Course code"><input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></Field>
        <Field label="Title"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
        <Field label="Description"><textarea className={textareaClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancel</Button><Button loading={loading}>Save</Button></div>
      </form>
    </Modal>
  );
}
