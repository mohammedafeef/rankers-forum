import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    // Clear the session cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // Optionally revoke the session (useful if you want to invalidate all sessions)
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie);
        await adminAuth.revokeRefreshTokens(decoded.uid);
      } catch {
        // Session might already be invalid, which is fine
      }
    }

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear the cookie even if there's an error
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  }
}
