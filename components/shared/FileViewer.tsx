"use client";

import React from "react";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import FullscreenOutlinedIcon from "@mui/icons-material/FullscreenOutlined";
import { AngkorMotif } from "@/components/branding/AngkorMotif";

interface FileViewerProps {
  title: string;
  meta?: string;
  /** Document content to render inside the canvas. */
  children?: React.ReactNode;
}

/**
 * No-download file viewer.
 *
 * Renders a faux PDF-style canvas with the PIU watermark, disables the context
 * menu and text selection, and shows a visible "downloads disabled" banner.
 */
export function FileViewer({ title, meta, children }: FileViewerProps) {
  const blockMenu = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="rounded-xl2 bg-white shadow-soft ring-1 ring-ink-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-navy-900 text-cream-100">
        <div className="h-7 w-7 rounded-md bg-gold-500/20 text-gold-400 flex items-center justify-center">
          <PictureAsPdfOutlinedIcon style={{ fontSize: 16 }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{title}</div>
          {meta && <div className="text-[11px] text-cream-300/70">{meta}</div>}
        </div>
        <button
          className="text-cream-200/80 hover:text-cream-50 p-1"
          aria-label="Fullscreen"
        >
          <FullscreenOutlinedIcon style={{ fontSize: 18 }} />
        </button>
      </div>

      {/* Disabled-download notice */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gold-50 border-b border-gold-200 text-xs text-gold-900">
        <LockOutlinedIcon style={{ fontSize: 16 }} className="text-gold-700" />
        <span>
          <strong>Downloads disabled</strong> · This material is for in-platform
          viewing only. Right-click and printing are restricted.
        </span>
      </div>

      {/* Document canvas with watermark */}
      <div
        className="relative piu-watermark no-select bg-cream-50 px-10 py-12 min-h-[520px]"
        onContextMenu={blockMenu}
      >
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="rotate-[-25deg] flex flex-col items-center gap-2 opacity-[0.06]">
            <AngkorMotif size={120} className="text-navy-900" />
            <span className="font-serif-display text-5xl text-navy-900 font-bold tracking-widest">
              PIU · LMS
            </span>
            <span className="text-navy-900 text-sm tracking-[0.4em] uppercase">
              Paragon International University
            </span>
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto">{children}</div>
      </div>

      <div className="px-4 py-2 bg-cream-100 border-t border-ink-200 text-[11px] text-ink-500 flex justify-between">
        <span>Page 1</span>
        <span>
          Viewing only · © Paragon International University, Phnom Penh
        </span>
      </div>
    </div>
  );
}
