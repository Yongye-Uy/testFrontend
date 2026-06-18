import { StudentQuizResultPage } from "@/features/student/student-quiz-result-page";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; submissionId: string }>;
}) {
  const { classId, submissionId } = await params;
  return <StudentQuizResultPage classId={classId} submissionId={submissionId} />;
}
