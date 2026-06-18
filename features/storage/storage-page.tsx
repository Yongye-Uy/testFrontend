"use client";

import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AccessDenied } from "@/components/shared/access-denied";
import { Card } from "@/components/ui/card";
import {
  api,
  ApiError,
  type StorageFileItem,
  type StorageStatsResponse,
  type StorageFilesResponse,
} from "@/lib/api-client";
import { usePermission } from "@/hooks/use-permission";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDFs",
  document: "Documents",
  image: "Images",
  file: "Files",
  text: "Text",
  link: "Links",
};

const TYPE_COLORS: Record<string, string> = {
  pdf: "bg-rose-50 text-rose-700 ring-rose-200",
  document: "bg-amber-50 text-amber-700 ring-amber-200",
  image: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  file: "bg-blue-50 text-blue-700 ring-blue-200",
  text: "bg-ink-50 text-ink-700 ring-ink-200",
  link: "bg-purple-50 text-purple-700 ring-purple-200",
};

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function linkedTo(file: StorageFileItem) {
  if (file.course_code && file.lesson_title) {
    return `${file.course_code} · ${file.lesson_title}`;
  }
  if (file.course_code && file.course_title) {
    return `${file.course_code} · ${file.course_title}`;
  }
  if (file.course_code) return file.course_code;
  return "—";
}

export function StoragePage() {
  const { hasPermission, isSuperAdmin } = usePermission();
  const canRead = hasPermission("config.read") || isSuperAdmin;

  const [stats, setStats] = useState<StorageStatsResponse | null>(null);
  const [files, setFiles] = useState<StorageFilesResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canRead) return;
    api.storage
      .stats()
      .then(setStats)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setError("You don't have permission to view storage stats.");
        } else {
          setError("Failed to load storage stats.");
        }
      });
  }, [canRead]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canRead) { setLoading(false); return; }
    setLoading(true);
    api.storage
      .files(page, PAGE_SIZE)
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load files.");
        setLoading(false);
      });
  }, [page]);

  if (!canRead) {
    return <AccessDenied message="You need the config.read permission to view storage management." />;
  }

  const totalFiles = Number(stats?.total_files ?? 0);
  const totalPages = files ? Math.ceil(Number(files.total) / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage Management"
        description="All uploaded course materials, attachments, and system files."
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <Card padding="md">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-navy-900">Storage usage</p>
            <p className="text-xs text-ink-400">
              Cloudflare R2 · Derived from course materials database
            </p>
          </div>
          <p className="text-right">
            <span className="text-3xl font-bold tabular-nums text-navy-900">
              {totalFiles.toLocaleString()}
            </span>
            <span className="ml-1 text-sm text-ink-500">files total</span>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(stats?.type_stats ?? []).map((stat) => (
            <div
              key={stat.material_type}
              className="rounded-xl border border-ink-100 bg-cream-50 px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                {TYPE_LABELS[stat.material_type] ?? stat.material_type}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-navy-900">
                {Number(stat.file_count).toLocaleString()}
              </p>
              <p className="text-xs text-ink-400">files</p>
            </div>
          ))}
          {!stats && (
            <div className="col-span-4 h-20 animate-pulse rounded-xl bg-ink-100" />
          )}
        </div>
      </Card>

      {/* Files table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-navy-900">Recent files</h2>
          {files && (
            <p className="text-xs text-ink-400">
              {Number(files.total).toLocaleString()} total
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-cream-50">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  File
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Linked to
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
                  Uploaded
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-ink-100 last:border-0">
                    <td colSpan={4} className="px-5 py-4">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-ink-100" />
                    </td>
                  </tr>
                ))}
              {!loading &&
                (files?.files ?? []).map((file) => (
                  <FileRow key={file.material_id} file={file} />
                ))}
              {!loading && (!(files?.files ?? []).length) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-sm text-ink-400"
                  >
                    No files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeftOutlinedIcon style={{ fontSize: 16 }} />
                Previous
              </button>
              <span className="text-xs text-ink-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 transition hover:bg-cream-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRightOutlinedIcon style={{ fontSize: 16 }} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ file }: { file: StorageFileItem }) {
  const colorClass =
    TYPE_COLORS[file.material_type] ?? "bg-ink-50 text-ink-600 ring-ink-200";

  return (
    <tr className="border-b border-ink-100 transition hover:bg-cream-50 last:border-0">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <InsertDriveFileOutlinedIcon
            style={{ fontSize: 18 }}
            className="shrink-0 text-ink-400"
          />
          <span className="truncate font-medium text-navy-900 max-w-xs">
            {file.file_name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${colorClass}`}
        >
          {TYPE_LABELS[file.material_type] ?? file.material_type}
        </span>
      </td>
      <td className="px-4 py-3 text-ink-600">{linkedTo(file)}</td>
      <td className="px-4 py-3 text-ink-500">{formatDate(file.created_at)}</td>
    </tr>
  );
}
