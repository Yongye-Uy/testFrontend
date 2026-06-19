import { StudentGradesSemesterPage } from "@/app/features/student/student-grades-semester-page";

export default async function Page({
  params,
}: {
  params: Promise<{ semesterId: string }>;
}) {
  const { semesterId } = await params;
  return <StudentGradesSemesterPage semesterId={semesterId} />;
}
