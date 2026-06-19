import { Suspense } from "react";
import { OauthCallback } from "@/app/features/auth/oauth-callback";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OauthCallback />
    </Suspense>
  );
}
