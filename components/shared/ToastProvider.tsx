"use client";

import { Toaster } from "sonner";

/**
 * Top-level toast provider mounted once from the root layout.
 *
 * Anywhere in the app:
 *   import { toast } from "sonner";
 *   toast.success("Saved!");
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      visibleToasts={5}
      toastOptions={{
        className:
          "rounded-xl ring-1 ring-ink-200 shadow-card font-sans !text-sm",
      }}
    />
  );
}
