"use client";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { useAuth, AuthProvider } from "@/app/hooks/use-auth";
import { usePlatformConfig } from "@/app/hooks/use-platform-config";

function GoogleLogo() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.805 12.23c0-.79-.064-1.366-.202-1.963H12.2v3.576h5.518c-.111.889-.709 2.228-2.036 3.128l-.019.12 2.86 2.17.198.019c1.82-1.643 2.884-4.059 2.884-7.05Z"
        fill="#4285F4"
      />
      <path
        d="M12.2 21.75c2.704 0 4.974-.87 6.631-2.37l-3.159-2.309c-.846.576-1.982.98-3.472.98-2.65 0-4.9-1.708-5.7-4.07l-.116.01-2.973 2.254-.04.108c1.645 3.183 5.007 5.397 8.829 5.397Z"
        fill="#34A853"
      />
      <path
        d="M6.5 13.98a5.725 5.725 0 0 1-.335-1.926c0-.67.122-1.32.324-1.925l-.006-.129-3.012-2.29-.099.046A9.54 9.54 0 0 0 2.3 12.054c0 1.435.35 2.792.973 3.999l3.227-2.073Z"
        fill="#FBBC05"
      />
      <path
        d="M12.2 5.95c1.88 0 3.148.8 3.871 1.468l2.826-2.698C17.162 3.145 14.904 2.25 12.2 2.25c-3.822 0-7.184 2.214-8.828 5.397l3.117 2.372c.81-2.362 3.06-4.07 5.711-4.07Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginInner() {
  const { login } = useAuth();
  const platformConfig = usePlatformConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function startGoogleSignIn() {
    window.location.href = "/api/v1/integrations/google";
  }

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
      <section className="hidden w-[46%] flex-col overflow-hidden bg-navy-900 text-cream-50 lg:flex ">
        <div className="relative z-10 flex h-full flex-col p-10">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <SchoolRoundedIcon style={{ fontSize: 24 }} />
            </span>
            <div>
              <p className="text-sm font-bold tracking-[0.22em] text-cream-50">
                {platformConfig.platform_name}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold-400">
                {platformConfig.institution_name || "Learning Platform"}
              </p>
            </div>
          </div>

          <div className="flex max-w-md flex-1 flex-col justify-center">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-gold-500" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-400">
                EPP Learning Platform
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
              Sign in with a local password or continue with Google if your
              account has already been invited and linked in{" "}
              {platformConfig.platform_name}.
            </p>
          </div>

          <div className="text-xs text-cream-300/70">
            {platformConfig.institution_name}
            {platformConfig.institution_location
              ? ` · ${platformConfig.institution_location}`
              : ""}
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 md:p-10">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="inline-flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-900 text-cream-50 shadow-soft">
                <SchoolRoundedIcon style={{ fontSize: 24 }} />
              </span>
              <div>
                <p className="text-sm font-bold tracking-[0.22em] text-navy-900">
                  {platformConfig.platform_name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-gold-700">
                  {platformConfig.institution_name || "Learning Platform"}
                </p>
              </div>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
            Login
          </p>
          <h2 className="font-serif-display text-[2rem] font-semibold text-navy-900">
            Welcome back
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Use your account email and local password, or continue with Google.
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

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-ink-200" />
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
                  Or
                </span>
                <span className="h-px flex-1 bg-ink-200" />
              </div>

              <Button
                className="w-full"
                leftIcon={<GoogleLogo />}
                onClick={startGoogleSignIn}
                type="button"
                variant="outline"
              >
                Continue with Google
              </Button>

              {/* <p className="text-center text-[11px] leading-5 text-ink-500">
                Invited users can finish account setup from their email link,
                then optionally link Google for future sign-in.
              </p>

              <p className="text-center text-[11px] text-ink-500">
                Missing your invite? Contact your{" "}
                {platformConfig.platform_name} administrator or director.
              </p> */}
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
