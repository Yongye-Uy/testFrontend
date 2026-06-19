"use client";

import { useSearchParams } from "next/navigation";
import { StudentQuizTakePage } from "@/app/features/student/student-quiz-take-page";

export function TakePageInner({
  classId,
  lessonItemId,
}: {
  classId: string;
  lessonItemId: string;
}) {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("sid") ?? "";

  return (
    <StudentQuizTakePage
      classId={classId}
      lessonItemId={lessonItemId}
      submissionId={submissionId}
    />
  );
}
