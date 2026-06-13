"use client";

import type { ButtonHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "gold"
  | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-navy-800 text-cream-50 shadow-soft hover:bg-navy-700 active:bg-navy-900",
  secondary:
    "bg-cream-200 text-navy-900 hover:bg-cream-300 active:bg-cream-300",
  ghost: "text-navy-800 hover:bg-cream-200",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  gold: "bg-gold-500 text-navy-900 shadow-soft hover:bg-gold-400 active:bg-gold-700 font-semibold",
  outline:
    "bg-white text-navy-800 ring-1 ring-ink-300 hover:bg-cream-100 hover:ring-ink-400",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1 text-[11px]",
  md: "min-h-10 px-4 py-2 text-[13px]",
  lg: "min-h-11 px-5 py-2.5 text-sm",
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  loading,
  leftIcon,
  rightIcon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {!loading && leftIcon}
      {props.children}
      {!loading && rightIcon}
    </button>
  );
}
