/**
 * Thin typed fetch client for the EPP LMS backend.
 *
 * Endpoint paths and response shapes are placeholders — replace with the
 * real specs when the backend is in place. Every call here is a GET that
 * returns the matching type from `./types`.
 *
 * The base URL comes from `NEXT_PUBLIC_API_URL`. If unset, every request
 * throws `ApiNotConfiguredError` so missing config is obvious in the UI.
 */

import type {
  Assessment,
  Course,
  GradeRow,
  Lesson,
  Question,
  Semester,
  User,
} from "./types";

export class ApiNotConfiguredError extends Error {
  constructor() {
    super(
      "NEXT_PUBLIC_API_URL is not set — point it at the LMS backend before fetching data.",
    );
    this.name = "ApiNotConfiguredError";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new ApiNotConfiguredError();
  return url.replace(/\/$/, "");
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, path, body || res.statusText);
  }
  return (await res.json()) as T;
}

/* ─────────────── Identity ─────────────── */

/** The signed-in user, or `null` if unauthenticated. */
export const getCurrentUser = (init?: RequestInit) =>
  get<User | null>("/me", init);

/* ─────────────── Catalog ─────────────── */

export const listSemesters = (init?: RequestInit) =>
  get<Semester[]>("/me/semesters", init);

export const listMyCourses = (init?: RequestInit) =>
  get<Course[]>("/me/courses", init);

export const getCourse = (courseId: string, init?: RequestInit) =>
  get<Course>(`/courses/${encodeURIComponent(courseId)}`, init);

export const listCourseLessons = (courseId: string, init?: RequestInit) =>
  get<Lesson[]>(`/courses/${encodeURIComponent(courseId)}/lessons`, init);

export const getLesson = (
  courseId: string,
  lessonId: string,
  init?: RequestInit,
) =>
  get<Lesson>(
    `/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`,
    init,
  );

export const listCourseAssessments = (courseId: string, init?: RequestInit) =>
  get<Assessment[]>(
    `/courses/${encodeURIComponent(courseId)}/assessments`,
    init,
  );

export const getAssessment = (
  courseId: string,
  assessmentId: string,
  init?: RequestInit,
) =>
  get<Assessment>(
    `/courses/${encodeURIComponent(courseId)}/assessments/${encodeURIComponent(assessmentId)}`,
    init,
  );

export const getAssessmentQuestions = (
  courseId: string,
  assessmentId: string,
  init?: RequestInit,
) =>
  get<Question[]>(
    `/courses/${encodeURIComponent(courseId)}/assessments/${encodeURIComponent(assessmentId)}/questions`,
    init,
  );

/* ─────────────── Grades ─────────────── */

export const listMyGrades = (init?: RequestInit) =>
  get<GradeRow[]>("/me/grades", init);
