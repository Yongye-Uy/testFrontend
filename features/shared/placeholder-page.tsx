import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            <ConstructionRoundedIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge value="pending" label="Planned UI" />
            </div>
            <p className="text-sm leading-6 text-ink-600">
              This page is intentionally a placeholder because the backend
              endpoint or workflow is not part of the approved frontend scope
              yet. The route stays in place so navigation, layout, and role
              flows remain consistent with the UXUI structure.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}
