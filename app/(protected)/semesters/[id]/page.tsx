import { SemesterDetailPage } from "@/app/features/semesters/semester-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SemesterDetailPage id={id} />;
}
