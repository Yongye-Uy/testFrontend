import type { Course } from "@/types/course";

export function programName(programs: { id: string; name: string }[], programId?: string) {
  return programs.find((program) => program.id === programId)?.name ?? "Unassigned program";
}

export function courseLabel(course?: Course) {
  if (!course) return "Unknown course";
  return `${course.code} - ${course.title}`;
}
