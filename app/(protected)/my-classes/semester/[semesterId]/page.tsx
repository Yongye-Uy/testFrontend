import { StudentSemesterPage } from "@/app/features/student/student-semester-page";

export default async function Page({
  params,
}: {
  params: Promise<{ semesterId: string }>;
}) {
  const { semesterId } = await params;
  return <StudentSemesterPage semesterId={semesterId} />;
}
