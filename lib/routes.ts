export const routes = {
  login: "/auth/login",
  dashboard: "/dashboard",
  users: "/users",
  roles: "/roles",
  courses: "/courses",
  semesters: "/semesters",
  batches: "/batches",
  profile: "/profile",
  settings: "/settings",

  // Student routes
  myClasses: "/my-classes",
  semesterClasses: (semesterId: string) => `/my-classes/semester/${semesterId}`,
  classDetail: (classId: string) => `/my-classes/${classId}`,
  grades: "/grades",
  lessonViewer: (classId: string, lessonItemId: string) =>
    `/my-classes/${classId}/lesson/${lessonItemId}`,
  quiz: (classId: string, lessonItemId: string) =>
    `/my-classes/${classId}/quiz/${lessonItemId}`,
  quizTake: (classId: string, lessonItemId: string) =>
    `/my-classes/${classId}/quiz/${lessonItemId}/take`,
  quizResult: (classId: string, submissionId: string) =>
    `/my-classes/${classId}/quiz-result/${submissionId}`,
};
