export const backendCapabilities = {
  userDirectory: false,
  batchDirectory: false,
  batchStudents: false,
  semesterBatchAssignment: false,
  classBatchRead: false,
  classEnrollmentRead: false,
} as const;

export type BackendCapabilityKey = keyof typeof backendCapabilities;
