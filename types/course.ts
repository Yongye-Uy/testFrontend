export type Program = {
  id: string;
  name: string;
  created_at: string;
};

export type Course = {
  id: string;
  program_id: string;
  code: string;
  title: string;
  description: string;
  created_at: string;
};

export type SemesterStatus = "draft" | "active" | "archived";

export type Semester = {
  id: string;
  title: string;
  academic_year: string;
  status: SemesterStatus;
  start_date?: string;
  end_date?: string;
};

export type ClassOffering = {
  id: string;
  semester_id: string;
  course_id: string;
  lecturer_id: string | null;
  status: "active" | string;
  created_by: string;
};

export type LessonItem = {
  id: string;
  item_type: string; // "material" | "assessment"
  item_id: string;
  title: string;
  status: string | null;
  question_count: number | null;
  material_type: string | null;
  is_unlocked: boolean;
  pass_threshold_percent: number | null;
  time_limit_seconds: number | null;
  description: string;
  link_url: string | null;
};

export type ClassLesson = {
  id: string;
  title: string;
  lesson_order: number;
  item_count: number;
  items: LessonItem[];
};

export type BatchType = "generation" | "general";
export type BatchStatus = "active" | "pending" | "archived";

export type Batch = {
  id: string;
  name: string;
  type: BatchType | string;
  status: BatchStatus | string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  program_id?: string;
  program_name?: string;
  entry_year?: number;
  starting_semester_id?: string;
  starting_semester_title?: string;
  expected_graduation_year?: number;
};

export type BatchDetail = {
  batch: Batch;
  student_ids: string[];
  class_ids: string[];
  student_count: number;
  class_count: number;
};

export type BatchStudent = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  added_at: string;
};

export type SemesterBatch = {
  id: string;
  name: string;
  type: BatchType | string;
  status: BatchStatus | string;
  is_generation_batch?: boolean;
  program_name?: string;
  entry_year?: number;
  expected_graduation_year?: number;
  starting_semester?: string;
  student_count: number;
  class_count: number;
};

export type Enrollment = {
  id: string;
  class_id: string;
  student_id: string;
  status: string;
  enrolled_at: string;
};

export type CountResult = {
  enrolled_count: number;
};

export type BatchStudentChange = {
  added_count: number;
  enrolled_count: number;
};
