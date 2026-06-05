import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

export function Skeleton({
  className = "",
  rounded = "md",
  ...rest
}: SkeletonProps) {
  const r =
    rounded === "full"
      ? "rounded-full"
      : rounded === "lg"
        ? "rounded-xl"
        : rounded === "md"
          ? "rounded-md"
          : rounded === "sm"
            ? "rounded"
            : "";

  return (
    <div
      aria-busy
      aria-live="polite"
      className={`relative overflow-hidden bg-cream-200/70 ${r} ${className}`}
      {...rest}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/55 to-transparent animate-[shimmer_1.6s_infinite]" />
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  className = "",
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div
      className={`bg-white rounded-xl ring-1 ring-ink-100 shadow-soft p-5 ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={rows} />
      <div className="mt-4 pt-4 border-t border-ink-100 flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonList({
  count = 5,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-white ring-1 ring-ink-100"
        >
          <Skeleton className="h-9 w-9" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-2/3" />
          </div>
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}
