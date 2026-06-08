export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl2 border border-dashed border-ink-200 bg-cream-50/80 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{description}</p>
    </div>
  );
}
