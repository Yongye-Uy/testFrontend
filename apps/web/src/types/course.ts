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
  start_date: string;
  end_date: string;
};

export type ClassOffering = {
  id: string;
  semester_id: string;
  course_id: string;
  lecturer_id: string | null;
  status: "active" | string;
  created_by: string;
};

export type BatchType = "generation" | "general";
export type BatchStatus = "active" | "pending" | "archived";

export type Batch = {
  id: string;
  name: string;
  type: BatchType | string;
  status: BatchStatus | string;
  created_by: string;
  program_id?: string;
  entry_year?: number;
  starting_semester_id?: string;
  expected_graduation_year?: number;
};

export type SemesterBatch = {
  id: string;
  semester_id: string;
  batch_id: string;
  name: string;
  type: BatchType | string;
  status: BatchStatus | string;
  created_by: string;
  assigned_by: string;
  assigned_at: string;
  student_count: number;
  assigned_classes_count: number;
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
