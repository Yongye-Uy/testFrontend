import { StudentClassDetailPage } from "@/app/features/student/student-class-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  return <StudentClassDetailPage classId={classId} />;
}
