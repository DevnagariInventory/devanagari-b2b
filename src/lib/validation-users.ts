import { passwordProblem } from "./auth/password-rules";
import type { FieldErrors } from "./validation";

export interface LoginRaw { username: string; password: string }
export interface NewUserRaw { name: string; username: string; email: string; role: string; password: string }
export interface EditUserRaw { name: string; email: string; role: string; active: string }
export interface ChangePasswordRaw { current: string; password: string; confirm: string }
export interface ResetPasswordRaw { password: string }

export const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Optional. Stored lower-case. */
const email = (raw: string, errors: FieldErrors) => {
  const e = raw.trim().toLowerCase();
  if (e && (e.length > 120 || !EMAIL_RE.test(e))) errors.email = "Enter a valid email address";
  return e;
};

const username = (raw: string, errors: FieldErrors) => {
  const u = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(u)) errors.username = "3-30 letters, numbers, dot, dash or underscore";
  return u;
};

export function parseLogin(raw: LoginRaw) {
  const errors: FieldErrors = {};
  if (!raw.username.trim()) errors.username = "Enter your email or username";
  if (!raw.password) errors.password = "Enter your password";
  return { errors, value: { username: raw.username.trim().toLowerCase(), password: raw.password } };
}

export function parseNewUser(raw: NewUserRaw) {
  const errors: FieldErrors = {};
  const name = raw.name.trim();
  if (!name) errors.name = "Name is required";
  const u = username(raw.username, errors);
  const em = email(raw.email, errors);
  const role = raw.role === "admin" ? "admin" : "staff";
  const pw = passwordProblem(raw.password);
  if (pw) errors.password = pw;
  return { errors, value: { name, username: u, email: em, role: role as "admin" | "staff", password: raw.password } };
}

export function parseEditUser(raw: EditUserRaw) {
  const errors: FieldErrors = {};
  const name = raw.name.trim();
  if (!name) errors.name = "Name is required";
  const em = email(raw.email, errors);
  return {
    errors,
    value: { name, email: em, role: (raw.role === "admin" ? "admin" : "staff") as "admin" | "staff", active: raw.active !== "no" },
  };
}

export function parseChangePassword(raw: ChangePasswordRaw) {
  const errors: FieldErrors = {};
  if (!raw.current) errors.current = "Enter your current password";
  const pw = passwordProblem(raw.password);
  if (pw) errors.password = pw;
  else if (raw.password !== raw.confirm) errors.confirm = "Passwords do not match";
  return { errors, value: { current: raw.current, password: raw.password } };
}

export function parseResetPassword(raw: ResetPasswordRaw) {
  const errors: FieldErrors = {};
  const pw = passwordProblem(raw.password);
  if (pw) errors.password = pw;
  return { errors, value: { password: raw.password } };
}
