"use client";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageSkeleton } from "@/components/ui/skeleton";
import { LecturerClassCard } from "./lecturer-class-card";
import { useLecturerClasses } from "./use-lecturer-classes";

export function LecturerClassesPage() {
  const overview = useLecturerClasses();
  const classes = overview.data?.classes ?? [];
  const semesterTitle = overview.data?.activeSemester?.title;

  return (
    <>
      <PageHeader
        title="My Classes"
        description={
          semesterTitle
            ? `Classes you teach in ${semesterTitle}.`
            : "Classes you teach this semester."
        }
        breadcrumbs={[{ label: "Home" }, { label: "My Classes" }]}
      />

      {overview.loading && <PageSkeleton rows={3} />}
      {overview.error && <ErrorState message={overview.error} />}

      {!overview.loading && !overview.error && classes.length === 0 ? (
        <EmptyState
          title="No classes assigned"
          description="You have no classes assigned for the current semester yet. They'll appear here once a director assigns you to a class."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            <LecturerClassCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
