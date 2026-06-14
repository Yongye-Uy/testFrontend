"use client";

import { useMemo, useState } from "react";

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"
  );
}

export function UserAvatar({
  name,
  photoUrl,
  className = "",
  fallbackClassName = "",
  textClassName = "",
}: {
  name: string;
  photoUrl?: string;
  className?: string;
  fallbackClassName?: string;
  textClassName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const canShowImage = Boolean(photoUrl && !imageFailed);

  if (canShowImage) {
    return (
      <img
        alt={name}
        className={`object-cover ${className}`}
        onError={() => setImageFailed(true)}
        referrerPolicy="no-referrer"
        src={photoUrl}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center ${fallbackClassName} ${className}`}
    >
      <span className={textClassName}>{initials}</span>
    </span>
  );
}
