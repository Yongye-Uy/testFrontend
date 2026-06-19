"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { LecturerClass } from "./use-lecturer-classes";

export function LecturerClassCard({ item }: { item: LecturerClass }) {
  return (
    <Link href={`/classes/${item.id}`}>
      <Card hover className="h-full p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-navy-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy-700 ring-1 ring-navy-100">
            {item.code}
          </span>
          <StatusBadge value={item.status} />
        </div>
        <h3 className="mt-3 font-serif-display text-[1.05rem] font-semibold leading-7 text-navy-900">
          {item.title}
        </h3>
        <p className="mt-1 text-sm text-ink-500">
          {item.studentCount} student{item.studentCount === 1 ? "" : "s"}
          {item.batchLabel ? ` · ${item.batchLabel}` : ""}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-ink-500">Lessons published</span>
            <span className="text-ink-400">Coming soon</span>
          </div>
          <div
            className="mt-2 h-1.5 w-full rounded-full bg-ink-100"
            aria-hidden
          >
            <div className="h-1.5 w-0 rounded-full bg-gold-400" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
