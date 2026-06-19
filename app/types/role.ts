export type Role = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  is_system: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
};

export type RolesResponse = {
  roles: Role[];
};
