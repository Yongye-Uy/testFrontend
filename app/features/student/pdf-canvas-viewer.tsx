"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getAccessToken } from "@/lib/auth";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const blockMenu = (e: React.MouseEvent) => e.preventDefault();

async function fetchToken(pdfUrl: string): Promise<string | null> {
  const jwt = getAccessToken();
  if (!jwt) return null;
  try {
    const res = await fetch("/api/pdf-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ url: pdfUrl }),
    });
    if (!res.ok) return null;
    const { token } = await res.json() as { token: string };
    return token;
  } catch {
    return null;
  }
}

export function PdfCanvasViewer({ url }: { url: string }) {
  // Token lives only in JS memory — never in the URL, so it can't be copied from the
  // address bar or network tab and reused in a new tab.
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState<number>(760);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setToken(null);
    setTokenError(false);
    setNumPages(0);
    setLoadError(null);
    fetchToken(url).then((t) => {
      if (t) setToken(t);
      else setTokenError(true);
    });
  }, [url]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setPageWidth(Math.min(w - 48, 960));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadError(null);
  }, []);

  const onLoadError = useCallback((err: Error) => {
    setLoadError(err.message);
  }, []);

  if (tokenError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-500">
        Unable to load document. Please refresh the page.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-500">
        Failed to load document.
      </div>
    );
  }

  // The proxy URL has no token in it — the token is sent as a header so it never
  // appears in the address bar, network tab URL column, or browser history.
  const proxyFile = useMemo(
    () =>
      token
        ? {
            url: `/api/pdf-proxy?url=${encodeURIComponent(url)}`,
            httpHeaders: { "x-pdf-token": token },
          }
        : null,
    [url, token],
  );

  return (
    <div
      ref={containerRef}
      className="select-none overflow-y-auto bg-[#525659]"
      style={{ height: "74vh" }}
      onContextMenu={blockMenu}
    >
      {proxyFile ? (
        <Document
          file={proxyFile}
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
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-white/60">
          Loading…
        </div>
      )}
    </div>
  );
}
