"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackLink } from "@/components/shared/back-link";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/app/services/api-client";
import { useAsync } from "@/app/features/shared/use-async";
import { useAuth } from "@/app/hooks/use-auth";
import { isLecturer, isSuperAdmin } from "@/lib/auth";
import { AssessmentModal } from "./assessment-modal";
import { AssessmentSettingsCard } from "./assessment-settings-card";
import { QuestionsPanel } from "./question-list";
import { StudentPreviewModal } from "./student-preview";
import { SubmissionsSection } from "./submissions-section";

type DetailTab = "questions" | "settings" | "submissions";

export function AssessmentDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = isLecturer(user) || isSuperAdmin(user);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("questions");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const assessment = useAsync(() => api.assessments.get(id), [id]);
  const options = useAsync(() => api.assessments.getOptions(id), [id]);
  const submissions = useAsync(() => api.assessments.submissions(id), [id]);

  const status = assessment.data?.status;

  async function publish() {
    setActionLoading(true);
    setActionError("");
    try {
      await api.assessments.publish(id);
      await assessment.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function archive() {
    setActionLoading(true);
    setActionError("");
    try {
      await api.assessments.archive(id);
      await assessment.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this assessment? This cannot be undone."))
      return;
    setActionLoading(true);
    setActionError("");
    try {
      await api.assessments.remove(id);
      router.push("/classes");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
      setActionLoading(false);
    }
  }

  return (
    <>
      <BackLink href="/classes" label="My Classes" />
      <PageHeader
        title={assessment.data?.title ?? "Assessment detail"}
        description="Manage settings, author questions, and review student submissions."
        breadcrumbs={[
          { label: "Home" },
          { label: "Assessments" },
          { label: assessment.data?.title ?? "Assessment detail" },
        ]}
        actions={
          assessment.data &&
          canManage && (
            <>
              <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                Preview as student
              </Button>
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              {status === "draft" && (
                <Button
                  variant="gold"
                  loading={actionLoading}
                  onClick={publish}
                >
                  Publish
                </Button>
              )}
              {status === "published" && (
                <Button
                  variant="gold"
                  loading={actionLoading}
                  onClick={archive}
                >
                  Archive
                </Button>
              )}
              <Button variant="danger" loading={actionLoading} onClick={remove}>
                Delete
              </Button>
            </>
          )
        }
      />

      {assessment.loading && <SkeletonCard />}
      {(assessment.error || actionError) && (
        <ErrorState message={assessment.error || actionError} />
      )}

      {assessment.data && (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-cream-100">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-300">
                Assessment
              </span>
              <StatusBadge value={assessment.data.status} />
            </div>
            <h2 className="mt-1 font-serif-display text-[1.5rem] font-semibold leading-8 text-cream-50">
              {assessment.data.title}
            </h2>
            <p className="mt-1 text-sm text-cream-100/80">
              {assessment.data.description || "No description"}
            </p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-3">
            <InfoMetric label="Status" value={assessment.data.status} />
            <InfoMetric
              label="Questions"
              value={String(assessment.data.question_count)}
            />
            <InfoMetric
              label="Submissions"
              value={String(submissions.data?.submissions.length ?? 0)}
            />
          </div>
        </Card>
      )}

      <DetailTabs
        active={activeTab}
        onChange={setActiveTab}
        questionCount={assessment.data?.question_count ?? 0}
        submissionCount={submissions.data?.submissions.length ?? 0}
      />

      {activeTab === "questions" && <QuestionsPanel assessmentId={id} />}
      {activeTab === "settings" && (
        <AssessmentSettingsCard
          assessmentId={id}
          options={options.data}
          onDone={options.reload}
        />
      )}
      {activeTab === "submissions" && <SubmissionsSection assessmentId={id} />}

      {assessment.data && (
        <AssessmentModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onDone={assessment.reload}
          initial={assessment.data}
        />
      )}
      {assessment.data && (
        <StudentPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          assessmentId={id}
          title={assessment.data.title}
        />
      )}
    </>
  );
}

function DetailTabs({
  active,
  onChange,
  questionCount,
  submissionCount,
}: {
  active: DetailTab;
  onChange: (value: DetailTab) => void;
  questionCount: number;
  submissionCount: number;
}) {
  const tabs: { id: DetailTab; label: string; count?: number }[] = [
    { id: "questions", label: "Questions", count: questionCount },
    { id: "settings", label: "Settings" },
    { id: "submissions", label: "Submissions", count: submissionCount },
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
              {item.count !== undefined && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-navy-100 text-navy-800" : "bg-cream-200 text-ink-600"}`}
                >
                  {item.count}
                </span>
              )}
            </span>
            {selected && (
              <span className="absolute -bottom-px left-2 right-2 h-0.5 rounded-full bg-gold-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-navy-900">
        {value}
      </p>
    </div>
  );
}
