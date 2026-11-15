// Safe to import from browser code: no Node modules here (password.ts uses node:crypto and is server-only).
export const MIN_PASSWORD = 8;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters`;
  if (password.length > 200) return "Password is too long";
  return null;
}
