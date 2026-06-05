/**
 * Domain types for the EPP LMS.
 *
 * These describe the shape of data the UI expects; they are intentionally
 * decoupled from any persistence or transport detail. The placeholder API
 * client in `lib/api.ts` returns these shapes; the backend will conform.
 */

export type Role = "student" | "lecturer" | "director" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Tailwind background-color utility for the avatar tile (e.g. "bg-gold-500"). */
  avatarColor: string;
  initials: string;
  batch?: string;
  department?: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  lecturer: string;
  semester: string;
  batch: string;
  studentCount: number;
  lessonsTotal: number;
  lessonsComplete: number;
  /** 0..100 */
  progress: number;
  avgScore?: number;
  status: "active" | "archived" | "draft";
  /** Accent color id used by CourseCard ("navy" | "gold" | "emerald" | "rose"). */
  color: string;
  description: string;
}

/** Lecture materials are documents, PDFs, or external links (no video). */
export type LessonMaterialType = "doc" | "pdf" | "link";

export interface Lesson {
  id: string;
  courseId: string;
  week: number;
  day: number;
  order: number;
  title: string;
  type: LessonMaterialType;
  duration: string;
  status: "completed" | "in-progress" | "unlocked" | "locked";
  unlockRequirement?: string;
}

export interface Assessment {
  id: string;
  courseId: string;
  week: number;
  title: string;
  questionsCount: number;
  durationMin: number;
  passingScore: number;
  status: "completed" | "available" | "locked" | "draft" | "published";
  attemptScore?: number;
  attemptedAt?: string;
}

export interface Question {
  id: string;
  type: "mcq" | "multi" | "tf" | "fill";
  /**
   * For `fill` questions, use `____` (four underscores) as the placeholder
   * where the student's answer should appear.
   */
  prompt: string;
  options?: string[];
  /** Per-option feedback, index-aligned with `options`. */
  optionFeedback?: string[];
  /** number for single-choice / TF, number[] for multi, string for fill. */
  correctAnswer: string | number | number[];
  /** Accepted variants for fill-in-the-blank (case-insensitive). */
  acceptedAnswers?: string[];
  /** Optional hint shown above the input on fill questions. */
  hint?: string;
  /** Fallback explanation when per-answer feedback is missing. */
  explanation: string;
  points: number;
}

/** A student's grade row, suitable for the Grades page. */
export interface GradeRow {
  courseId: string;
  quizId: string;
  course: string;
  code: string;
  assessment: string;
  /** 0..100 */
  score: number;
  /** 0..100 */
  passing: number;
  /** ISO date or human label, depending on backend. */
  submitted: string;
}

/** Semester listing used by MyCourses. */
export interface Semester {
  id: string;
  title: string;
  start: string;
  end: string;
  status: "active" | "archived" | "draft";
  courses: number;
  students: number;
}
