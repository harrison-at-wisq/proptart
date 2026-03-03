import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase-server';

export async function middleware(request: NextRequest) {
  try {
    const { supabase, response } = createSupabaseMiddlewareClient(request);

    // Refresh session if it exists
    const { data: { user } } = await supabase.auth.getUser();

    const isLoggedIn = !!user;
    const isLoginPage = request.nextUrl.pathname === '/login';
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
    const isAuthCallback = request.nextUrl.pathname === '/auth/callback';
    const isMicrositeRoute = request.nextUrl.pathname.startsWith('/m/');

    // Allow auth callback to pass through
    if (isAuthCallback) {
      return response;
    }

    // Allow API routes (they'll check auth internally if needed)
    if (isApiRoute) {
      return response;
    }

    // Allow public microsite routes (no auth required)
    if (isMicrositeRoute) {
      return response;
    }

    // Redirect logged-in users away from login page
    if (isLoginPage && isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Redirect non-logged-in users to login
    if (!isLoginPage && !isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request through rather than crashing
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.svg, and public assets (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.ico$).*)',
  ],
};
