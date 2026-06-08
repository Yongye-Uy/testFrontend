export type UserStatus = "pending" | "active" | "inactive";
export type UserRole = "super_admin" | "director" | "lecturer" | "student" | string;

export type User = {
  id: string;
  email: string;
  full_name: string;
  status: UserStatus;
  auth_provider: string;
  google_subject?: string;
  photo_url?: string;
  is_super_admin: boolean;
  email_verified: boolean;
  role: UserRole;
  roles: UserRole[];
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: User;
};

export type UsersResponse = {
  users: User[];
  total: number;
  page: number;
  limit: number;
};

export type ResetPasswordResponse = {
  temporary_password?: string;
  must_reset_on_next_login: boolean;
};
