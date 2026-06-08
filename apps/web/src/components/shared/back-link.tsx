import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 ring-1 ring-ink-200 hover:bg-cream-100 hover:text-navy-900">
      Back to {label}
    </Link>
  );
}
