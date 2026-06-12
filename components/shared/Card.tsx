"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  hover?: boolean;
  as?: "div" | "button" | "a";
  onClick?: () => void;
  id?: string;
}

export function Card({
  children,
  className = "",
  padding = "md",
  hover = false,
  as = "div",
  onClick,
  id,
}: CardProps) {
  const pad =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "p-4"
        : padding === "lg"
          ? "p-8"
          : "p-6";

  const hoverCls = hover
    ? "transition hover:shadow-card hover:-translate-y-0.5 cursor-pointer"
    : "";

  const cls = `bg-white rounded-xl2 shadow-soft ring-1 ring-ink-100 ${pad} ${hoverCls} ${className}`;

  if (as === "button") {
    return (
      <button id={id} onClick={onClick} className={`text-left ${cls}`}>
        {children}
      </button>
    );
  }

  return (
    <div id={id} className={cls} onClick={onClick}>
      {children}
    </div>
  );
}
