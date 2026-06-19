import { StudentQuizStartPage } from "@/app/features/student/student-quiz-start-page";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; lessonItemId: string }>;
}) {
  const { classId, lessonItemId } = await params;
  return <StudentQuizStartPage classId={classId} lessonItemId={lessonItemId} />;
}
