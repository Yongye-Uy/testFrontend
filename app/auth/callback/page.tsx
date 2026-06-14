import { Suspense } from "react";
import { OauthCallback } from "@/features/auth/oauth-callback";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OauthCallback />
    </Suspense>
  );
}
