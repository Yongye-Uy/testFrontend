import React from "react";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
    >
      <div className="h-14 w-14 rounded-full bg-cream-200 text-navy-700 flex items-center justify-center mb-4">
        {icon ?? <InboxOutlinedIcon style={{ fontSize: 28 }} />}
      </div>
      <h3 className="font-serif-display text-lg text-navy-900 font-semibold">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-ink-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
