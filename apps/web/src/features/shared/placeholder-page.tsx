import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} eyebrow="TODO" />
      <Card className="p-6">
        <p className="text-sm text-ink-600">
          This page is intentionally a placeholder because the backend endpoint
          or workflow is not part of the approved Frontend Phase 1 scope.
        </p>
      </Card>
    </>
  );
}
