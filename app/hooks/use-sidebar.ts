"use client";

import { useEffect, useRef, useState } from "react";

const XL = 1280;

function shouldCollapse() {
  return typeof window !== "undefined" && window.innerWidth < XL;
}

export function useSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(shouldCollapse);
  // Track whether the user has manually toggled so resize doesn't override it.
  const userOverrode = useRef(false);

  useEffect(() => {
    function handleResize() {
      if (userOverrode.current) return;
      setCollapsed(shouldCollapse());
    }
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function setCollapsedWithOverride(value: boolean) {
    userOverrode.current = true;
    setCollapsed(value);
  }

  return {
    mobileOpen,
    setMobileOpen,
    collapsed,
    setCollapsed: setCollapsedWithOverride,
  };
}
