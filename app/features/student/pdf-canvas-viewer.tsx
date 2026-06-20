"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

function proxyUrl(url: string) {
  return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
}

const blockMenu = (e: React.MouseEvent) => e.preventDefault();

export function PdfCanvasViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(760);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width so pages fill it without overflowing.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setPageWidth(Math.min(w - 48, 960)); // 24px padding each side
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  }, []);

  const onLoadError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-500">
        Failed to load document.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="select-none overflow-y-auto bg-[#525659]"
      style={{ height: "74vh" }}
      onContextMenu={blockMenu}
    >
      <Document
        file={proxyUrl(url)}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={
          <div className="flex h-40 items-center justify-center text-sm text-white/60">
            Loading…
          </div>
        }
        className="flex flex-col items-center gap-4 py-4"
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={`page_${i + 1}`}
            pageNumber={i + 1}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onContextMenu={blockMenu}
            width={pageWidth}
            className="shadow-md rounded-sm overflow-hidden"
          />
        ))}
      </Document>
    </div>
  );
}
