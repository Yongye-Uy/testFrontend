"use client";

import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { AuthProvider, useAuth } from "@/app/hooks/use-auth";
import { storePendingAuth } from "@/lib/auth";
import { api } from "@/app/services/api-client";

function InviteCompletionInner() {
  const searchParams = useSearchParams();
  const { completeSession } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingTokens, setPendingTokens] = useState<{
    accessToken: string;
    refreshToken: string;
    email: string;
  } | null>(null);

  const token = searchParams.get("token") ?? "";
  const missingToken = !token;
  const helpText = useMemo(
    () =>
      "Set your password to activate this invitation. You can optionally link Google right after this step.",
    [],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (missingToken) {
      setError("This invitation link is missing its token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await api.auth.completeInvitation(
        token,
        password,
        confirmPassword,
      );
      setPendingTokens({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        email: result.user.email,
      });
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not complete invitation",
      );
    } finally {
      setLoading(false);
    }
  }

  async function continueWithoutGoogle() {
    if (!pendingTokens) return;
    setLoading(true);
    setError("");
    try {
      await completeSession(
        pendingTokens.accessToken,
        pendingTokens.refreshToken,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not sign you in",
      );
      setLoading(false);
    }
  }

  function continueWithGoogle() {
    if (!pendingTokens) return;
    storePendingAuth({
      accessToken: pendingTokens.accessToken,
      refreshToken: pendingTokens.refreshToken,
    });
    const params = new URLSearchParams({
      access_token: pendingTokens.accessToken,
      hint_email: pendingTokens.email,
    });
    window.location.href = `/api/v1/integrations/link-google?${params.toString()}`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 p-6">
      <div className="w-full max-w-lg rounded-xl2 bg-white p-7 shadow-soft ring-1 ring-ink-100">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700">
          <MarkEmailReadRoundedIcon style={{ fontSize: 26 }} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
          Invitation setup
        </p>
        <h1 className="mt-2 text-[1.5rem] font-semibold leading-8 text-navy-900">
          Finish your EPPLMS account
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-600">{helpText}</p>

        {!pendingTokens ? (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <Field
              hint={
                missingToken
                  ? "Open this page from the full invite link."
                  : undefined
              }
              label="New password"
            >
              <div className="relative">
                <LockOutlinedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  className={`${inputClass} pl-10`}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  type="password"
                  value={password}
                />
              </div>
            </Field>

            <Field label="Confirm password">
              <div className="relative">
                <LockOutlinedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  className={`${inputClass} pl-10`}
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>
            </Field>

            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              loading={loading}
              type="submit"
              variant="gold"
            >
              Activate account
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">
              Your password is set and the invitation is complete. Choose how
              you want to continue.
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                {error}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                className="w-full"
                leftIcon={<LaunchRoundedIcon style={{ fontSize: 16 }} />}
                onClick={continueWithGoogle}
                type="button"
                variant="outline"
              >
                Link Google
              </Button>
              <Button
                className="w-full"
                loading={loading}
                onClick={() => void continueWithoutGoogle()}
                type="button"
                variant="gold"
              >
                Continue to EPPLMS
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export function InviteCompletionForm() {
  return (
    <AuthProvider>
      <InviteCompletionInner />
    </AuthProvider>
  );
}
