"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  eyebrow?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** If true, clicking outside the modal will NOT close it. */
  disableOutsideClick?: boolean;
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

/**
 * Accessible modal primitive:
 *   - Close on outside click (unless disabled) or ESC
 *   - Focus trap (Tab cycles within modal)
 *   - Scroll-locks the body while open
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  description,
  size = "md",
  children,
  footer,
  disableOutsideClick = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = setTimeout(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>(
        "input, textarea, select, button:not([data-modal-close])",
      );
      first?.focus();
    }, 50);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const onBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (disableOutsideClick) return;
      if (e.target === e.currentTarget) onClose();
    },
    [onClose, disableOutsideClick],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/55 backdrop-blur-sm overflow-y-auto"
          onClick={onBackdrop}
          role="presentation"
        >
          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className={`relative w-full ${sizeMap[size]} bg-white rounded-2xl shadow-pop ring-1 ring-ink-100 overflow-hidden my-8`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {(title || eyebrow) && (
              <div className="px-6 py-4 border-b border-ink-100 bg-cream-100 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {eyebrow && (
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gold-700">
                      {eyebrow}
                    </p>
                  )}
                  {title && (
                    <h3
                      id="modal-title"
                      className="font-serif-display text-xl text-navy-900 font-semibold mt-0.5"
                    >
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-ink-600 mt-1">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  data-modal-close
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-cream-200 transition shrink-0"
                  aria-label="Close dialog"
                >
                  <CloseIcon style={{ fontSize: 20 }} />
                </button>
              </div>
            )}

            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              {children}
            </div>

            {footer && (
              <div className="px-6 py-4 border-t border-ink-100 bg-cream-100 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Consistent label + control row for use inside a Modal. */
export function ModalField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-[11px] text-ink-500 mt-1">{hint}</p>}
    </label>
  );
}
