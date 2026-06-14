"use client";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { clearPendingAuth, getPendingAuth } from "@/lib/auth";

function OauthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeSession } = useAuth();
  const [message, setMessage] = useState("Finishing sign-in...");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const linked = searchParams.get("linked");

  const errorMessage = useMemo(() => {
    const code = searchParams.get("error");
    if (!code) return "";
    switch (code) {
      case "no_account":
        return "This Google email is not linked to an EPPLMS account yet. Please ask the school to invite you first.";
      case "account_inactive":
        return "This EPPLMS account is inactive right now. Please contact your administrator.";
      case "email_mismatch":
        return "The selected Google account does not match the invited email address.";
      case "login_failed":
        return "Google sign-in could not be completed. Please try again.";
      default:
        return code.replaceAll("_", " ");
    }
  }, [searchParams]);

  useEffect(() => {
    async function finish() {
      try {
        if (errorMessage) {
          setError(errorMessage);
          return;
        }

        if (accessToken && refreshToken) {
          await completeSession(accessToken, refreshToken);
          return;
        }

        if (linked === "true") {
          const pending = getPendingAuth();
          if (pending?.accessToken && pending?.refreshToken) {
            setMessage(
              "Google account linked. Finishing your EPPLMS session...",
            );
            clearPendingAuth();
            await completeSession(pending.accessToken, pending.refreshToken);
            return;
          }

          setBusy(false);
          setMessage("Google account linked successfully.");
          return;
        }

        setError(
          "This callback is missing the required authentication details.",
        );
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Authentication failed",
        );
      } finally {
        setBusy(false);
      }
    }

    void finish();
  }, [accessToken, completeSession, errorMessage, linked, refreshToken]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 p-6">
      <div className="w-full max-w-lg rounded-xl2 bg-white p-7 shadow-soft ring-1 ring-ink-100">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
          {error ? (
            <ErrorOutlineRoundedIcon sx={{ fontSize: 26 }} />
          ) : linked === "true" ? (
            <LinkRoundedIcon sx={{ fontSize: 26 }} />
          ) : (
            <CheckCircleOutlineRoundedIcon sx={{ fontSize: 26 }} />
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-700">
          Authentication
        </p>
        <h1 className="mt-2 text-[1.5rem] font-semibold leading-8 text-navy-900">
          {error ? "We could not finish sign-in" : "One more second"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-600">
          {error || message}
        </p>

        {!error && busy && (
          <div className="mt-6 flex items-center gap-3 rounded-lg bg-cream-100 px-4 py-3 text-sm text-ink-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy-300 border-t-transparent" />
            Connecting your session...
          </div>
        )}

        {linked === "true" && !busy && !error && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => router.replace("/profile")}
              variant="primary"
            >
              Go to profile
            </Button>
            <Button
              onClick={() => router.replace("/dashboard")}
              variant="outline"
            >
              Open dashboard
            </Button>
          </div>
        )}

        {error && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/auth/login">
              <Button variant="gold">Back to login</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export function OauthCallback() {
  return (
    <AuthProvider>
      <OauthCallbackInner />
    </AuthProvider>
  );
}
