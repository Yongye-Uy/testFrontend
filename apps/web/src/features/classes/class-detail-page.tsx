"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { backendCapabilities } from "@/lib/backend-capabilities";
import { courseLabel } from "@/features/courses/course-utils";
import { useAsync } from "@/features/shared/use-async";

export function ClassDetailPage({ id }: { id: string }) {
  const classItem = useAsync(() => api.classes.get(id), [id]);
  const courses = useAsync(() => api.courses.list(), []);
  const [lecturerOpen, setLecturerOpen] = useState(false);
  const currentCourse = courses.data?.courses.find((course) => course.id === classItem.data?.course_id);

  return (
    <>
      <BackLink href={classItem.data ? `/semesters/${classItem.data.semester_id}` : "/semesters"} label="Semester detail" />
      <PageHeader
        title={courseLabel(currentCourse)}
        description="Manage a class offering. Lecturer assignment is ready on the backend, but lecturer directory selection depends on the user directory API."
        breadcrumbs={[{ label: "Home" }, { label: "Semesters" }, { label: "Class detail" }]}
        actions={
          <Button onClick={() => setLecturerOpen(true)}>
            Assign lecturer
          </Button>
        }
      />
      {(classItem.loading || courses.loading) && <LoadingState label="Loading class offering" />}
      {(classItem.error || courses.error) && <ErrorState message={classItem.error || courses.error} />}
      {classItem.data && (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-cream-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300">Class offering</span>
              <StatusBadge value={classItem.data.status} />
            </div>
            <h2 className="mt-2 font-serif-display text-2xl font-semibold text-cream-50">{courseLabel(currentCourse)}</h2>
            <p className="mt-1 text-sm text-cream-100/80">Lecturer: {classItem.data.lecturer_id || "Unassigned"}</p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Info label="Class ID" value={classItem.data.id} />
            <Info label="Semester ID" value={classItem.data.semester_id} />
            <Info label="Course ID" value={classItem.data.course_id} />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">Status</p>
              <div className="mt-1">
                <StatusBadge value={classItem.data.status} />
              </div>
            </div>
          </div>
        </Card>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-navy-900">Batches assigned to this class</h2>
          <div className="mt-4">
            {backendCapabilities.classBatchRead ? (
              <EmptyState title="No batches assigned" description="Assign a batch from semester detail to attach it here." />
            ) : (
              <CapabilityNotice
                title="Class batch read is waiting on Backend2.0"
                description="The page keeps the UXUI section in place, but the synced backend does not expose class-batch read endpoints yet."
              />
            )}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-navy-900">Enrollments</h2>
          <div className="mt-4">
            {backendCapabilities.classEnrollmentRead ? (
              <EmptyState title="No enrollments" description="Student enrollment data will appear here." />
            ) : (
              <CapabilityNotice
                title="Enrollment read is waiting on Backend2.0"
                description="Enrollment cards are part of the class detail layout, but the current backend contract does not expose class enrollment queries yet."
              />
            )}
          </div>
        </Card>
      </div>
      <AssignLecturerModal open={lecturerOpen} onClose={() => setLecturerOpen(false)} />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-navy-900">{value}</p>
    </div>
  );
}

function AssignLecturerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign lecturer"
      description="The UX now expects a searchable lecturer list instead of manual ID entry."
      eyebrow="Director · Lecturer Assignment"
    >
      <CapabilityNotice
        title="Lecturer selection is waiting on the Backend2.0 user directory API"
        description="The assign-lecturer action itself exists in Backend2.0, but the synced user-service does not expose a lecturer list endpoint yet. The modal stays in place so the flow matches the UXUI, and we can wire it immediately once that directory endpoint is available."
      />
    </Modal>
  );
}
