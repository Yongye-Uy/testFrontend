import { getAccessToken, getStoredSession, storeSession } from "./auth";
import type { Batch, ClassOffering, Course, Program, Semester } from "@/types/course";
import type { Permission, PermissionsResponse } from "@/types/permission";
import type { Role, RolesResponse } from "@/types/role";
import type { LoginResponse, ResetPasswordResponse, User, UsersResponse } from "@/types/user";

type ServiceName = "user" | "course";

const userBaseUrl = "/api/user-service";
const courseBaseUrl = "/api/course-service";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  service: ServiceName,
  path: string,
  init: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const baseUrl = service === "user" ? userBaseUrl : courseBaseUrl;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(response.status, text || response.statusText);
      }
      throw new ApiError(response.status, `Expected JSON response but received: ${text.slice(0, 120)}`);
    }
  }
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? String(data.error)
        : typeof data === "object" && data !== null && "message" in data
          ? String(data.message)
          : text || response.statusText;
    throw new ApiError(response.status, message);
  }
  return data as T;
}

function jsonBody(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

function toIsoString(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "seconds" in value) {
    const seconds = Number((value as { seconds: unknown }).seconds);
    if (!Number.isNaN(seconds)) return new Date(seconds * 1000).toISOString();
  }
  return "";
}

function toStringId(value: unknown) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function currentUserId() {
  const id = Number(getStoredSession()?.user.id ?? 0);
  if (!id) throw new ApiError(401, "Please sign in again.");
  return id;
}

function normalizeUser(raw: unknown): User {
  const value = (raw ?? {}) as Record<string, unknown>;
  const roles = Array.isArray(value.roles) ? value.roles.map(String) : [];
  const primaryRole = roles[0] ?? (typeof value.role === "string" ? value.role : "");
  const isSuperAdmin = Boolean(value.is_super_admin) || roles.includes("super_admin") || primaryRole === "super_admin";

  return {
    id: toStringId(value.id),
    email: String(value.email ?? ""),
    full_name: String(value.full_name ?? ""),
    status: String(value.status ?? "active") as User["status"],
    auth_provider: String(value.auth_provider ?? "local"),
    google_subject: typeof value.google_subject === "string" ? value.google_subject : typeof value.google_id === "string" ? value.google_id : undefined,
    photo_url: typeof value.photo_url === "string" ? value.photo_url : undefined,
    is_super_admin: isSuperAdmin,
    email_verified: value.email_verified === undefined ? true : Boolean(value.email_verified),
    role: primaryRole || (isSuperAdmin ? "super_admin" : "director"),
    roles,
    created_at: toIsoString(value.created_at),
    updated_at: toIsoString(value.updated_at),
  };
}

function normalizeRole(raw: unknown): Role {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    name: String(value.name ?? ""),
    description: typeof value.description === "string" ? value.description : "",
    color: typeof value.color === "string" ? value.color : "",
    is_system: Boolean(value.is_system ?? value.isSystem),
    member_count: typeof value.member_count === "number" ? value.member_count : 0,
    created_at: toIsoString(value.created_at),
    updated_at: toIsoString(value.updated_at),
  };
}

function normalizePermission(raw: unknown): Permission {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    code: String(value.code ?? ""),
    resource: String(value.resource ?? ""),
    action: String(value.action ?? ""),
    description: typeof value.description === "string" ? value.description : "",
  };
}

function normalizeProgram(raw: unknown): Program {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    name: String(value.name ?? ""),
    created_at: toIsoString(value.created_at),
  };
}

function normalizeCourse(raw: unknown): Course {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    program_id: toStringId(value.program_id),
    code: String(value.code ?? ""),
    title: String(value.title ?? ""),
    description: String(value.description ?? ""),
    created_at: toIsoString(value.created_at),
  };
}

function normalizeSemester(raw: unknown): Semester {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    title: String(value.title ?? ""),
    academic_year: String(value.academic_year ?? ""),
    status: String(value.status ?? "draft") as Semester["status"],
    start_date: String(value.start_date ?? ""),
    end_date: String(value.end_date ?? ""),
  };
}

function normalizeClass(raw: unknown): ClassOffering {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    semester_id: toStringId(value.semester_id),
    course_id: toStringId(value.course_id),
    lecturer_id: value.lecturer_id ? toStringId(value.lecturer_id) : null,
    status: String(value.status ?? "active"),
    created_by: toStringId(value.created_by),
  };
}

function normalizeBatch(raw: unknown): Batch {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    name: String(value.name ?? ""),
    type: String(value.type ?? value.batch_type ?? "general"),
    status: String(value.status ?? "pending"),
    created_by: toStringId(value.created_by),
    program_id: value.program_id ? toStringId(value.program_id) : undefined,
    entry_year: typeof value.entry_year === "number" ? value.entry_year : undefined,
    starting_semester_id: value.starting_semester_id ? toStringId(value.starting_semester_id) : undefined,
    expected_graduation_year: typeof value.expected_graduation_year === "number" ? value.expected_graduation_year : undefined,
  };
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse & { user: unknown }>("user", "/auth/login", {
        method: "POST",
        ...jsonBody({ email, password }),
      }, false).then((response) => ({ ...response, user: normalizeUser(response.user) })),
    me: async () => {
      const session = getStoredSession();
      if (!session?.user.id) throw new ApiError(401, "No active session");
      return api.users.get(session.user.id);
    },
    refresh: async (refreshToken: string) => {
      const response = await request<{ access_token: string; refresh_token: string }>("user", "/auth/refresh", {
        method: "POST",
        ...jsonBody({ refresh_token: refreshToken }),
      }, false);
      const session = getStoredSession();
      if (session) {
        storeSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          user: session.user,
        });
      }
      return response;
    },
    logout: (refresh_token: string) =>
      request<{ success: boolean }>("user", "/auth/logout", {
        method: "POST",
        ...jsonBody({ refresh_token }),
      }),
  },
  users: {
    list: async (_params: URLSearchParams) => {
      void _params;
      return Promise.reject(new ApiError(501, "Backend2.0 does not expose a user directory list endpoint yet.")) as Promise<UsersResponse>;
    },
    get: (id: string) =>
      request<{ user: unknown }>("user", `/users/${id}`).then((response) => normalizeUser(response.user)),
    findByEmail: (email: string) =>
      request<{ user: unknown }>("user", `/users/email/${encodeURIComponent(email)}`).then((response) => normalizeUser(response.user)),
    create: (body: { email: string; full_name: string; password: string; role: string }) =>
      request<{ user: unknown }>("user", "/users", { method: "POST", ...jsonBody(body) }).then((response) => normalizeUser(response.user)),
    update: (id: string, body: { email?: string; full_name?: string }) =>
      request<{ user: unknown }>("user", `/users/${id}`, { method: "PUT", ...jsonBody(body) }).then((response) => normalizeUser(response.user)),
    changeStatus: (id: string, status: "active" | "inactive") =>
      Promise.reject(new ApiError(501, `Backend2.0 does not expose user status update yet. Requested status: ${status}.`)),
    resetPassword: (
      id: string,
      body: { actor_password: string; auto_generate: boolean; temporary_password?: string },
    ) => {
      void body;
      return Promise.reject(new ApiError(501, `Backend2.0 does not expose reset password yet for user ${id}.`)) as Promise<ResetPasswordResponse>;
    },
    getPermissions: (id: string) =>
      request<{ permissions: string[] }>("user", `/users/${id}/permissions`).then((response) => response.permissions ?? []),
  },
  roles: {
    list: () =>
      request<{ roles?: unknown[] }>("user", "/roles").then((response): RolesResponse => ({
        roles: (response.roles ?? []).map(normalizeRole),
      })),
    create: (body: { name: string; description?: string; color?: string }) =>
      request<{ role: unknown }>("user", "/roles", { method: "POST", ...jsonBody(body) }).then((response) => normalizeRole(response.role)),
    update: (id: string, body: { name?: string; description?: string; color?: string }) => {
      void body;
      return Promise.reject(new ApiError(501, `Backend2.0 does not expose role update yet for role ${id}.`));
    },
    delete: (id: string) => request<{ success: boolean }>("user", `/roles/${id}`, { method: "DELETE" }),
    assignToUser: (userId: string, roleId: string) =>
      request<{ success: boolean }>("user", `/users/${userId}/roles`, {
        method: "POST",
        ...jsonBody({ user_id: Number(userId), role_id: Number(roleId), assigned_by: currentUserId() }),
      }),
    removeFromUser: (userId: string, roleId: string) =>
      request<{ success: boolean }>("user", `/users/${userId}/roles/${roleId}`, { method: "DELETE" }),
    getPermissions: (id: string) =>
      request<{ permissions: unknown[] }>("user", `/roles/${id}/permissions`).then((response): PermissionsResponse => ({
        permissions: (response.permissions ?? []).map(normalizePermission),
      })),
    assignPermission: (roleId: string, permissionId: string) =>
      request<{ success: boolean }>("user", `/roles/${roleId}/permissions`, {
        method: "POST",
        ...jsonBody({ role_id: Number(roleId), permission_id: Number(permissionId) }),
      }),
    removePermission: (roleId: string, permissionId: string) =>
      request<{ success: boolean }>("user", `/roles/${roleId}/permissions/${permissionId}`, { method: "DELETE" }),
  },
  permissions: {
    list: () =>
      request<{ permissions?: unknown[] }>("user", "/permissions").then((response): PermissionsResponse => ({
        permissions: (response.permissions ?? []).map(normalizePermission),
      })),
    create: (body: { code: string; resource: string; action: string; description?: string }) =>
      request<{ permission: unknown }>("user", "/permissions", { method: "POST", ...jsonBody(body) }).then((response) => normalizePermission(response.permission)),
  },
  programs: {
    list: () =>
      request<{ programs?: unknown[] }>("course", "/programs").then((response) => ({
        programs: (response.programs ?? []).map(normalizeProgram),
      })),
    create: (name: string) => request<{ program: unknown }>("course", "/programs", { method: "POST", ...jsonBody({ name }) }).then((response) => normalizeProgram(response.program)),
  },
  courses: {
    list: (programId?: string) =>
      request<{ courses?: unknown[] }>("course", "/courses").then((response) => {
        const courses = (response.courses ?? []).map(normalizeCourse);
        return { courses: programId ? courses.filter((course) => course.program_id === programId) : courses };
      }),
    get: (id: string) => request<{ course: unknown }>("course", `/courses/${id}`).then((response) => normalizeCourse(response.course)),
    create: (body: { program_id: string; code: string; title: string; description?: string }) =>
      request<{ course: unknown }>("course", "/courses", {
        method: "POST",
        ...jsonBody({ ...body, program_id: Number(body.program_id) }),
      }).then((response) => normalizeCourse(response.course)),
    update: async (id: string, body: Partial<{ program_id: string; code: string; title: string; description: string }>) => {
      const current = await api.courses.get(id);
      return request<{ course: unknown }>("course", `/courses/${id}`, {
        method: "PUT",
        ...jsonBody({
          id: Number(id),
          program_id: Number(body.program_id ?? current.program_id),
          code: body.code ?? current.code,
          title: body.title ?? current.title,
          description: body.description ?? current.description,
        }),
      }).then((response) => normalizeCourse(response.course));
    },
  },
  semesters: {
    list: () =>
      request<{ semesters?: unknown[] }>("course", "/semesters").then((response) => ({
        semesters: (response.semesters ?? []).map(normalizeSemester),
      })),
    get: (id: string) => request<{ semester: unknown }>("course", `/semesters/${id}`).then((response) => normalizeSemester(response.semester)),
    create: (body: { title: string; academic_year?: string; start_date: string; end_date: string }) =>
      request<{ semester: unknown }>("course", "/semesters", {
        method: "POST",
        ...jsonBody({ ...body, created_by: currentUserId() }),
      }).then((response) => normalizeSemester(response.semester)),
    update: async (id: string, body: Partial<{ title: string; academic_year: string; status: string; start_date: string; end_date: string }>) => {
      const current = await api.semesters.get(id);
      return request<{ semester: unknown }>("course", `/semesters/${id}`, {
        method: "PUT",
        ...jsonBody({
          id: Number(id),
          title: body.title ?? current.title,
          academic_year: body.academic_year ?? current.academic_year,
          status: body.status ?? current.status,
          start_date: body.start_date ?? current.start_date,
          end_date: body.end_date ?? current.end_date,
        }),
      }).then((response) => normalizeSemester(response.semester));
    },
    changeStatus: async (id: string, status: "draft" | "active" | "archived") => {
      const current = await api.semesters.get(id);
      return api.semesters.update(id, { ...current, status });
    },
    classes: async (id: string) => {
      const response = await api.classes.list();
      return { classes: response.classes.filter((item) => item.semester_id === id) };
    },
    addClass: (id: string, course_id: string) =>
      request<{ class: unknown }>("course", `/semesters/${id}/assign-course`, {
        method: "POST",
        ...jsonBody({ semester_id: Number(id), course_id: Number(course_id), created_by: currentUserId() }),
      }).then((response) => normalizeClass(response.class)),
    batches: async (_id: string) => {
      void _id;
      throw new ApiError(501, "Backend2.0 does not expose semester batch listing yet.");
    },
    addBatch: async (id: string, batch_id: string) => {
      throw new ApiError(501, `Backend2.0 does not expose assign batch to semester yet for semester ${id} and batch ${batch_id}.`);
    },
    removeBatch: (id: string, batch_id: string) =>
      Promise.reject(new ApiError(501, `Backend2.0 does not expose remove batch from semester yet for semester ${id} and batch ${batch_id}.`)),
  },
  classes: {
    list: () =>
      request<{ classes?: unknown[] }>("course", "/classes").then((response) => ({
        classes: (response.classes ?? []).map(normalizeClass),
      })),
    get: (id: string) => request<{ class: unknown }>("course", `/classes/${id}`).then((response) => normalizeClass(response.class)),
    update: (id: string, body: { course_id?: string }) => {
      void body;
      return Promise.reject(new ApiError(501, `Backend2.0 does not expose class update yet for class ${id}.`));
    },
    assignLecturer: (id: string, lecturer_id: string) =>
      request<{ class: unknown }>("course", `/classes/${id}/assign-lecturer`, {
        method: "POST",
        ...jsonBody({ class_id: Number(id), lecturer_id: Number(lecturer_id) }),
      }).then((response) => normalizeClass(response.class)),
    assignBatch: (id: string, batch_id: string) =>
      Promise.reject(new ApiError(501, `Backend2.0 requires explicit student IDs for class batch assignment. Class ${id}, batch ${batch_id}.`)),
    batches: async (_id: string) => {
      void _id;
      throw new ApiError(501, "Backend2.0 does not expose class batch read yet.");
    },
    enrollments: async (_id: string) => {
      void _id;
      throw new ApiError(501, "Backend2.0 does not expose class enrollment read yet.");
    },
  },
  batches: {
    list: async () => {
      throw new ApiError(501, "Backend2.0 does not expose batch list yet.");
    },
    get: async (id: string) => {
      throw new ApiError(501, `Backend2.0 does not expose batch detail yet for batch ${id}.`);
    },
    create: (body: Partial<Batch> & { name: string; type: "generation" | "general" }) =>
      request<{ batch: unknown }>("course", "/batches", {
        method: "POST",
        ...jsonBody({ name: body.name, created_by: currentUserId() }),
      }).then((response) => normalizeBatch({ ...(response.batch as Record<string, unknown>), type: body.type, status: "pending" })),
    update: (id: string, body: Partial<Batch>) => {
      void body;
      return Promise.reject(new ApiError(501, `Backend2.0 does not expose batch update yet for batch ${id}.`));
    },
    changeStatus: (id: string, status: "active" | "archived") =>
      Promise.reject(new ApiError(501, `Backend2.0 does not expose batch status change yet for batch ${id}. Requested status: ${status}.`)),
    students: async (id: string) => {
      throw new ApiError(501, `Backend2.0 does not expose batch student roster yet for batch ${id}.`);
    },
    addStudents: (id: string, student_ids: string[]) =>
      Promise.reject(new ApiError(501, `Backend2.0 does not expose add students to batch yet for batch ${id}. Selected IDs: ${student_ids.join(", ") || "none"}.`)),
  },
};
