export type PermissionKey =
  | "user.manage"
  | "role.manage"
  | "course.manage"
  | "semester.manage"
  | "batch.manage"
  | "class.manage";

export type Permission = {
  id: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
};

export type PermissionsResponse = {
  permissions: Permission[];
};
