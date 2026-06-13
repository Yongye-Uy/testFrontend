"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { useAuth, AuthProvider } from "@/hooks/use-auth";

function LoginInner() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-cream-100">
      <section className="hidden w-[46%] flex-col overflow-hidden bg-navy-900 text-cream-50 lg:flex">
        <div className="relative z-10 flex h-full flex-col p-10">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <SchoolRoundedIcon sx={{ fontSize: 24 }} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-[0.22em] text-cream-50">
                EPPLMS
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold-400">
                EPP Learning Platform
              </p>
            </div>
          </div>

          <div className="flex max-w-md flex-1 flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-gold-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
                Local Login
              </span>
            </div>
            <h1 className="font-serif-display text-4xl font-semibold leading-[1.05] xl:text-[3.6rem]">
              Manage learning
              <br />
              operations with
              <br />
              <span className="text-gold-400">clarity.</span>
            </h1>
            <p className="mt-6 text-[15px] leading-relaxed text-cream-200/85">
              Local login connects the current frontend to the backend
              foundation while invitation and Google flows are still being
              phased in.
            </p>
          </div>

          <div className="text-xs text-cream-300/70">
            Paragon Int&apos;l University · Phnom Penh, Cambodia
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 md:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-900 text-cream-50 shadow-soft">
                <SchoolRoundedIcon sx={{ fontSize: 24 }} />
              </span>
              <div>
                <p className="text-sm font-bold tracking-[0.22em] text-navy-900">
                  EPPLMS
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold-700">
                  Learning Platform
                </p>
              </div>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
            Local Login
          </p>
          <h2 className="font-serif-display text-[2rem] font-semibold text-navy-900">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Use your account email and local password to continue.
          </p>

          <div className="mt-6 rounded-xl2 bg-white p-5 shadow-soft ring-1 ring-ink-100">
            <div className="space-y-4">
              <Field label="Email">
                <div className="relative">
                  <MailOutlineRoundedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    className={`${inputClass} pl-10`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </Field>

              <Field label="Password">
                <div className="relative">
                  <LockOutlinedIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    className={`${inputClass} pl-10`}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                variant="gold"
                loading={loading}
                type="submit"
              >
                Sign in
              </Button>

              <p className="text-center text-[11px] text-ink-500">
                Google OAuth is intentionally not implemented yet.
              </p>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

export function LoginForm() {
  return (
    <AuthProvider>
      <LoginInner />
    </AuthProvider>
  );
}
