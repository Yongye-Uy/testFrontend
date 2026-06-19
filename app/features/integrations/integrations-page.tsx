"use client";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AccessDenied } from "@/components/shared/access-denied";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/app/hooks/use-auth";
import { usePermission } from "@/app/hooks/use-permission";
import {
  api,
  ApiError,
  type GoogleOAuthConfig,
  type IntegrationsConfig,
  type IntegrationService,
  type R2Config,
  type SMTPConfig,
} from "@/app/services/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TestStatus = "idle" | "testing" | "ok" | "error";

type IntegrationStatus = {
  status: TestStatus;
  message: string;
  testedAt: Date | null;
};

type AllStatus = Record<IntegrationService, IntegrationStatus>;

const IDLE: IntegrationStatus = { status: "idle", message: "", testedAt: null };

const DEFAULT_CFG: IntegrationsConfig = {
  google_oauth: { client_id: "", client_secret: "", redirect_uri: "" },
  smtp: { host: "", port: 587, user: "", password: "", from_name: "" },
  r2: { endpoint: "", access_key_id: "", secret_access_key: "", bucket: "" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function maskValue(value: string): string {
  if (!value) return "—";
  if (value.length <= 6) return "•".repeat(value.length);
  return value.slice(0, 4) + "•".repeat(Math.min(value.length - 4, 20));
}

function relativeTime(date: Date): string {
  const diff = Math.round((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function IntegrationsPage() {
  const { user } = useAuth();
  const { hasPermission, isSuperAdmin } = usePermission();
  const canRead   = hasPermission("integration.read")   || isSuperAdmin;
  const canUpdate = hasPermission("integration.update") || isSuperAdmin;

  const [cfg, setCfg] = useState<IntegrationsConfig>(DEFAULT_CFG);
  const [loadError, setLoadError] = useState("");
  const [allStatus, setAllStatus] = useState<AllStatus>({
    google_oauth: { ...IDLE },
    smtp: { ...IDLE },
    r2: { ...IDLE },
  });
  const [configureTarget, setConfigureTarget] =
    useState<IntegrationService | null>(null);

  useEffect(() => {
    if (!canRead) return;
    api.integrations
      .get()
      .then(setCfg)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setLoadError("You don't have permission to view integration credentials.");
        } else {
          setLoadError("Failed to load integration credentials.");
        }
      });
  }, [canRead]); // eslint-disable-line react-hooks/exhaustive-deps

  async function testConnection(service: IntegrationService) {
    setAllStatus((prev) => ({
      ...prev,
      [service]: { status: "testing", message: "", testedAt: null },
    }));
    try {
      const result = await api.integrations.test(service);
      setAllStatus((prev) => ({
        ...prev,
        [service]: {
          status: result.success ? "ok" : "error",
          message: result.message,
          testedAt: new Date(),
        },
      }));
    } catch {
      setAllStatus((prev) => ({
        ...prev,
        [service]: {
          status: "error",
          message: "Request failed",
          testedAt: new Date(),
        },
      }));
    }
  }

  async function handleSave(updated: IntegrationsConfig, service: IntegrationService) {
    await api.integrations.update(updated);
    setCfg(updated);
    setConfigureTarget(null);
    // auto-test after save
    await testConnection(service);
  }

  const credentials = [
    { key: "GOOGLE_OAUTH_CLIENT_ID", value: cfg.google_oauth.client_id },
    { key: "GOOGLE_OAUTH_CLIENT_SECRET", value: cfg.google_oauth.client_secret },
    { key: "SMTP_PASSWORD", value: cfg.smtp.password },
    { key: "R2_ACCESS_KEY_ID", value: cfg.r2.access_key_id },
    { key: "R2_SECRET_ACCESS_KEY", value: cfg.r2.secret_access_key },
  ];

  if (!canRead) {
    return <AccessDenied message="You need the integration.read permission to manage integrations." />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Manage third-party connections used by the platform."
      />

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <IntegrationCard
          title="Google OAuth"
          description={
            cfg.google_oauth.redirect_uri
              ? `Single sign-on via ${cfg.google_oauth.redirect_uri.replace(/\/.*$/, "")}`
              : "Single sign-on via Google Workspace."
          }
          logo={<GoogleLogo />}
          status={allStatus.google_oauth}
          onTest={() => testConnection("google_oauth")}
          onConfigure={canUpdate ? () => setConfigureTarget("google_oauth") : undefined}
          configured={Boolean(cfg.google_oauth.client_id)}
        />
        <IntegrationCard
          title="Gmail SMTP"
          description="Outbound email for invitations, notifications, and digests."
          logo={<GmailLogo />}
          status={allStatus.smtp}
          onTest={() => testConnection("smtp")}
          onConfigure={canUpdate ? () => setConfigureTarget("smtp") : undefined}
          configured={Boolean(cfg.smtp.host)}
        />
        <IntegrationCard
          title="Cloudflare R2"
          description="Course materials, uploads, and content delivery."
          logo={<R2Logo />}
          status={allStatus.r2}
          onTest={() => testConnection("r2")}
          onConfigure={canUpdate ? () => setConfigureTarget("r2") : undefined}
          configured={Boolean(cfg.r2.endpoint)}
        />
      </div>

      {/* Active credentials summary */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-navy-900">Active credentials</h2>
        <p className="mb-4 text-sm text-ink-500">
          Sensitive values are masked. Use Configure on each card to update credentials.
        </p>
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          {credentials.map((cred, i) => (
            <CredentialRow
              key={cred.key}
              label={cred.key}
              value={cred.value}
              last={i === credentials.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Configure modals */}
      {configureTarget === "google_oauth" && (
        <GoogleOAuthModal
          current={cfg.google_oauth}
          onClose={() => setConfigureTarget(null)}
          onSave={(updated) =>
            handleSave({ ...cfg, google_oauth: updated }, "google_oauth")
          }
        />
      )}
      {configureTarget === "smtp" && (
        <SMTPModal
          current={cfg.smtp}
          onClose={() => setConfigureTarget(null)}
          onSave={(updated) => handleSave({ ...cfg, smtp: updated }, "smtp")}
        />
      )}
      {configureTarget === "r2" && (
        <R2Modal
          current={cfg.r2}
          onClose={() => setConfigureTarget(null)}
          onSave={(updated) => handleSave({ ...cfg, r2: updated }, "r2")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Integration card
// ---------------------------------------------------------------------------

function IntegrationCard({
  title,
  description,
  logo,
  status,
  onTest,
  onConfigure,
  configured,
}: {
  title: string;
  description: string;
  logo: React.ReactNode;
  status: IntegrationStatus;
  onTest: () => void;
  onConfigure?: () => void;
  configured: boolean;
}) {
  const isTesting = status.status === "testing";

  return (
    <Card padding="md" className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-white">
          {logo}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-navy-900">{title}</p>
            {configured ? (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  status.status === "error"
                    ? "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status.status === "error" ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
                {status.status === "error" ? "Error" : "Active"}
              </span>
            ) : (
              <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500 ring-1 ring-ink-200">
                Not configured
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="text-xs">
          {isTesting && (
            <span className="flex items-center gap-1 text-ink-500">
              <SyncOutlinedIcon style={{ fontSize: 14 }} className="animate-spin" />
              Testing…
            </span>
          )}
          {status.status === "ok" && status.testedAt && (
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircleOutlineIcon style={{ fontSize: 14 }} />
              Last sync: {relativeTime(status.testedAt)}
            </span>
          )}
          {status.status === "error" && status.testedAt && (
            <span className="flex items-center gap-1 text-rose-600">
              <ErrorOutlinedIcon style={{ fontSize: 14 }} />
              {status.message}
            </span>
          )}
          {status.status === "idle" && (
            <span className="text-ink-400">Not tested yet</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" loading={isTesting} onClick={onTest}>
            Test connection
          </Button>
          {onConfigure && (
            <Button type="button" variant="outline" onClick={onConfigure}>
              Configure
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Credentials row
// ---------------------------------------------------------------------------

function CredentialRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div
      className={`flex items-center justify-between px-5 py-4 ${last ? "" : "border-b border-ink-100"}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-400">
          {label}
        </p>
        <p className="mt-1 font-mono text-sm text-navy-900">
          {revealed ? value || "—" : maskValue(value)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="ml-4 text-ink-400 hover:text-navy-700"
        title={revealed ? "Hide" : "Reveal"}
      >
        {revealed ? (
          <VisibilityOutlinedIcon style={{ fontSize: 18 }} />
        ) : (
          <VisibilityOffOutlinedIcon style={{ fontSize: 18 }} />
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal base
// ---------------------------------------------------------------------------

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-pop ring-1 ring-ink-100">
        <div className="border-b border-ink-100 px-6 py-4">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isSecret = type === "password";
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-ink-500"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type={isSecret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-ink-200 bg-cream-50 px-3 py-2 pr-9 font-mono text-sm text-navy-900 outline-none ring-0 transition focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
        />
        {isSecret && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-navy-700"
          >
            {show ? (
              <VisibilityOutlinedIcon style={{ fontSize: 16 }} />
            ) : (
              <VisibilityOffOutlinedIcon style={{ fontSize: 16 }} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Google OAuth modal
// ---------------------------------------------------------------------------

function GoogleOAuthModal({
  current,
  onClose,
  onSave,
}: {
  current: GoogleOAuthConfig;
  onClose: () => void;
  onSave: (cfg: GoogleOAuthConfig) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...current });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof GoogleOAuthConfig, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Configure Google OAuth" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
          <Field
            label="Client ID"
            name="client_id"
            value={form.client_id}
            onChange={(v) => set("client_id", v)}
            placeholder="903008...apps.googleusercontent.com"
          />
          <Field
            label="Client Secret"
            name="client_secret"
            type="password"
            value={form.client_secret}
            onChange={(v) => set("client_secret", v)}
            placeholder="GOCSPX-..."
          />
          <Field
            label="Redirect URI"
            name="redirect_uri"
            value={form.redirect_uri}
            onChange={(v) => set("redirect_uri", v)}
            placeholder="http://localhost:8000/api/v1/integrations/google/callback"
          />
        </div>
        <ModalFooter onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SMTP modal
// ---------------------------------------------------------------------------

function SMTPModal({
  current,
  onClose,
  onSave,
}: {
  current: SMTPConfig;
  onClose: () => void;
  onSave: (cfg: SMTPConfig) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...current });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof SMTPConfig>(key: K, value: SMTPConfig[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Configure Gmail SMTP" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field
                label="SMTP Host"
                name="smtp_host"
                value={form.host}
                onChange={(v) => set("host", v)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label
                htmlFor="smtp_port"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-ink-500"
              >
                Port
              </label>
              <input
                id="smtp_port"
                type="number"
                value={form.port}
                onChange={(e) => set("port", Number(e.target.value))}
                className="w-full rounded-lg border border-ink-200 bg-cream-50 px-3 py-2 font-mono text-sm text-navy-900 outline-none transition focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
              />
            </div>
          </div>
          <Field
            label="User (email)"
            name="smtp_user"
            value={form.user}
            onChange={(v) => set("user", v)}
            placeholder="you@gmail.com"
          />
          <Field
            label="Password / App password"
            name="smtp_password"
            type="password"
            value={form.password}
            onChange={(v) => set("password", v)}
            placeholder="xxxx xxxx xxxx xxxx"
          />
          <Field
            label="From name"
            name="smtp_from_name"
            value={form.from_name}
            onChange={(v) => set("from_name", v)}
            placeholder="EPPLMS"
          />
        </div>
        <ModalFooter onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// R2 modal
// ---------------------------------------------------------------------------

function R2Modal({
  current,
  onClose,
  onSave,
}: {
  current: R2Config;
  onClose: () => void;
  onSave: (cfg: R2Config) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...current });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof R2Config, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Modal title="Configure Cloudflare R2" onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-4 px-6 py-5">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          )}
          <Field
            label="Endpoint"
            name="r2_endpoint"
            value={form.endpoint}
            onChange={(v) => set("endpoint", v)}
            placeholder="https://<account>.r2.cloudflarestorage.com"
          />
          <Field
            label="Bucket"
            name="r2_bucket"
            value={form.bucket}
            onChange={(v) => set("bucket", v)}
            placeholder="epplms-dev"
          />
          <Field
            label="Access Key ID"
            name="r2_access_key_id"
            value={form.access_key_id}
            onChange={(v) => set("access_key_id", v)}
            placeholder="82fb0c..."
          />
          <Field
            label="Secret Access Key"
            name="r2_secret_access_key"
            type="password"
            value={form.secret_access_key}
            onChange={(v) => set("secret_access_key", v)}
            placeholder="b06502..."
          />
        </div>
        <ModalFooter onClose={onClose} saving={saving} />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared modal footer
// ---------------------------------------------------------------------------

function ModalFooter({
  onClose,
  saving,
}: {
  onClose: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">
      <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
        Cancel
      </Button>
      <Button type="submit" variant="primary" loading={saving}>
        Save &amp; test
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logos
// ---------------------------------------------------------------------------

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
      <path
        d="M21.805 12.23c0-.79-.064-1.366-.202-1.963H12.2v3.576h5.518c-.111.889-.709 2.228-2.036 3.128l3.039 2.309C20.741 17.633 21.805 15.217 21.805 12.23Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.75c2.704 0 4.974-.87 6.631-2.37l-3.159-2.309c-.846.576-1.982.98-3.472.98-2.65 0-4.9-1.708-5.7-4.07l-3.089 2.264C4.956 19.536 8.318 21.75 12.2 21.75Z"
        fill="#34A853"
      />
      <path
        d="M6.5 13.98a5.725 5.725 0 0 1-.335-1.926c0-.67.122-1.32.324-1.925L3.4 7.867A9.54 9.54 0 0 0 2.3 12.054c0 1.435.35 2.792.973 3.999L6.5 13.98Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 6.25c1.524 0 2.883.524 3.956 1.552l2.884-2.884C17.163 3.245 14.893 2.25 12.2 2.25 8.318 2.25 4.956 4.464 3.4 7.867l3.089 2.262C7.3 7.957 9.55 6.25 12.2 6.25Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GmailLogo() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
      <path
        d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5v-11Z"
        fill="#EA4335"
      />
      <path d="M2 6.5 12 14l10-7.5" stroke="#fff" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function R2Logo() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="4" rx="1" fill="#F6821F" />
      <rect x="3" y="11" width="18" height="4" rx="1" fill="#F6821F" opacity=".7" />
      <rect x="3" y="16" width="18" height="4" rx="1" fill="#F6821F" opacity=".4" />
    </svg>
  );
}
