import { CourseDetailPage } from "@/app/features/courses/course-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CourseDetailPage id={id} />;
}
