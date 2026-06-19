import { AssessmentBuilderPage } from "@/features/assessments/assessment-builder-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; lessonId?: string }>;
}) {
  const { classId, lessonId } = await searchParams;
  return (
    <AssessmentBuilderPage
      classId={classId ?? null}
      lessonId={lessonId ?? null}
    />
  );
}
