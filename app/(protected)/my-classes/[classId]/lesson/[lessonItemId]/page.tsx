import { StudentLessonViewerPage } from "@/app/features/student/student-lesson-viewer-page";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; lessonItemId: string }>;
}) {
  const { classId, lessonItemId } = await params;
  return <StudentLessonViewerPage classId={classId} lessonItemId={lessonItemId} />;
}
