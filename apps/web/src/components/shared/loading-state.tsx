export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="rounded-xl2 bg-white p-8 text-sm text-ink-600 shadow-soft ring-1 ring-ink-100">
      <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-navy-700 border-t-transparent align-[-2px]" />
      {label}...
    </div>
  );
}
