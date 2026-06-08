"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { CapabilityNotice } from "@/components/shared/capability-notice";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { backendCapabilities } from "@/lib/backend-capabilities";
import { useAsync } from "@/features/shared/use-async";
import type { Batch } from "@/types/course";

export function BatchDetailPage({ id }: { id: string }) {
  const batch = useAsync<Batch | null>(
    () => backendCapabilities.batchDirectory ? api.batches.get(id) : Promise.resolve(null),
    [id],
  );
  const [studentsOpen, setStudentsOpen] = useState(false);

  return (
    <>
      <BackLink href="/batches" label="Batches" />
      <PageHeader
        title={batch.data?.name ?? "Batch detail"}
        description="The detail layout is kept in place for UXUI parity while Backend2.0 catches up with batch read and roster endpoints."
        breadcrumbs={[{ label: "Home" }, { label: "Batches" }, { label: batch.data?.name ?? "Batch detail" }]}
        actions={
          <>
            <Button variant="outline" disabled>Edit</Button>
            <Button onClick={() => setStudentsOpen(true)} disabled={!backendCapabilities.batchStudents}>Add students</Button>
          </>
        }
      />
      {backendCapabilities.batchDirectory && batch.loading && <LoadingState label="Loading batch" />}
      {batch.error && <ErrorState message={batch.error} />}

      <Card className="mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-cream-100">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={batch.data?.type ?? "general"} label={batch.data?.type === "generation" ? "Generation" : "General"} />
            <StatusBadge value={batch.data?.status ?? "pending"} />
          </div>
          <h2 className="mt-2 font-serif-display text-2xl font-semibold text-cream-50">{batch.data?.name ?? `Batch ${id}`}</h2>
          <p className="mt-1 text-sm text-cream-100/80">Batch ID: {id}</p>
        </div>
        <div className="p-5">
          <CapabilityNotice
            title="Batch detail is waiting on Backend2.0 batch read endpoints"
            description="This page now loads safely and matches the UX structure, but the synced backend does not expose batch detail, archive, or student-roster APIs yet. Once those endpoints land, this screen is ready to wire up without another layout rewrite."
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-navy-900">Students</h2>
        <div className="mt-4">
          <CapabilityNotice
            title="Student roster is waiting on Backend2.0"
            description="The Director UI expects a real student list here. The current backend contract does not expose batch student roster or add-student endpoints yet, so the page shows a stable explanatory state instead of crashing."
          />
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <h2 className="font-semibold text-navy-900">Class assignment workflow</h2>
        <p className="mt-2 text-sm text-ink-600">
          Assign this batch to a semester first from Semester Detail, then use Manage classes there to attach it to one or more class offerings. That workflow remains visible in the frontend and will connect when Backend2.0 exposes semester-batch APIs.
        </p>
      </Card>

      <AddStudentsModal open={studentsOpen} onClose={() => setStudentsOpen(false)} />
    </>
  );
}

function AddStudentsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add students to batch"
      description="The UX expects a searchable student directory here."
      eyebrow="Director · Batch Students"
    >
      <CapabilityNotice
        title="Student directory selection is waiting on Backend2.0 user and batch APIs"
        description="The synced backend does not yet expose the combination of user-directory and batch-student endpoints needed to show a real searchable student list here. The modal stays in place so the UX is ready as soon as those APIs arrive."
      />
    </Modal>
  );
}
