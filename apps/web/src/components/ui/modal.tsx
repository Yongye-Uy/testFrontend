"use client";

import { Button } from "./button";

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  eyebrow,
  size = "md",
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  eyebrow?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (!open) return null;
  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-4xl" : "max-w-2xl";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-900/55 p-4 backdrop-blur-sm">
      <div className={`my-8 w-full ${width} overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-ink-100`}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 bg-cream-100 px-6 py-4">
          <div className="min-w-0">
            {eyebrow && <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">{eyebrow}</p>}
            <h2 className="font-serif-display text-xl font-semibold tracking-tight text-navy-900">{title}</h2>
            {description && <p className="mt-1 text-xs text-ink-600">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
            Close
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-100 bg-cream-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
