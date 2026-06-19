"use client";

import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AccessDenied } from "@/components/shared/access-denied";
import { Button } from "@/components/ui/button";
import { api, type LokiStream } from "@/app/services/api-client";
import { usePermission } from "@/app/hooks/use-permission";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedLogLine {
  ts: string;          
  tsRaw: string;       //
  service: string;
  level: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  message: string;
  raw: string;
}

interface Stats {
  total: number;
  errors: number;
  warnings: number;
  p95ms: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const LEVEL_COLORS: Record<string, string> = {
  INFO:  "bg-blue-50 text-blue-700 ring-blue-200",
  WARN:  "bg-amber-50 text-amber-700 ring-amber-200",
  ERROR: "bg-rose-50 text-rose-700 ring-rose-200",
  DEBUG: "bg-ink-50 text-ink-500 ring-ink-200",
};

function statusColor(code: number) {
  if (code >= 500) return "text-rose-600 font-bold";
  if (code >= 400) return "text-amber-600 font-bold";
  if (code >= 200 && code < 300) return "text-emerald-600 font-bold";
  if (code >= 300) return "text-sky-600 font-bold";
  return "text-ink-500";
}

function latencyColor(ms: number) {
  if (ms >= 1000) return "text-rose-600 font-bold";
  if (ms >= 300) return "text-amber-600 font-bold";
  return "text-ink-500";
}

const SERVICES = ["All services", "user-svc", "course-svc", "integration-api", "kong-api-gateway", "opa"];
const LEVELS   = ["All levels", "INFO", "WARN", "ERROR", "DEBUG"];
const RANGES   = ["Last 15 min", "Last 1 hour", "Last 6 hours", "Last 24 hours"];

function rangeToNs(label: string): { start: number; end: number } {
  const now = Date.now() * 1_000_000;
  const minutes: Record<string, number> = {
    "Last 15 min": 15,
    "Last 1 hour": 60,
    "Last 6 hours": 360,
    "Last 24 hours": 1440,
  };
  const mins = minutes[label] ?? 60;
  return { start: now - mins * 60 * 1_000_000_000, end: now };
}

function parseLine(stream: LokiStream, value: [string, string]): ParsedLogLine {
  const [tsNs, rawLine] = value;
  const s = stream.stream;
  const service = s["service_name"] ?? s["service"] ?? "unknown";

  let level    = (s["severity_text"] ?? "INFO").toUpperCase();
  let method   = s["method"] ?? "";
  let path     = s["path"] ?? "";
  let status   = s["status"] ? parseInt(s["status"], 10) : 0;
  let durationMs = s["duration_ms"] ? parseInt(s["duration_ms"], 10) : 0;
  let message  = rawLine;  

  if (!method && !path) {
    try {
      const obj = JSON.parse(rawLine);
      if (!level || level === "INFO") level = (obj.level ?? "INFO").toUpperCase();
      method     = obj.method ?? "";
      path       = obj.path ?? obj.url ?? "";
      status     = obj.status ?? status;
      durationMs = obj.duration_ms ?? durationMs;
      message    = obj.msg ?? obj.message ?? rawLine;
    } catch {
      if (/error/i.test(rawLine)) level = "ERROR";
      else if (/warn/i.test(rawLine)) level = "WARN";
    }
  }

  const ts = new Date(Math.round(Number(tsNs) / 1_000_000)).toISOString();
  return { ts, tsRaw: tsNs, service, level, method, path, status, durationMs, message, raw: rawLine };
}

function buildLokiQuery(service: string, level: string, search: string): string {

  const svcSelector = service !== "All services" ? `service_name="${service}"` : `service_name=~".+"`;
  let q = `{${svcSelector}}`;

  if (level !== "All levels") q += ` | severity_text="${level}"`;
  if (search) q += ` |= "${search.replace(/"/g, '\\"')}"`;
  return q;
}

function extractCount(lokiResult: unknown): number {
  try {
    const d = (lokiResult as any).data;

    if (d?.resultType === "vector") {
      return d.result.reduce((sum: number, r: any) => sum + Number(r.value?.[1] ?? 0), 0);
    }

    if (d?.resultType === "streams") {
      return d.result.reduce((sum: number, r: any) => {

        return sum + r.values.reduce((s: number, v: any) => s + Number(v[1] ?? 0), 0);
      }, 0);
    }
  } catch {}
  return 0;
}

function exportCSV(rows: ParsedLogLine[]) {
  const header = "Timestamp,Service,Level,Method,Path,Status,Duration(ms),Message";
  const lines = rows.map((r) =>
    [r.ts, r.service, r.level, r.method, r.path, r.status, r.durationMs,
      `"${r.message.replace(/"/g, '""')}"`].join(","),
  );
  const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `observability-logs-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ObservabilityPage() {
  const { hasPermission, isSuperAdmin } = usePermission();
  const canRead = hasPermission("config.read") || isSuperAdmin;

  const [rows, setRows]       = useState<ParsedLogLine[]>([]);
  const [stats, setStats]     = useState<Stats>({ total: 0, errors: 0, warnings: 0, p95ms: null });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [page, setPage]       = useState(1);

  // Filters
  const [search, setSearch]   = useState("");
  const [service, setService] = useState("All services");
  const [level, setLevel]     = useState("All levels");
  const [range, setRange]     = useState("Last 1 hour");

  const fetchIdRef = useRef(0);

  const fetchLogs = useCallback(async () => {
    if (!canRead) { setLoading(false); return; }
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError("");

    const { start, end } = rangeToNs(range);
    const query = buildLokiQuery(service, level, search);

    try {
      const resp = await api.observability.logs({ query, limit: 500, start, end });
      if (id !== fetchIdRef.current) return;

      const parsed: ParsedLogLine[] = [];
      for (const stream of resp?.data?.result ?? []) {
        for (const val of stream.values ?? []) {
          parsed.push(parseLine(stream, val));
        }
      }
      parsed.sort((a, b) => (b.tsRaw > a.tsRaw ? 1 : -1));
      setRows(parsed);
      setPage(1);
    } catch (err: unknown) {
      if (id !== fetchIdRef.current) return;
      const status = (err as { status?: number })?.status;
      setError(
        status === 403
          ? "You don't have permission to view observability logs."
          : "Failed to load logs. Check that Loki is running.",
      );
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [range, service, level, search]);

  const fetchStats = useCallback(async () => {
    const { start, end } = rangeToNs(range);
    try {
      const [errRes, warnRes, totalRes, p95Res] = await api.observability.stats({ start, end });
      setStats({
        errors:   extractCount(errRes),
        warnings: extractCount(warnRes),
        total:    extractCount(totalRes),
        p95ms:    extractP95(p95Res),
      });
    } catch {}
  }, [range]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!canRead) {
    return <AccessDenied message="You need the config.read permission to view observability logs." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <PageHeader
          title="Observability & Logs"
          description="Live tail of platform activity across all services."
        />
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => { fetchLogs(); fetchStats(); }}
            loading={loading}
          >
            <RefreshOutlinedIcon style={{ fontSize: 16 }} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => exportCSV(rows)}
            disabled={rows.length === 0}
          >
            <DownloadOutlinedIcon style={{ fontSize: 16 }} />
            Export logs
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total events (range)" value={stats.total.toLocaleString()} />
        <StatCard label="Errors" value={stats.errors.toLocaleString()} accent="rose" />
        <StatCard label="Warnings" value={stats.warnings.toLocaleString()} accent="amber" />
        <StatCard
          label="Avg P95"
          value={stats.p95ms !== null ? `${Math.round(stats.p95ms)} ms` : "—"}
          accent="sky"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <SearchOutlinedIcon
            style={{ fontSize: 16 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            placeholder="Search by message, path, user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="w-full rounded-xl border border-ink-200 bg-white py-2 pl-9 pr-4 text-sm text-navy-900 outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
          />
        </div>

        <FilterSelect value={service} onChange={setService} options={SERVICES} />
        <FilterSelect value={level} onChange={setLevel} options={LEVELS} />
        <FilterSelect value={range} onChange={setRange} options={RANGES} />

        <button
          type="button"
          onClick={() => { setSearch(""); setService("All services"); setLevel("All levels"); setRange("Last 1 hour"); }}
          className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs text-ink-500 transition hover:bg-cream-50"
        >
          <FilterListOutlinedIcon style={{ fontSize: 14 }} />
          Reset
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Live tailing badge + count */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live tailing
        </span>
        {rows.length > 0 && (
          <span className="text-xs text-ink-400">
            {rows.length.toLocaleString()} of {stats.total.toLocaleString()} events
          </span>
        )}
      </div>

      {/* Log table */}
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-cream-50">
              <th className="w-36 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Timestamp</th>
              <th className="w-24 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Service</th>
              <th className="w-16 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Level</th>
              <th className="w-14 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Method</th>
              <th className="w-16 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Status</th>
              <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Path / Message</th>
              <th className="w-20 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">Latency</th>
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-ink-100">
                <td colSpan={7} className="px-4 py-3">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-ink-100" />
                </td>
              </tr>
            ))}
            {!loading && visibleRows.map((row, i) => (
              <LogRow key={`${row.tsRaw}-${i}`} row={row} />
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-400">
                  No log entries found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
            <span className="text-xs text-ink-400">Page {page} of {totalPages}</span>
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
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "rose" | "amber" | "sky";
}) {
  const valueColor =
    accent === "rose" ? "text-rose-600" :
    accent === "amber" ? "text-amber-600" :
    accent === "sky" ? "text-sky-600" :
    "text-navy-900";

  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-sky-50 text-sky-700",
  POST:   "bg-emerald-50 text-emerald-700",
  PUT:    "bg-amber-50 text-amber-700",
  PATCH:  "bg-amber-50 text-amber-700",
  DELETE: "bg-rose-50 text-rose-700",
};

function LogRow({ row }: { row: ParsedLogLine }) {
  const [expanded, setExpanded] = useState(false);
  const levelClass = LEVEL_COLORS[row.level] ?? LEVEL_COLORS.DEBUG;
  const time = row.ts.replace("T", " ").slice(0, 22);
  const methodClass = METHOD_COLORS[row.method] ?? "bg-ink-50 text-ink-600";

  // Expanded detail: show all stream-label attributes from raw if not JSON,
  // or pretty-print JSON body.
  const expandedContent = (() => {
    try { return JSON.stringify(JSON.parse(row.raw), null, 2); }
    catch { return row.raw; }
  })();

  return (
    <>
      <tr
        className="cursor-pointer border-b border-ink-100 transition hover:bg-cream-50 last:border-0"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-4 py-2.5 font-mono text-[11px] text-ink-400 whitespace-nowrap">{time}</td>
        <td className="px-3 py-2.5">
          <span className="rounded-md bg-navy-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-navy-700 whitespace-nowrap">
            {row.service}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${levelClass}`}>
            {row.level}
          </span>
        </td>
        <td className="px-3 py-2.5">
          {row.method ? (
            <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${methodClass}`}>
              {row.method}
            </span>
          ) : (
            <span className="text-ink-300 text-xs">—</span>
          )}
        </td>
        <td className={`px-3 py-2.5 font-mono text-xs ${statusColor(row.status)}`}>
          {row.status > 0 ? row.status : <span className="text-ink-300">—</span>}
        </td>
        <td className="max-w-xs truncate px-3 py-2.5 text-xs">
          {row.path ? (
            <span className="font-mono text-navy-900">{row.path}</span>
          ) : (
            <span className="text-ink-600">{row.message}</span>
          )}
        </td>
        <td className={`px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap ${row.durationMs ? latencyColor(row.durationMs) : "text-ink-300"}`}>
          {row.durationMs ? `${row.durationMs}ms` : "—"}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-cream-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-400">
              {row.message}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-ink-600">
              {expandedContent}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// P95 extraction from Prometheus instant query
// ---------------------------------------------------------------------------

function extractP95(promResult: unknown): number | null {
  try {
    const result = (promResult as any)?.data?.result;
    if (!Array.isArray(result) || result.length === 0) return null;
    const val = result[0]?.value?.[1];
    const ms = parseFloat(val) * 1000;
    return isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}
