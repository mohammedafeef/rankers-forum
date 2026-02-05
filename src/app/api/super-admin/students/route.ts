import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getUserById } from '@/lib/services/users';
import { COLLECTIONS } from '@/lib/constants';

/**
 * Helper to verify super admin session
 */
async function verifySuperAdminSession(request: NextRequest): Promise<string | null> {
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const user = await getUserById(decoded.uid);

    if (!user || user.role !== 'super_admin') {
      return null;
    }

    return decoded.uid;
  } catch {
    return null;
  }
}

/**
 * GET /api/super-admin/students - Get all students with their user data
 * Query params: state (optional) - filter by state
 */
export async function GET(request: NextRequest) {
  try {
    const superAdminUid = await verifySuperAdminSession(request);

    if (!superAdminUid) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const stateFilter = searchParams.get('state');

    // Get all users with student role
    const usersCollection = adminDb.collection(COLLECTIONS.USERS);
    const studentsCollection = adminDb.collection(COLLECTIONS.STUDENTS);
    const leadsCollection = adminDb.collection(COLLECTIONS.LEADS);

    // Query users with student role
    let usersQuery = usersCollection.where('role', '==', 'student');

    if (stateFilter && stateFilter !== 'all') {
      usersQuery = usersQuery.where('state', '==', stateFilter);
    }

    const usersSnapshot = await usersQuery.get();

    const students = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Get student profile
      const studentDoc = await studentsCollection.doc(userDoc.id).get();
      const studentData = studentDoc.exists ? studentDoc.data() : null;

      // Check if student has any callback request
      const callbackSnapshot = await leadsCollection
        .where('studentId', '==', userDoc.id)
        .where('callbackRequested', '==', true)
        .limit(1)
        .get();

      const hasCallback = !callbackSnapshot.empty;

      students.push({
        id: userDoc.id,
        userId: userDoc.id,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        city: userData.city || '',
        state: userData.state || '',
        rank: studentData?.rank || null,
        institution: studentData?.institution || '',
        yearOfPassout: studentData?.yearOfPassing || null,
        domicileState: studentData?.domicileState || '',
        gender: studentData?.gender || '',
        category: studentData?.category || '',
        counsellingType: studentData?.counsellingType || '',
        preferredBranch: studentData?.preferredBranch || '',
        interestedLocations: [
          studentData?.locationPreference1,
          studentData?.locationPreference2,
          studentData?.locationPreference3,
        ].filter(Boolean),
        hasCallback,
      });
    }

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ error: 'Failed to get students' }, { status: 500 });
  }
}
