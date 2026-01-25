import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserById } from '@/lib/services/users';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify the session cookie
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const user = await getUserById(uid);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);
    
    return NextResponse.json(
      { error: 'Session expired' },
      { status: 401 }
    );
  }
}
