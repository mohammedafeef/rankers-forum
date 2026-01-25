import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
];

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
  '/student': ['student'],
  '/admin': ['admin', 'super_admin'],
  '/super-admin': ['super_admin'],
  '/api/students': ['student'],
  '/api/admin': ['admin', 'super_admin'],
  '/api/super-admin': ['super_admin'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    // Special case: allow /api/auth routes
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next();
    }
  }

  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next();
  }

  // Check if route requires auth
  const isApiRoute = pathname.startsWith('/api/');
  const isProtectedPage = Object.keys(roleRoutes).some(
    route => pathname.startsWith(route)
  );

  if (!isApiRoute && !isProtectedPage) {
    // Public page
    return NextResponse.next();
  }

  // Get session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Redirect to home page for page routes
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For API routes, let the route handler verify the session
  // This is more efficient as we avoid verifying twice
  if (isApiRoute) {
    return NextResponse.next();
  }

  // For page routes, we need to verify the session here
  // But we can't call Firebase Admin from Edge middleware
  // So we'll let the layout handle verification and redirect
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
