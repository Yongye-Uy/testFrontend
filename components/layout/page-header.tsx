import Link from "next/link";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-ink-500">
          {breadcrumbs.map((item, index) => (
            <span
              className="inline-flex items-center gap-1.5"
              key={`${item.label}-${index}`}
            >
              {index > 0 && <span className="text-ink-300">/</span>}
              {item.href || item.label === "Home" ? (
                <Link
                  href={item.href ?? "/dashboard"}
                  className={
                    index === breadcrumbs.length - 1
                      ? "font-semibold text-navy-700"
                      : "transition hover:text-navy-700"
                  }
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? "font-semibold text-navy-700"
                      : ""
                  }
                >
                  {item.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-700">
              {eyebrow}
            </p>
          )}
          <h1 className="font-serif-display text-[1.5rem] font-semibold leading-8 tracking-tight text-navy-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-3xl text-[0.9rem] leading-6 text-ink-600">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-gold-500/50 via-ink-200 to-transparent" />
    </div>
  );
}
