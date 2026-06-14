export type AssessmentStatus = "draft" | "published" | "archived";

export type QuestionType =
  | "mcq_single"
  | "mcq_multiple"
  | "true_false"
  | "fill_blank";

export type SubmissionStatus = "in_progress" | "submitted" | "graded";

export type AssessmentOptions = {
  id: string;
  assessment_id: string;
  require_pass_threshold: boolean;
  pass_threshold_percent: number;
  require_time_limit: boolean;
  time_limit_seconds?: number;
  random_questions_count?: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
};

export type AssessmentOptionsInput = {
  require_pass_threshold: boolean;
  pass_threshold_percent: number;
  require_time_limit: boolean;
  time_limit_seconds: number;
  random_questions_count: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
};

export type Assessment = {
  id: string;
  title: string;
  description: string;
  status: AssessmentStatus | string;
  question_count: number;
  options?: AssessmentOptions;
};

export type Question = {
  id: string;
  question_text: string;
  type: QuestionType | string;
};

export type QuestionOption = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  feedback?: string;
};

export type QuestionAnswer = {
  id: string;
  question_id: string;
  accepted_answer: string;
};

export type AssessmentSubmission = {
  id: string;
  lesson_item_id: string;
  class_id: string;
  student_id: string;
  status: SubmissionStatus | string;
  started_at: string;
  deadline_at?: string;
  submitted_at?: string;
  time_used_seconds?: number;
  auto_submitted: boolean;
};
