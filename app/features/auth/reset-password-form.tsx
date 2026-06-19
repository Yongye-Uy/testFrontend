"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { api } from "@/app/services/api-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("This link is missing its reset token. Request a new one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.auth.completePasswordReset(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-pop ring-1 ring-ink-100">
        <div className="border-b border-ink-100 bg-cream-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
            Account security
          </p>
          <h1 className="mt-1 font-serif-display text-[1.25rem] font-semibold leading-8 text-navy-900">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Choose a new password for your EPPLMS account.
          </p>
        </div>

        <div className="px-6 py-6">
          {done ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
                <CheckCircleOutlineRoundedIcon
                  className="text-emerald-600"
                  style={{ fontSize: 40 }}
                />
                <p className="font-semibold text-emerald-800">
                  Password reset successfully
                </p>
                <p className="text-sm text-emerald-700">
                  You can now sign in with your new password.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition hover:bg-navy-800"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
              {!token && (
                <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                  This link appears to be incomplete. Please use the full link
                  from your email.
                </div>
              )}

              <Field label="New password">
                <div className="relative">
                  <LockOutlinedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    className={`${inputClass} pl-10`}
                    type="password"
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Confirm new password">
                <div className="relative">
                  <LockOutlinedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    className={`${inputClass} pl-10`}
                    type="password"
                    required
                    minLength={8}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </Field>

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                disabled={!token}
                loading={loading}
                type="submit"
                variant="gold"
              >
                Set new password
              </Button>

              <p className="text-center text-sm text-ink-500">
                <Link
                  href="/auth/login"
                  className="font-medium text-navy-700 hover:underline"
                >
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
