export function Card({
  children,
  className = "",
  padding = "none",
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}) {
  const pad =
    padding === "lg"
      ? "p-8"
      : padding === "md"
        ? "p-6"
        : padding === "sm"
          ? "p-4"
          : "";
  const hoverClass = hover
    ? "transition hover:-translate-y-0.5 hover:shadow-pop"
    : "";
  return (
    <section
      className={`rounded-xl2 bg-white shadow-soft ring-1 ring-ink-100 ${pad} ${hoverClass} ${className}`}
    >
      {children}
    </section>
  );
}
