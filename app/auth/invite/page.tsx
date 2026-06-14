import { Suspense } from "react";
import { InviteCompletionForm } from "@/features/auth/invite-completion-form";

export default function InvitationPage() {
  return (
    <Suspense fallback={null}>
      <InviteCompletionForm />
    </Suspense>
  );
}
