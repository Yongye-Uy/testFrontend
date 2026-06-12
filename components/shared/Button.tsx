"use client";

import React from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "gold"
  | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  /** Show an inline spinner and disable interaction while a request is in flight. */
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-navy-800 text-cream-50 hover:bg-navy-700 active:bg-navy-900 shadow-soft",
  gold: "bg-gold-500 text-navy-900 hover:bg-gold-400 active:bg-gold-600 shadow-gold font-semibold",
  secondary:
    "bg-cream-200 text-navy-900 hover:bg-cream-300 active:bg-cream-300",
  outline:
    "bg-white text-navy-800 ring-1 ring-ink-300 hover:bg-cream-100 hover:ring-ink-400",
  ghost: "text-navy-800 hover:bg-cream-200",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  fullWidth,
  loading,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
        />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
