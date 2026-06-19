import { Suspense } from "react";
import { ResetPasswordForm } from "@/app/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
