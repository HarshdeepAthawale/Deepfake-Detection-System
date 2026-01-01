import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/api"]
  
  // Check if the route is public
  const isPublicRoute = pathname === "/" || pathname.startsWith("/api")
  
  // Protected routes
  const protectedRoutes = ["/dashboard", "/scanner", "/vault"]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Get token from cookie (we'll also check localStorage on client side)
  const token = request.cookies.get("auth_token")?.value

  // If accessing a protected route without a token, redirect to login
  // Note: Since we're using localStorage (client-side), we also need client-side protection
  // This middleware provides server-side protection for cookie-based auth
  if (isProtectedRoute && !token) {
    // For now, we'll let client-side handle the redirect since we use localStorage
    // In production, you might want to use httpOnly cookies for better security
    return NextResponse.next()
  }

  // If accessing login page while authenticated, redirect to dashboard
  if (pathname === "/" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

