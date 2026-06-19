"use client";

import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AccessDenied } from "@/components/shared/access-denied";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { api, ApiError, type PlatformConfig } from "@/app/services/api-client";
import { invalidatePlatformConfigCache } from "@/app/hooks/use-platform-config";
import { usePermission } from "@/app/hooks/use-permission";

const DEFAULT_CFG: PlatformConfig = {
  platform_name: "",
  institution_name: "",
  institution_location: "",
  session_timeout_minutes: 60,
  refresh_token_days: 7,
  password_min_length: 8,
  allowed_email_domains: [],
};

export function ConfigurationPage() {
  const { hasPermission, isSuperAdmin } = usePermission();
  const canRead   = hasPermission("config.read")   || isSuperAdmin;
  const canUpdate = hasPermission("config.update")  || isSuperAdmin;

  const [cfg, setCfg] = useState<PlatformConfig>(DEFAULT_CFG);
  const [domainsInput, setDomainsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!canRead) { setLoading(false); return; }
    api.platformConfig
      .get()
      .then((data) => {
        setCfg(data);
        setDomainsInput((data.allowed_email_domains ?? []).join(", "));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setError("You don't have permission to read configuration.");
        } else {
          setError("Failed to load configuration.");
        }
      })
      .finally(() => setLoading(false));
  }, [canRead]); // eslint-disable-line react-hooks/exhaustive-deps

  function update<K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    const domains = domainsInput
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    try {
      const saved = await api.platformConfig.update({ ...cfg, allowed_email_domains: domains });
      invalidatePlatformConfigCache();
      setCfg(saved);
      setDomainsInput((saved.allowed_email_domains ?? []).join(", "));
      setSuccess(true);
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("You don't have permission to update configuration.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save configuration.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    api.platformConfig.get().then((data) => {
      setCfg(data);
      setDomainsInput((data.allowed_email_domains ?? []).join(", "));
      setDirty(false);
      setSuccess(false);
      setError("");
    });
  }

  if (!loading && !canRead) {
    return <AccessDenied message="You need the config.read permission to view system configuration." />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-ink-500">
        Loading configuration…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="System Configuration"
        description="Dynamic platform-wide settings. Changes apply within 60 seconds."
        breadcrumbs={[{ label: "Home" }, { label: "Configuration" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleDiscard} disabled={!dirty || saving || !canUpdate}>
              Discard changes
            </Button>
            <Button onClick={() => void handleSave()} loading={saving} disabled={!dirty || !canUpdate}>
              Save all
            </Button>
          </div>
        }
      />

      {/* status bar */}
      <div className="mb-5 flex items-center gap-2 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Production Environment
        </span>
        <span>· All changes are audit-logged.</span>
      </div>

      {/* platform name hero */}
      <div className="mb-5 rounded-2xl bg-navy-900 p-6 text-cream-50">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">
          Primary Platform Identity
        </p>
        <div className="flex items-center gap-3">
          <input
            className="flex-1 bg-transparent font-serif-display text-3xl font-bold text-cream-50 placeholder-cream-50/30 outline-none border-b border-dashed border-cream-50/30 pb-1 focus:border-gold-400"
            value={cfg.platform_name}
            onChange={(e) => update("platform_name", e.target.value)}
            placeholder="Platform name"
          />
          <span className="text-cream-50/40">
            <SaveOutlinedIcon style={{ fontSize: 18 }} />
          </span>
        </div>
        <p className="mt-3 text-xs text-cream-50/60">
          This name appears in the top navigation, emails, and login screens.
          Changes are reflected immediately across all active sessions.
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span />
        </div>
      </div>

      {success && (
        <div className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Configuration saved successfully.
        </div>
      )}
      {error && (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* sticky section nav */}

        <div className="space-y-5 lg:col-span-3">
          {/* Identity & Branding */}
          <div id="identity">
            <Card className="p-6">
              <SectionHeading
                icon={<BusinessOutlinedIcon style={{ fontSize: 18 }} />}
                title="Identity & Branding"
                description="Platform-wide identity displayed across the LMS."
              />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Platform name" hint="PLATFORM_NAME">
                  <input
                    className={inputClass}
                    value={cfg.platform_name}
                    onChange={(e) => update("platform_name", e.target.value)}
                    placeholder="e.g. PIU·LMS"
                  />
                </Field>
                <Field label="Institution name" hint="INSTITUTION_NAME">
                  <input
                    className={inputClass}
                    value={cfg.institution_name}
                    onChange={(e) => update("institution_name", e.target.value)}
                    placeholder="e.g. Paragon International University"
                  />
                </Field>
                <Field label="Location" hint="INSTITUTION_LOCATION">
                  <input
                    className={inputClass}
                    value={cfg.institution_location}
                    onChange={(e) => update("institution_location", e.target.value)}
                    placeholder="e.g. Phnom Penh, Cambodia"
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* Security & Sessions */}
          <div id="security">
            <Card className="p-6">
              <SectionHeading
                icon={<SecurityOutlinedIcon style={{ fontSize: 18 }} />}
                title="Security & Sessions"
                description="Authentication and session management."
              />
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Session timeout (minutes)" hint="SESSION_TIMEOUT_MIN">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={cfg.session_timeout_minutes}
                    onChange={(e) =>
                      update("session_timeout_minutes", Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Minimum password length" hint="PASSWORD_MIN_LENGTH">
                  <input
                    className={inputClass}
                    type="number"
                    min={6}
                    max={72}
                    value={cfg.password_min_length}
                    onChange={(e) =>
                      update("password_min_length", Number(e.target.value))
                    }
                  />
                </Field>
                <Field label="Refresh token duration (days)" hint="REFRESH_TOKEN_DAYS">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={cfg.refresh_token_days}
                    onChange={(e) =>
                      update("refresh_token_days", Number(e.target.value))
                    }
                  />
                </Field>
                <Field
                  label="Allowed email domains"
                  hint="Comma-separated. Leave empty to allow all domains. (ALLOWED_EMAIL_DOMAINS)"
                >
                  <input
                    className={inputClass}
                    value={domainsInput}
                    onChange={(e) => {
                      setDomainsInput(e.target.value);
                      setDirty(true);
                      setSuccess(false);
                    }}
                    placeholder="@paragoniu.edu.kh, @student.paragoniu.edu.kh"
                  />
                </Field>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-ink-400">{icon}</span>
      <div>
        <h3 className="font-serif-display text-base font-semibold text-navy-900">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-ink-500">{description}</p>
      </div>
    </div>
  );
}

function SectionLink({
  icon,
  label,
  anchor,
}: {
  icon: React.ReactNode;
  label: string;
  anchor: string;
}) {
  return (
    <a
      href={anchor}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-700 transition hover:bg-cream-100 hover:text-navy-900"
    >
      <span className="text-ink-500">{icon}</span>
      {label}
    </a>
  );
}
