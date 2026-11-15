import { NextResponse, type NextRequest } from "next/server";
import { canOpen } from "@/lib/auth/access";
import { SESSION_COOKIE, readToken } from "@/lib/auth/token";

// Runs before every page, API call and server action: nobody gets past without a valid signed session cookie.
// (The database is checked again inside the app, so a switched-off user is stopped there at once.)
const PUBLIC = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const session = readToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    // API callers get a plain 401; people get sent to the login page and brought back afterwards.
    if (pathname.startsWith("/api/")) return Response.json({ error: "Not signed in" }, { status: 401 });
    const url = new URL("/login", req.url);
    if (req.method === "GET" && pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (!canOpen(session.role, pathname)) {
    return pathname.startsWith("/api/") || req.method !== "GET"
      ? new Response("Forbidden", { status: 403 })
      : NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next's own static files and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)"],
};
