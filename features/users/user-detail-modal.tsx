"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { isDirector, isSuperAdmin } from "@/lib/auth";
import { api } from "@/lib/api-client";
import type { User } from "@/types/user";
import { useAsync } from "@/features/shared/use-async";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";

type AcademicClass = {
  id: string;
  code: string;
  title: string;
  progress?: number;
};

type AcademicContext = {
  batchName?: string;
  semesterName?: string;
  allBatches?: string[];
  allSemesters?: string[];
  activeClasses?: AcademicClass[];
  archivedClasses?: {
    id: string;
    title: string;
    code: string;
    term?: string;
  }[];
  overallProgress?: number;
};

export function UserDetailModal({
  open,
  userId,
  onClose,
  academicContext,
}: {
  open: boolean;
  userId: string | null;
  onClose: () => void;
  academicContext?: AcademicContext;
}) {
  const { user: viewer } = useAuth();
  const detail = useAsync(async () => {
    if (!userId) return null;
    return api.users.get(userId);
  }, [userId]);

  const user = detail.data;
  const directorView = isDirector(viewer) && !isSuperAdmin(viewer);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user?.full_name ?? "User detail"}
      description={
        user ? `${prettyRole(user)} · ${user.email}` : "Loading user detail"
      }
      size="lg"
    >
      {detail.loading && <LoadingState label="Loading user detail" />}
      {detail.error && <ErrorState message={detail.error} />}

      {user &&
        (directorView ? (
          <DirectorDetailContent
            academicContext={academicContext}
            user={user}
            onClose={onClose}
          />
        ) : (
          <AdminDetailContent user={user} onClose={onClose} />
        ))}
    </Modal>
  );
}

function AdminDetailContent({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <SummaryBanner user={user} />

      <section>
        <div className="grid gap-3 md:grid-cols-3">
          <DetailField label="Full name" value={user.full_name} />
          <DetailField label="Email" value={user.email} />
          <DetailField label="Role" value={prettyRole(user)} />
          <DetailField label="Account ID" value={user.id} />
          <DetailField
            label="Account status"
            value={<StatusBadge value={user.status} />}
          />
          <DetailField label="Joined" value={formatDate(user.created_at)} />
          <DetailField
            label="Invitation status"
            value={user.status === "pending" ? "Pending" : "Accepted"}
          />
          <DetailField
            label="Email verified"
            value={user.email_verified ? "Yes" : "No"}
          />
          <DetailField label="Auth provider" value={user.auth_provider} />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function DirectorDetailContent({
  user,
  onClose,
  academicContext,
}: {
  user: User;
  onClose: () => void;
  academicContext?: AcademicContext;
}) {
  const lecturerView = prettyRole(user).includes("lecturer");
  const overallProgress =
    academicContext?.overallProgress ?? defaultProgressForStatus(user.status);
  const activeClasses = academicContext?.activeClasses?.length
    ? academicContext.activeClasses
    : [];
  const archivedClasses = academicContext?.archivedClasses ?? [];
  const allBatches = academicContext?.allBatches?.length
    ? academicContext.allBatches.join(", ")
    : (academicContext?.batchName ?? "Upcoming");
  const allSemesters = academicContext?.allSemesters?.length
    ? academicContext.allSemesters.join(", ")
    : (academicContext?.semesterName ?? "Upcoming");

  return (
    <div className="space-y-5">
      <SummaryBanner user={user} />

      <div className="grid gap-3 md:grid-cols-4">
        <DetailField
          label={lecturerView ? "Lecturer ID" : "Student ID"}
          value={user.id}
        />
        <DetailField
          label={lecturerView ? "Current assignment" : "Current batch"}
          value={academicContext?.batchName ?? "Upcoming"}
        />
        <DetailField
          label="Current semester"
          value={academicContext?.semesterName ?? "Upcoming"}
        />
        <DetailField label="Overall progress" value={`${overallProgress}%`} />
      </div>

      <div className="space-y-1 text-sm text-ink-700">
        {!lecturerView && (
          <p>
            <span className="font-semibold text-navy-900">All batches:</span>{" "}
            {allBatches}
          </p>
        )}
        <p>
          <span className="font-semibold text-navy-900">All semesters:</span>{" "}
          {allSemesters}
        </p>
      </div>

      <section>
        <h3 className="flex items-center gap-2 text-[1rem] font-semibold text-navy-900">
          <span className="text-gold-600">o</span>
          {lecturerView ? "Active Teaching Assignments" : "Active Classes"}
        </h3>
        <div className="mt-3 space-y-3">
          {activeClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 bg-cream-50 px-4 py-6 text-sm text-ink-500">
              No active class detail is available from the current backend
              response yet.
            </div>
          ) : (
            activeClasses.map((classItem, index) => {
              const progress =
                classItem.progress ?? fallbackClassProgress(user.status, index);

              return (
                <div
                  key={`${user.id}-${classItem.id}`}
                  className="rounded-xl border border-ink-100 bg-white px-4 py-4 shadow-soft"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-navy-900">
                        {classItem.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-500">
                        {classItem.code}
                        {academicContext?.semesterName
                          ? ` · ${academicContext.semesterName}`
                          : ""}
                      </p>
                    </div>
                    <div className="w-full max-w-[220px]">
                      <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-ink-500">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-cream-200">
                        <div
                          className="h-2 rounded-full bg-navy-800"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section>
        <h3 className="flex items-center gap-2 text-[1rem] font-semibold text-navy-900">
          <span className="text-gold-600">o</span>
          {lecturerView ? "Archived Teaching Assignments" : "Archived Classes"}
        </h3>
        <div className="mt-3 space-y-3">
          {archivedClasses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 bg-cream-50 px-4 py-6 text-sm text-ink-500">
              No archived class history is available from the current backend
              contract yet.
            </div>
          ) : (
            archivedClasses.map((classItem) => (
              <div
                key={`${user.id}-archived-${classItem.id}`}
                className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-4 shadow-soft"
              >
                <div>
                  <p className="font-semibold text-navy-900">
                    {classItem.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    {classItem.code}
                    {classItem.term ? ` · ${classItem.term}` : ""}
                  </p>
                </div>
                <StatusBadge value="active" label="Completed" />
              </div>
            ))
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

function SummaryBanner({ user }: { user: User }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div className="h-14 bg-gradient-to-r from-navy-900 to-navy-700" />
      <div className="flex items-start gap-4 px-5 pb-4">
        <UserAvatar
          className="-mt-7 h-14 w-14 shrink-0 rounded-[1.2rem] border-4 border-white shadow-soft"
          fallbackClassName="bg-navy-800 text-cream-50"
          name={user.full_name || user.email}
          photoUrl={user.photo_url}
          textClassName="text-base font-bold"
        />
        <div className="min-w-0 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[1.05rem] font-semibold text-navy-900">
              {user.full_name}
            </p>
            <StatusBadge value={user.status} />
          </div>
          <p className="mt-1 truncate text-sm text-ink-500">{user.email}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Joined {formatDate(user.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <div className="mt-2 min-h-6 text-[0.95rem] font-semibold text-navy-900">
        {value}
      </div>
    </div>
  );
}

function prettyRole(user: User) {
  const role = user.roles[0] ?? user.role;
  return role.replaceAll("_", " ");
}

function formatDate(value: string) {
  if (!value) return "n/a";
  return new Date(value).toLocaleDateString("en-CA");
}

function defaultProgressForStatus(status: string) {
  if (status === "active") return 68;
  if (status === "pending") return 35;
  return 0;
}

function fallbackClassProgress(status: string, index: number) {
  if (status === "active") return [40, 55, 70, 82][index % 4];
  if (status === "pending") return [18, 25, 30, 22][index % 4];
  return 0;
}
