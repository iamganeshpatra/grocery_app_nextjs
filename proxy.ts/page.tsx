import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// These paths are accessible without logging in
const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/signup",
  "/signup/seller",
  "/signup/customer",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
];

// Role → allowed route prefix
const ROLE_PREFIX: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SHOP_OWNER: "/shop-owner",
  SHOP_MANAGER: "/manager",
  CUSTOMER: "/customer",
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always pass through API routes and Next.js internals
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  // 2. Always pass through the role-redirect helper and forced-change-password pages
  if (
    pathname === "/auth-redirect" ||
    pathname === "/change-password" ||
    pathname === "/profile"
  ) {
    return NextResponse.next();
  }

  // 3. Allow public routes
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isPublic) return NextResponse.next();

  // 4. Get the session
  const session = await auth.api.getSession({ headers: request.headers });
  console.log("SESSION USER =>", session!.user);

  // 5. Not logged in → redirect to sign in
  if (!session) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const { role, isActive, mustChangePassword } = session.user as {
    role: string;
    isActive: boolean;
    mustChangePassword: boolean;
  };

  // 6. Deactivated account
  if (!isActive) {
    return NextResponse.redirect(
      new URL("/unauthorized?reason=deactivated", request.url),
    );
  }

  // 7. Manager must change password before going anywhere else
  if (mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // 8. Role-based route guard
  const allowedPrefix = ROLE_PREFIX[role];
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
