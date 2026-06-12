"use client";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api-client";
import { useAsync } from "@/features/shared/use-async";
import { formatDateTime, formatDuration } from "./assessment-utils";

export function SubmissionsSection({ assessmentId }: { assessmentId: string }) {
  const submissions = useAsync(
    () => api.assessments.submissions(assessmentId),
    [assessmentId],
  );

  if (submissions.loading) return <LoadingState label="Loading submissions" />;
  if (submissions.error) return <ErrorState message={submissions.error} />;

  const rows = submissions.data?.submissions ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No submissions yet"
        description="Student attempts for this assessment will appear here once they start."
      />
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cream-100/70 text-left text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Time used</th>
              <th className="px-4 py-3">Auto-submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((submission) => (
              <tr key={submission.id}>
                <td className="px-4 py-3 font-semibold text-navy-900">
                  {submission.student_id}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={submission.status} />
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {formatDateTime(submission.started_at)}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {formatDateTime(submission.submitted_at)}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {formatDuration(submission.time_used_seconds)}
                </td>
                <td className="px-4 py-3 text-ink-600">
                  {submission.auto_submitted ? "Yes" : "No"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
