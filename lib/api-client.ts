import {
  clearStoredSession,
  getAccessToken,
  getRefreshToken,
  getStoredSession,
  storeSession,
} from "./auth";
import type {
  Assessment,
  AssessmentOptions,
  AssessmentOptionsInput,
  AssessmentSubmission,
  Question,
  QuestionAnswer,
  QuestionOption,
} from "@/types/assessment";
import type {
  Batch,
  BatchDetail,
  BatchStudent,
  ClassOffering,
  Course,
  Enrollment,
  Program,
  Semester,
  SemesterBatch,
} from "@/types/course";
import type { Permission, PermissionsResponse } from "@/types/permission";
import type { Role, RolesResponse } from "@/types/role";
import type {
  BulkInviteResponse,
  InviteUserEntry,
  LoginResponse,
  CompleteInvitationResponse,
  ResetPasswordResponse,
  User,
  UsersResponse,
} from "@/types/user";

type ServiceName = "user" | "course" | "assessment" | "integration";

const userBaseUrl = "/api";
const courseBaseUrl = "/api/courses/v1";
const assessmentBaseUrl = "/api/assessments";
const integrationBaseUrl = "/api";

const serviceBaseUrls: Record<ServiceName, string> = {
  user: userBaseUrl,
  course: courseBaseUrl,
  assessment: assessmentBaseUrl,
  integration: integrationBaseUrl,
};

let refreshInFlight: Promise<string | null> | null = null;

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
  retried = false,
): Promise<T> {
  const baseUrl = serviceBaseUrls[service];
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

  if (
    response.status === 401 &&
    authenticated &&
    !retried &&
    !(service === "user" && path === "/auth/refresh")
  ) {
    const nextAccessToken = await refreshAccessToken();
    if (nextAccessToken) {
      return request<T>(service, path, init, authenticated, true);
    }
  }

  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(response.status, text || response.statusText);
      }
      throw new ApiError(
        response.status,
        `Expected JSON response but received: ${text.slice(0, 120)}`,
      );
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

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    const session = getStoredSession();
    if (!refreshToken || !session) {
      clearStoredSession();
      return null;
    }

    try {
      const response = await request<{
        access_token: string;
        refresh_token: string;
      }>(
        "user",
        "/auth/refresh",
        {
          method: "POST",
          ...jsonBody({ refresh_token: refreshToken }),
        },
        false,
        true,
      );

      storeSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: session.user,
      });

      return response.access_token;
    } catch {
      clearStoredSession();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
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

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function normalizeBatchType(value: unknown, source?: Record<string, unknown>) {
  const type = String(value ?? "")
    .trim()
    .toLowerCase();
  if (type === "generation") return "generation";

  const batchSource = source ?? {};
  if (batchSource.is_generation_batch === true) return "generation";

  const hasGenerationMetadata =
    Boolean(toNumber(batchSource.program_id)) ||
    Boolean(toNumber(batchSource.entry_year)) ||
    Boolean(toNumber(batchSource.starting_semester_id)) ||
    Boolean(toNumber(batchSource.expected_graduation_year)) ||
    (typeof batchSource.program_name === "string" &&
      batchSource.program_name.trim().length > 0) ||
    (typeof batchSource.starting_semester === "string" &&
      batchSource.starting_semester.trim().length > 0) ||
    (typeof batchSource.starting_semester_title === "string" &&
      batchSource.starting_semester_title.trim().length > 0);

  if (hasGenerationMetadata) return "generation";
  if (type === "regular") return "general";
  if (type === "general") return "general";

  return "general";
}

function currentUserId() {
  const id = Number(getStoredSession()?.user.id ?? 0);
  if (!id) throw new ApiError(401, "Please sign in again.");
  return id;
}

function normalizeRoleValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_");
}

function normalizeStatusValue(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function roleNameFromUnknown(value: unknown) {
  if (typeof value === "string") return normalizeRoleValue(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeRoleValue(
      record.name ?? record.role ?? record.role_name ?? record.code,
    );
  }
  return "";
}

function normalizeUser(raw: unknown): User {
  const value = (raw ?? {}) as Record<string, unknown>;
  const roles = Array.isArray(value.roles)
    ? value.roles.map(roleNameFromUnknown).filter(Boolean)
    : [];
  const primaryRole =
    roles[0] ??
    normalizeRoleValue(value.role ?? value.role_name ?? value.primary_role);
  const isSuperAdmin =
    Boolean(value.is_super_admin) ||
    roles.includes("super_admin") ||
    primaryRole === "super_admin";

  return {
    id: toStringId(value.id),
    email: String(value.email ?? ""),
    full_name: String(value.full_name ?? ""),
    status: normalizeStatusValue(value.status ?? "active") as User["status"],
    auth_provider: String(value.auth_provider ?? "local"),
    google_subject:
      typeof value.google_subject === "string"
        ? value.google_subject
        : typeof value.google_id === "string"
          ? value.google_id
          : undefined,
    photo_url:
      typeof value.photo_url === "string" ? value.photo_url : undefined,
    is_super_admin: isSuperAdmin,
    email_verified:
      value.email_verified === undefined ? true : Boolean(value.email_verified),
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
    member_count: toNumber(value.member_count) ?? 0,
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

function normalizeBatch(raw: unknown, extras?: Record<string, unknown>): Batch {
  const value = (raw ?? {}) as Record<string, unknown>;
  const merged = { ...value, ...(extras ?? {}) };

  return {
    id: toStringId(merged.id),
    name: String(merged.name ?? ""),
    type: normalizeBatchType(merged.type ?? merged.batch_type, merged),
    status: String(merged.status ?? "active"),
    created_by: toStringId(merged.created_by),
    created_at: toIsoString(merged.created_at),
    updated_at: toIsoString(merged.updated_at),
    program_id: merged.program_id ? toStringId(merged.program_id) : undefined,
    program_name:
      typeof merged.program_name === "string" ? merged.program_name : undefined,
    entry_year: toNumber(merged.entry_year),
    starting_semester_id: merged.starting_semester_id
      ? toStringId(merged.starting_semester_id)
      : undefined,
    starting_semester_title:
      typeof merged.starting_semester_title === "string"
        ? merged.starting_semester_title
        : undefined,
    expected_graduation_year: toNumber(merged.expected_graduation_year),
  };
}

function normalizeBatchDetail(raw: unknown): BatchDetail {
  const value = (raw ?? {}) as Record<string, unknown>;
  const generationInfo =
    value.generation_info && typeof value.generation_info === "object"
      ? (value.generation_info as Record<string, unknown>)
      : undefined;

  return {
    batch: normalizeBatch(value.batch, generationInfo),
    student_ids: Array.isArray(value.student_ids)
      ? value.student_ids.map(toStringId)
      : [],
    class_ids: Array.isArray(value.class_ids)
      ? value.class_ids.map(toStringId)
      : [],
    student_count: toNumber(value.student_count) ?? 0,
    class_count: toNumber(value.class_count) ?? 0,
  };
}

function normalizeBatchStudent(raw: unknown): BatchStudent {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    email: String(value.email ?? ""),
    full_name: String(value.full_name ?? ""),
    status: String(value.status ?? "pending"),
    added_at: toIsoString(value.added_at),
  };
}

function normalizeSemesterBatch(raw: unknown): SemesterBatch {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    name: String(value.name ?? ""),
    type: normalizeBatchType(value.type, value),
    status: String(value.status ?? "active"),
    is_generation_batch: Boolean(value.is_generation_batch),
    program_name:
      typeof value.program_name === "string" ? value.program_name : undefined,
    entry_year: toNumber(value.entry_year),
    expected_graduation_year: toNumber(value.expected_graduation_year),
    starting_semester:
      typeof value.starting_semester === "string"
        ? value.starting_semester
        : undefined,
    student_count: toNumber(value.student_count) ?? 0,
    class_count: toNumber(value.class_count) ?? 0,
  };
}

function normalizeEnrollment(raw: unknown): Enrollment {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    class_id: toStringId(value.class_id),
    student_id: toStringId(value.student_id),
    status: String(value.status ?? "active"),
    enrolled_at: toIsoString(value.enrolled_at),
  };
}

function normalizeInviteResult(raw: unknown) {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    email: String(value.email ?? ""),
    success: Boolean(value.success),
    error: typeof value.error === "string" ? value.error : undefined,
    invitation_url:
      typeof value.invitation_url === "string"
        ? value.invitation_url
        : typeof value.invitationUrl === "string"
          ? value.invitationUrl
          : undefined,
  };
}

function normalizeAssessmentOptions(raw: unknown): AssessmentOptions {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    assessment_id: toStringId(value.assessment_id),
    require_pass_threshold: Boolean(value.require_pass_threshold),
    pass_threshold_percent: toNumber(value.pass_threshold_percent) ?? 0,
    require_time_limit: Boolean(value.require_time_limit),
    time_limit_seconds: toNumber(value.time_limit_seconds),
    random_questions_count: toNumber(value.random_questions_count),
    shuffle_questions: Boolean(value.shuffle_questions),
    shuffle_options: Boolean(value.shuffle_options),
  };
}

function normalizeAssessment(raw: unknown): Assessment {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    title: String(value.title ?? ""),
    description: String(value.description ?? ""),
    status: String(value.status ?? "draft"),
    question_count: toNumber(value.question_count) ?? 0,
    options: value.options
      ? normalizeAssessmentOptions(value.options)
      : undefined,
  };
}

function normalizeQuestion(raw: unknown): Question {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    question_text: String(value.question_text ?? ""),
    type: String(value.type ?? "mcq_single"),
  };
}

function normalizeQuestionOption(raw: unknown): QuestionOption {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    question_id: toStringId(value.question_id),
    option_text: String(value.option_text ?? ""),
    is_correct: Boolean(value.is_correct),
    feedback: typeof value.feedback === "string" ? value.feedback : undefined,
  };
}

function normalizeQuestionAnswer(raw: unknown): QuestionAnswer {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    question_id: toStringId(value.question_id),
    accepted_answer: String(value.accepted_answer ?? ""),
  };
}

function normalizeAssessmentSubmission(raw: unknown): AssessmentSubmission {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toStringId(value.id),
    lesson_item_id: toStringId(value.lesson_item_id),
    class_id: toStringId(value.class_id),
    student_id: toStringId(value.student_id),
    status: String(value.status ?? "in_progress"),
    started_at: toIsoString(value.started_at),
    deadline_at:
      typeof value.deadline_at === "string" && value.deadline_at
        ? value.deadline_at
        : undefined,
    submitted_at:
      typeof value.submitted_at === "string" && value.submitted_at
        ? value.submitted_at
        : undefined,
    time_used_seconds: toNumber(value.time_used_seconds),
    auto_submitted: Boolean(value.auto_submitted),
  };
}

function withQuery(path: string, params?: URLSearchParams) {
  const query = params?.toString();
  return query ? `${path}?${query}` : path;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse & { user: unknown }>(
        "user",
        "/auth/login",
        {
          method: "POST",
          ...jsonBody({ email, password }),
        },
        false,
      ).then((response) => ({
        ...response,
        user: normalizeUser(response.user),
      })),
    me: () =>
      request<{ user: unknown }>("user", "/users/me").then((response) =>
        normalizeUser(response.user),
      ),
    refresh: async (refreshToken: string) => {
      const response = await request<{
        access_token: string;
        refresh_token: string;
      }>(
        "user",
        "/auth/refresh",
        {
          method: "POST",
          ...jsonBody({ refresh_token: refreshToken }),
        },
        false,
      );

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
    completeInvitation: (
      token: string,
      password: string,
      confirmPassword: string,
    ) =>
      request<CompleteInvitationResponse & { user: unknown }>(
        "integration",
        "/v1/integrations/invite/complete",
        {
          method: "POST",
          ...jsonBody({
            token,
            password,
            confirm_password: confirmPassword,
          }),
        },
        false,
      ).then((response) => ({
        ...response,
        user: normalizeUser(response.user),
      })),
  },
  users: {
    list: (params = new URLSearchParams()) =>
      request<{ users?: unknown[]; total_count?: number; totalCount?: number }>(
        "user",
        withQuery("/users", params),
      ).then(
        (response): UsersResponse => ({
          users: (response.users ?? []).map(normalizeUser),
          total: response.total_count ?? response.totalCount ?? 0,
          page:
            Math.floor(
              Number(params.get("offset") ?? 0) /
                Number(params.get("limit") ?? 200),
            ) + 1,
          limit: Number(params.get("limit") ?? 200),
        }),
      ),
    listByRole: async (role: string, status?: string) => {
      const candidates = Array.from(
        new Set([
          role,
          role.toLowerCase(),
          role.replaceAll(" ", "_").toLowerCase(),
        ]),
      );

      for (const candidate of candidates) {
        const params = new URLSearchParams([
          ["limit", "500"],
          ["offset", "0"],
          ["role_filter", candidate],
        ]);
        if (status) params.set("status_filter", status);
        const response = await api.users.list(params);
        if (response.users.length > 0) return response;
      }

      return { users: [], total: 0, page: 1, limit: 500 };
    },
    get: (id: string) =>
      request<{ user: unknown }>("user", `/users/${id}`).then((response) =>
        normalizeUser(response.user),
      ),
    findByEmail: (email: string) =>
      request<{ user: unknown }>(
        "user",
        `/users/email/${encodeURIComponent(email)}`,
      ).then((response) => normalizeUser(response.user)),
    create: (body: {
      email: string;
      full_name: string;
      password: string;
      role: string;
    }) =>
      request<{ user: unknown }>("user", "/users", {
        method: "POST",
        ...jsonBody(body),
      }).then((response) => normalizeUser(response.user)),
    bulkInvite: (entries: InviteUserEntry[]) =>
      request<{ results?: unknown[] }>("user", "/users/bulk-invite", {
        method: "POST",
        ...jsonBody({
          entries: entries.map((entry) => ({
            email: entry.email,
            full_name: entry.full_name,
            role: entry.role,
            batch_id: entry.batch_id ? Number(entry.batch_id) : undefined,
          })),
        }),
      }).then(
        (response): BulkInviteResponse => ({
          results: (response.results ?? []).map(normalizeInviteResult),
        }),
      ),
    resendInvitation: (id: string) =>
      request<{ invitation_url?: string }>(
        "user",
        `/users/${id}/resend-invitation`,
        {
          method: "POST",
          ...jsonBody({ user_id: Number(id) }),
        },
      ),
    update: (id: string, body: { email?: string; full_name?: string }) =>
      request<{ user: unknown }>("user", `/users/${id}`, {
        method: "PUT",
        ...jsonBody(body),
      }).then((response) => normalizeUser(response.user)),
    changeStatus: (id: string, status: "active" | "inactive") =>
      request<{ success: boolean }>("user", `/users/${id}/status`, {
        method: "PATCH",
        ...jsonBody({ id: Number(id), status }),
      }),
    resetPassword: (
      id: string,
      body: {
        actor_password: string;
        auto_generate: boolean;
        temporary_password?: string;
      },
    ) => {
      void body;
      return Promise.reject(
        new ApiError(
          501,
          `Reset password is not exposed by the current user-service contract for user ${id}.`,
        ),
      ) as Promise<ResetPasswordResponse>;
    },
    getPermissions: (id: string) =>
      request<{ permissions: string[] }>(
        "user",
        `/users/${id}/permissions`,
      ).then((response) => response.permissions ?? []),
  },
  roles: {
    list: () =>
      request<{ roles?: unknown[] }>("user", "/roles").then(
        (response): RolesResponse => ({
          roles: (response.roles ?? []).map(normalizeRole),
        }),
      ),
    create: (body: { name: string; description?: string; color?: string }) =>
      request<{ role: unknown }>("user", "/roles", {
        method: "POST",
        ...jsonBody(body),
      }).then((response) => normalizeRole(response.role)),
    update: async (
      id: string,
      body: { name?: string; description?: string; color?: string },
    ) => {
      const current = (await api.roles.list()).roles.find(
        (role) => role.id === id,
      );
      if (!current) throw new ApiError(404, `Role ${id} not found.`);

      return request<{ role: unknown }>("user", `/roles/${id}`, {
        method: "PUT",
        ...jsonBody({
          id: Number(id),
          name: body.name ?? current.name,
          description: body.description ?? current.description,
          color: body.color ?? current.color,
        }),
      }).then((response) => normalizeRole(response.role));
    },
    delete: (id: string) =>
      request<{ success: boolean }>("user", `/roles/${id}`, {
        method: "DELETE",
      }),
    assignToUser: (userId: string, roleId: string) =>
      request<{ success: boolean }>("user", `/users/${userId}/roles`, {
        method: "POST",
        ...jsonBody({
          user_id: Number(userId),
          role_id: Number(roleId),
          assigned_by: currentUserId(),
        }),
      }),
    removeFromUser: (userId: string, roleId: string) =>
      request<{ success: boolean }>(
        "user",
        `/users/${userId}/roles/${roleId}`,
        { method: "DELETE" },
      ),
    getPermissions: (id: string) =>
      request<{ permissions: unknown[] }>(
        "user",
        `/roles/${id}/permissions`,
      ).then(
        (response): PermissionsResponse => ({
          permissions: (response.permissions ?? []).map(normalizePermission),
        }),
      ),
    assignPermission: (roleId: string, permissionId: string) =>
      request<{ success: boolean }>("user", `/roles/${roleId}/permissions`, {
        method: "POST",
        ...jsonBody({
          role_id: Number(roleId),
          permission_id: Number(permissionId),
        }),
      }),
    removePermission: (roleId: string, permissionId: string) =>
      request<{ success: boolean }>(
        "user",
        `/roles/${roleId}/permissions/${permissionId}`,
        { method: "DELETE" },
      ),
  },
  permissions: {
    list: () =>
      request<{ permissions?: unknown[] }>("user", "/permissions").then(
        (response): PermissionsResponse => ({
          permissions: (response.permissions ?? []).map(normalizePermission),
        }),
      ),
    create: (body: {
      code: string;
      resource: string;
      action: string;
      description?: string;
    }) =>
      request<{ permission: unknown }>("user", "/permissions", {
        method: "POST",
        ...jsonBody(body),
      }).then((response) => normalizePermission(response.permission)),
  },
  programs: {
    list: () =>
      request<{ programs?: unknown[] }>("course", "/programs").then(
        (response) => ({
          programs: (response.programs ?? []).map(normalizeProgram),
        }),
      ),
    create: (name: string) =>
      request<{ program: unknown }>("course", "/programs", {
        method: "POST",
        ...jsonBody({ name }),
      }).then((response) => normalizeProgram(response.program)),
  },
  courses: {
    list: (programId?: string) =>
      request<{ courses?: unknown[] }>("course", "/courses").then(
        (response) => {
          const courses = (response.courses ?? []).map(normalizeCourse);
          return {
            courses: programId
              ? courses.filter((course) => course.program_id === programId)
              : courses,
          };
        },
      ),
    get: (id: string) =>
      request<{ course: unknown }>("course", `/courses/${id}`).then(
        (response) => normalizeCourse(response.course),
      ),
    create: (body: {
      program_id: string;
      code: string;
      title: string;
      description?: string;
    }) =>
      request<{ course: unknown }>("course", "/courses", {
        method: "POST",
        ...jsonBody({ ...body, program_id: Number(body.program_id) }),
      }).then((response) => normalizeCourse(response.course)),
    update: async (
      id: string,
      body: Partial<{
        program_id: string;
        code: string;
        title: string;
        description: string;
      }>,
    ) => {
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
      request<{ semesters?: unknown[] }>("course", "/semesters").then(
        (response) => ({
          semesters: (response.semesters ?? []).map(normalizeSemester),
        }),
      ),
    get: (id: string) =>
      request<{ semester: unknown }>("course", `/semesters/${id}`).then(
        (response) => normalizeSemester(response.semester),
      ),
    create: (body: { title: string; academic_year?: string }) =>
      request<{ semester: unknown }>("course", "/semesters", {
        method: "POST",
        ...jsonBody({
          title: body.title,
          academic_year: body.academic_year ?? "",
        }),
      }).then((response) => normalizeSemester(response.semester)),
    update: async (
      id: string,
      body: Partial<{ title: string; academic_year: string; status: string }>,
    ) => {
      const current = await api.semesters.get(id);
      return request<{ semester: unknown }>("course", `/semesters/${id}`, {
        method: "PATCH",
        ...jsonBody({
          id: Number(id),
          title: body.title ?? current.title,
          academic_year: body.academic_year ?? current.academic_year,
        }),
      }).then((response) => normalizeSemester(response.semester));
    },
    delete: (id: string) =>
      request<{ success?: boolean }>("course", `/semesters/${id}`, {
        method: "DELETE",
      }),
    changeStatus: (id: string, status: "draft" | "active" | "archived") => {
      if (status === "active") {
        return request<{ semester: unknown }>(
          "course",
          `/semesters/${id}/activate`,
          {
            method: "POST",
            ...jsonBody({ id: Number(id) }),
          },
        ).then((response) => normalizeSemester(response.semester));
      }
      if (status === "archived") {
        return request<{ semester: unknown }>(
          "course",
          `/semesters/${id}/archive`,
          {
            method: "POST",
            ...jsonBody({ id: Number(id) }),
          },
        ).then((response) => normalizeSemester(response.semester));
      }
      return Promise.reject(
        new ApiError(
          501,
          `Changing a semester back to ${status} is not exposed by the current course-service contract.`,
        ),
      );
    },
    classes: async (id: string) => {
      const response = await api.classes.list();
      return {
        classes: response.classes.filter((item) => item.semester_id === id),
      };
    },
    addClass: (id: string, course_id: string) =>
      request<{ class: unknown }>("course", "/classes", {
        method: "POST",
        ...jsonBody({ semester_id: Number(id), course_id: Number(course_id) }),
      }).then((response) => normalizeClass(response.class)),
    batches: (id: string) =>
      request<{ batches?: unknown[] }>(
        "course",
        `/semesters/${id}/batches`,
      ).then((response) => ({
        batches: (response.batches ?? []).map(normalizeSemesterBatch),
      })),
    addBatch: (id: string, batch_id: string) =>
      request<{ success: boolean }>("course", `/semesters/${id}/assign-batch`, {
        method: "POST",
        ...jsonBody({ semester_id: Number(id), batch_id: Number(batch_id) }),
      }),
    removeBatch: (id: string, batch_id: string) =>
      Promise.reject(
        new ApiError(
          501,
          `Remove batch from semester is not exposed by the current course-service contract (${id}/${batch_id}).`,
        ),
      ),
  },
  classes: {
    list: () =>
      request<{ classes?: unknown[] }>("course", "/classes").then(
        (response) => ({
          classes: (response.classes ?? []).map(normalizeClass),
        }),
      ),
    get: (id: string) =>
      request<{ class: unknown }>("course", `/classes/${id}`).then((response) =>
        normalizeClass(response.class),
      ),
    update: (id: string, body: { course_id?: string }) => {
      void body;
      return Promise.reject(
        new ApiError(
          501,
          `Class update is not exposed by the current course-service contract for class ${id}.`,
        ),
      );
    },
    assignLecturer: (id: string, lecturer_id: string) =>
      request<{ class: unknown }>("course", `/classes/${id}/assign-lecturer`, {
        method: "POST",
        ...jsonBody({ class_id: Number(id), lecturer_id: Number(lecturer_id) }),
      }).then((response) => normalizeClass(response.class)),
    batches: (id: string) =>
      request<{ batches?: unknown[] }>("course", `/classes/${id}/batches`).then(
        (response) => ({
          batches: (response.batches ?? []).map((item) => normalizeBatch(item)),
        }),
      ),
    enrollments: (id: string) =>
      request<{ enrollments?: unknown[] }>(
        "course",
        `/classes/${id}/enrollments`,
      ).then((response) => ({
        enrollments: (response.enrollments ?? []).map(normalizeEnrollment),
      })),
  },
  batches: {
    list: (
      params = new URLSearchParams([
        ["limit", "500"],
        ["offset", "0"],
      ]),
    ) =>
      request<{ batches?: unknown[] }>(
        "course",
        withQuery("/batches", params),
      ).then((response) => ({
        batches: (response.batches ?? []).map((item) => normalizeBatch(item)),
      })),
    get: (id: string) =>
      request<{ batch: unknown }>("course", `/batches/${id}`).then((response) =>
        normalizeBatch(response.batch),
      ),
    getDetail: (id: string) =>
      request<unknown>("course", `/batches/${id}/detail`).then((response) =>
        normalizeBatchDetail(response),
      ),
    create: (
      body: Partial<Batch> & { name: string; type: "generation" | "general" },
    ) => {
      const payload: Record<string, unknown> = {
        name: body.name,
        type: body.type,
      };

      if (body.type === "generation") {
        payload.generation_info = {
          program_id: Number(body.program_id),
          entry_year: body.entry_year ?? 0,
          starting_semester_id: Number(body.starting_semester_id),
          expected_graduation_year: body.expected_graduation_year ?? 0,
        };
      }

      return request<{ batch: unknown }>("course", "/batches", {
        method: "POST",
        ...jsonBody(payload),
      }).then((response) => normalizeBatch(response.batch));
    },
    assignClasses: (id: string, class_ids: string[]) =>
      request<{ success?: boolean; assigned_classes?: unknown[] }>(
        "course",
        `/batches/${id}/assign-classes`,
        {
          method: "POST",
          ...jsonBody({
            batch_id: Number(id),
            class_ids: class_ids.map(Number),
          }),
        },
      ),
    update: (id: string, body: Partial<Batch>) =>
      request<{ batch: unknown }>("course", `/batches/${id}`, {
        method: "PATCH",
        ...jsonBody({
          id: Number(id),
          name: body.name ?? "",
          entry_year: body.entry_year ?? 0,
          starting_semester_id: body.starting_semester_id
            ? Number(body.starting_semester_id)
            : 0,
          expected_graduation_year: body.expected_graduation_year ?? 0,
        }),
      }).then((response) => normalizeBatch(response.batch)),
    changeStatus: (id: string, status: "active" | "archived") =>
      request<{ batch: unknown }>("course", `/batches/${id}/status`, {
        method: "PATCH",
        ...jsonBody({ id: Number(id), status }),
      }).then((response) => normalizeBatch(response.batch)),
    students: (id: string) =>
      request<{ students?: unknown[] }>("course", `/batches/${id}/roster`).then(
        (response) => ({
          students: (response.students ?? []).map(normalizeBatchStudent),
        }),
      ),
    addStudents: async (id: string, student_ids: string[]) => {
      let addedCount = 0;

      for (const studentId of student_ids) {
        await request<{ success: boolean }>(
          "course",
          `/batches/${id}/students`,
          {
            method: "POST",
            ...jsonBody({
              batch_id: Number(id),
              student_id: Number(studentId),
            }),
          },
        );
        addedCount += 1;
      }

      return {
        added_count: addedCount,
        enrolled_count: 0,
      };
    },
    removeStudent: (id: string, studentId: string) =>
      request<{ success: boolean }>(
        "course",
        `/batches/${id}/students/${studentId}`,
        {
          method: "DELETE",
        },
      ),
  },
  assessments: {
    list: () =>
      request<{ assessments?: unknown[] }>("assessment", "/assessments").then(
        (response) => ({
          assessments: (response.assessments ?? []).map(normalizeAssessment),
        }),
      ),
    get: (id: string) =>
      request<unknown>("assessment", `/assessments/${id}`).then(
        normalizeAssessment,
      ),
    create: (body: {
      title: string;
      description?: string;
      options?: AssessmentOptionsInput;
    }) =>
      request<unknown>("assessment", "/assessments", {
        method: "POST",
        ...jsonBody(body),
      }).then(normalizeAssessment),
    update: (id: string, body: { title: string; description: string }) =>
      request<unknown>("assessment", `/assessments/${id}`, {
        method: "PUT",
        ...jsonBody(body),
      }).then(normalizeAssessment),
    remove: (id: string) =>
      request<{ success: boolean }>("assessment", `/assessments/${id}`, {
        method: "DELETE",
      }),
    publish: (id: string) =>
      request<unknown>("assessment", `/assessments/${id}/publish`, {
        method: "POST",
      }).then(normalizeAssessment),
    archive: (id: string) =>
      request<unknown>("assessment", `/assessments/${id}/archive`, {
        method: "POST",
      }).then(normalizeAssessment),
    getOptions: (id: string) =>
      request<unknown>("assessment", `/assessments/${id}/options`).then(
        normalizeAssessmentOptions,
      ),
    updateOptions: (id: string, body: AssessmentOptionsInput) =>
      request<unknown>("assessment", `/assessments/${id}/options`, {
        method: "PUT",
        ...jsonBody(body),
      }).then(normalizeAssessmentOptions),
    questions: (id: string) =>
      request<{ questions?: unknown[] }>(
        "assessment",
        `/assessments/${id}/questions`,
      ).then((response) => ({
        questions: (response.questions ?? []).map(normalizeQuestion),
      })),
    addQuestion: (id: string, questionId: string) =>
      request<{ success: boolean }>(
        "assessment",
        `/assessments/${id}/questions`,
        {
          method: "POST",
          ...jsonBody({ question_id: Number(questionId) }),
        },
      ),
    removeQuestion: (id: string, questionId: string) =>
      request<{ success: boolean }>(
        "assessment",
        `/assessments/${id}/questions/${questionId}`,
        { method: "DELETE" },
      ),
    submissions: (id: string) =>
      request<{ submissions?: unknown[] }>(
        "assessment",
        `/assessments/${id}/submissions`,
      ).then((response) => ({
        submissions: (response.submissions ?? []).map(
          normalizeAssessmentSubmission,
        ),
      })),
  },
  questions: {
    create: (body: { question_text: string; type: string }) =>
      request<unknown>("assessment", "/questions", {
        method: "POST",
        ...jsonBody(body),
      }).then(normalizeQuestion),
    get: (id: string) =>
      request<unknown>("assessment", `/questions/${id}`).then(
        normalizeQuestion,
      ),
    update: (id: string, body: { question_text: string; type: string }) =>
      request<unknown>("assessment", `/questions/${id}`, {
        method: "PUT",
        ...jsonBody(body),
      }).then(normalizeQuestion),
    remove: (id: string) =>
      request<{ success: boolean }>("assessment", `/questions/${id}`, {
        method: "DELETE",
      }),
    listOptions: (questionId: string) =>
      request<{ options?: unknown[] }>(
        "assessment",
        `/questions/${questionId}/options`,
      ).then((response) => ({
        options: (response.options ?? []).map(normalizeQuestionOption),
      })),
    addOption: (
      questionId: string,
      body: { option_text: string; is_correct: boolean; feedback?: string },
    ) =>
      request<unknown>("assessment", `/questions/${questionId}/options`, {
        method: "POST",
        ...jsonBody(body),
      }).then(normalizeQuestionOption),
    removeOption: (optionId: string) =>
      request<{ success: boolean }>("assessment", `/options/${optionId}`, {
        method: "DELETE",
      }),
    listAnswers: (questionId: string) =>
      request<{ answers?: unknown[] }>(
        "assessment",
        `/questions/${questionId}/answers`,
      ).then((response) => ({
        answers: (response.answers ?? []).map(normalizeQuestionAnswer),
      })),
    addAnswer: (questionId: string, accepted_answer: string) =>
      request<unknown>("assessment", `/questions/${questionId}/answers`, {
        method: "POST",
        ...jsonBody({ accepted_answer }),
      }).then(normalizeQuestionAnswer),
    removeAnswer: (answerId: string) =>
      request<{ success: boolean }>(
        "assessment",
        `/question-answers/${answerId}`,
        { method: "DELETE" },
      ),
  },
};
