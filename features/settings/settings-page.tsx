"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClass } from "@/components/ui/field";
import { api } from "@/lib/api-client";

export function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your password and platform preferences."
        breadcrumbs={[{ label: "Home" }, { label: "Settings" }]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="!p-3 h-fit lg:sticky lg:top-4">
          <SectionLink
            icon={<LockOutlinedIcon style={{ fontSize: 18 }} />}
            label="Security"
            anchor="#security"
          />
          <SectionLink
            icon={<DarkModeOutlinedIcon style={{ fontSize: 18 }} />}
            label="Appearance"
            anchor="#appearance"
          />
        </Card>

        <div className="space-y-5 lg:col-span-2">
          <SecuritySection />
          <AppearanceSection />
        </div>
      </div>
    </>
  );
}

function SecuritySection() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.next !== form.confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await api.users.changePassword(form.current, form.next, form.confirm);
      setSuccess(true);
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="security">
      <Card className="p-6">
        <h3 className="font-serif-display text-lg font-semibold text-navy-900">
          Security
        </h3>
        <p className="mt-0.5 text-xs text-ink-500">
          Update your password. You will remain signed in after the change.
        </p>

        {success && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
            Password changed successfully.
          </div>
        )}

        <form className="mt-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Current password">
              <input
                className={inputClass}
                type="password"
                required
                placeholder="••••••••"
                value={form.current}
                onChange={(e) => setForm({ ...form, current: e.target.value })}
              />
            </Field>
            <div className="hidden md:block" />
            <Field label="New password">
              <input
                className={inputClass}
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={form.next}
                onChange={(e) => setForm({ ...form, next: e.target.value })}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                className={inputClass}
                type="password"
                required
                minLength={8}
                placeholder="Repeat new password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </Field>
          </div>

          {error && (
            <div className="mt-3">
              <ErrorState message={error} />
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setForm({ current: "", next: "", confirm: "" });
                setError("");
                setSuccess(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <LockOutlinedIcon fontSize="small" />
              Update password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function AppearanceSection() {
  const [theme, setTheme] = useState<"light" | "system">("light");

  return (
    <div id="appearance">
      <Card className="p-6">
        <h3 className="font-serif-display text-lg font-semibold text-navy-900">
          Appearance
        </h3>
        <p className="mb-4 mt-0.5 text-xs text-ink-500">
          Choose how EPPLMS looks on this device.
        </p>
        <div className="grid max-w-sm grid-cols-2 gap-3">
          {(["light", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`rounded-lg p-3 text-left ring-1 transition ${
                theme === t
                  ? "bg-navy-50 ring-navy-700"
                  : "ring-ink-200 hover:ring-navy-300"
              }`}
            >
              <div
                className={`h-16 rounded-md ${
                  t === "light"
                    ? "bg-cream-100"
                    : "bg-gradient-to-br from-cream-100 to-navy-900"
                }`}
              />
              <p className="mt-2 text-sm font-semibold capitalize text-navy-900">
                {t}
              </p>
            </button>
          ))}
        </div>
      </Card>
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
