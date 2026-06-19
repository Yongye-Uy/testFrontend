import { Suspense } from "react";
import { TakePageInner } from "./take-page-inner";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; lessonItemId: string }>;
}) {
  const { classId, lessonItemId } = await params;
  return (
    <Suspense>
      <TakePageInner classId={classId} lessonItemId={lessonItemId} />
    </Suspense>
  );
}
