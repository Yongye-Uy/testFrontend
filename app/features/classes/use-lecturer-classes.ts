"use client";

import { api } from "@/app/services/api-client";
import { isLecturer } from "@/lib/auth";
import { useAsync } from "@/app/features/shared/use-async";
import { useAuth } from "@/app/hooks/use-auth";
import type { Semester } from "@/app/types/course";

export type LecturerClass = {
  id: string;
  code: string;
  title: string;
  status: string;
  studentCount: number;
  batchLabel: string | null;
};

export type LecturerOverview = {
  classes: LecturerClass[];
  totalStudents: number;
  activeSemester: Semester | null;
};

const EMPTY_OVERVIEW: LecturerOverview = {
  classes: [],
  totalStudents: 0,
  activeSemester: null,
};

// Resolves a lecturer's teaching overview from the data the current backend
// actually exposes: classes (filtered by lecturer_id) joined to the course
// catalog for code/title, plus per-class enrollment + batch reads. Lessons
// published is intentionally absent — no backend read exists for it yet.
async function loadLecturerOverview(
  lecturerId: string,
): Promise<LecturerOverview> {
  const [classesRes, coursesRes, semestersRes] = await Promise.all([
    api.classes.list(),
    api.courses.list(),
    api.semesters.list(),
  ]);

  const courseById = new Map(
    coursesRes.courses.map((course) => [course.id, course]),
  );
  const myClasses = classesRes.classes.filter(
    (item) => item.lecturer_id === lecturerId,
  );

  const classes = await Promise.all(
    myClasses.map(async (item): Promise<LecturerClass> => {
      const [studentCount, batchLabel] = await Promise.all([
        api.classes
          .enrollments(item.id)
          .then((res) => res.enrollments.length)
          .catch(() => 0),
        api.classes
          .batches(item.id)
          .then((res) => res.batches[0]?.name ?? null)
          .catch(() => null),
      ]);
      const course = courseById.get(item.course_id);
      return {
        id: item.id,
        code: course?.code ?? `Class ${item.id}`,
        title: course?.title ?? `Class ${item.id}`,
        status: item.status,
        studentCount,
        batchLabel,
      };
    }),
  );

  const totalStudents = classes.reduce(
    (sum, item) => sum + item.studentCount,
    0,
  );
  const activeSemester =
    semestersRes.semesters.find((item) => item.status === "active") ?? null;

  return { classes, totalStudents, activeSemester };
}

export function useLecturerClasses() {
  const { user } = useAuth();
  return useAsync(
    () =>
      isLecturer(user) && user
        ? loadLecturerOverview(user.id)
        : Promise.resolve(EMPTY_OVERVIEW),
    [user?.id, user?.role],
  );
}
