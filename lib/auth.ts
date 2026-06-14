import type { User } from "@/types/user";

const ACCESS_TOKEN_KEY = "epplms.access_token";
const REFRESH_TOKEN_KEY = "epplms.refresh_token";
const USER_KEY = "epplms.user";
const PENDING_AUTH_KEY = "epplms.pending_auth";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  const rawUser = window.localStorage.getItem(USER_KEY);
  if (!accessToken || !refreshToken || !rawUser) return null;
  try {
    return { accessToken, refreshToken, user: JSON.parse(rawUser) as User };
  } catch {
    clearStoredSession();
    return null;
  }
}

export function storeSession(session: StoredSession) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function storeTokens(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function updateStoredUser(user: User) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearStoredSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function storePendingAuth(tokens: {
  accessToken: string;
  refreshToken: string;
}) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify(tokens));
}

export function getPendingAuth() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { accessToken: string; refreshToken: string };
  } catch {
    clearPendingAuth();
    return null;
  }
}

export function clearPendingAuth() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_AUTH_KEY);
}

export function defaultRouteForUser(user: User) {
  const roles = new Set([user.role, ...user.roles]);
  if (user.is_super_admin || roles.has("super_admin")) return "/users";
  if (roles.has("director")) return "/courses";
  if (roles.has("lecturer")) return "/assessments";
  return "/dashboard";
}

export function isSuperAdmin(user: User | null) {
  if (!user) return false;
  return (
    user.is_super_admin ||
    user.role === "super_admin" ||
    user.roles.includes("super_admin")
  );
}

export function isDirector(user: User | null) {
  if (!user) return false;
  return user.role === "director" || user.roles.includes("director");
}

export function isLecturer(user: User | null) {
  if (!user) return false;
  return user.role === "lecturer" || user.roles.includes("lecturer");
}
