"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";
import { CourseModal } from "./courses-page";
import { programName } from "./course-utils";

export function CourseDetailPage({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const course = useAsync(() => api.courses.get(id), [id]);
  const programs = useAsync(() => api.programs.list(), []);

  async function reloadDetail() {
    await programs.reload();
    await course.reload();
  }

  return (
    <>
      <BackLink href="/courses" label="Courses" />
      <PageHeader
        title={course.data?.title ?? "Course detail"}
        description="Catalog details only. Class offerings are created from semester detail."
        breadcrumbs={[{ label: "Home" }, { label: "Course Catalog" }, { label: course.data?.title ?? "Course detail" }]}
        actions={<Button onClick={() => setOpen(true)} disabled={!course.data}>Edit</Button>}
      />
      {(course.loading || programs.loading) && <LoadingState label="Loading course" />}
      {(course.error || programs.error) && <ErrorState message={course.error || programs.error} />}
      {course.data && (
        <Card className="p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-gold-700">{course.data.code}</p>
          <h2 className="mt-1 font-serif-display text-2xl font-semibold text-navy-900">{course.data.title}</h2>
          <p className="mt-2 text-sm text-ink-600">{course.data.description || "No description"}</p>
          <p className="mt-4 text-sm text-ink-600">Program: <span className="font-semibold text-navy-900">{programName(programs.data?.programs ?? [], course.data.program_id)}</span></p>
        </Card>
      )}
      {course.data && <CourseModal open={open} onClose={() => setOpen(false)} onDone={reloadDetail} programs={programs.data?.programs ?? []} initial={course.data} />}
    </>
  );
}
