// Who may open what. Pure (no server imports), so the proxy, the sidebar and the pages all use the same rules.

export type Role = "admin" | "staff";

/** Pages only an admin may open. Everything else is open to any signed-in user. */
export const ADMIN_ONLY_PREFIXES = [
  "/analytics", "/royalty", "/expenses", "/printing-press", "/print-orders",
  "/reports", "/audit-logs", "/settings", "/users",
];

export function canOpen(role: Role, pathname: string): boolean {
  if (role === "admin") return true;
  return !ADMIN_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Where to go after signing in: only same-site paths, never an outside address. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
}
