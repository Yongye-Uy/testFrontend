export const backendCapabilities = {
  userDirectory: true,
  batchDirectory: true,
  batchStudents: true,
  semesterBatchAssignment: true,
  classBatchRead: true,
  classEnrollmentRead: true,
} as const;

export type BackendCapabilityKey = keyof typeof backendCapabilities;
