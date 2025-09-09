import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api/health",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir recursos estáticos y API
  const isStatic =
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/") ||
    /\.(png|jpg|jpeg|svg|ico|webp|gif|css|js|map)$/.test(pathname);
  if (isStatic) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  // Redirigir a login si no hay sesión
  const signin = new URL("/signin", req.url);
  const cb = req.nextUrl.pathname + req.nextUrl.search;
  signin.searchParams.set("callbackUrl", cb);
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: ["/:path*"],
};
