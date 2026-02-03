import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getUserById } from '@/lib/services/users';
import { getStudentByUserId } from '@/lib/services/students';
import { createLead, getLeads } from '@/lib/services/leads';
import { COLLECTIONS } from '@/lib/constants';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Helper to verify student session
 */
async function verifyStudentSession(request: NextRequest): Promise<{ uid: string; user: ReturnType<typeof getUserById> extends Promise<infer T> ? T : never } | null> {
  const sessionCookie = request.cookies.get('session')?.value;
  
  if (!sessionCookie) {
    return null;
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const user = await getUserById(decoded.uid);
    
    if (!user || user.role !== 'student') {
      return null;
    }
    
    return { uid: decoded.uid, user };
  } catch {
    return null;
  }
}

/**
 * GET /api/students/callback - Get current student's callback request status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifyStudentSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if student has any callback request
    const leads = await getLeads({
      status: undefined, // All statuses
    });

    const studentLeads = leads.filter(lead => lead.studentId === session.uid);
    const hasCallback = studentLeads.some(lead => lead.callbackRequested);
    const pendingCallback = studentLeads.find(lead => 
      lead.callbackRequested && 
      !['completed', 'closed'].includes(lead.status)
    );

    return NextResponse.json({
      hasCallback,
      pendingCallback: pendingCallback ? {
        id: pendingCallback.id,
        status: pendingCallback.status,
        createdAt: pendingCallback.createdAt,
      } : null,
    });
  } catch (error) {
    console.error('Get callback status error:', error);
    return NextResponse.json({ error: 'Failed to get callback status' }, { status: 500 });
  }
}

/**
 * POST /api/students/callback - Create a callback request
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyStudentSession(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { uid, user } = session;

    // Check if student has profile
    const student = await getStudentByUserId(uid);
    
    if (!student) {
      return NextResponse.json({ 
        error: 'Student profile not found', 
        requiresProfile: true 
      }, { status: 400 });
    }

    // Check if there's already a pending callback request
    const leadsCollection = adminDb.collection(COLLECTIONS.LEADS);
    const existingLeadSnapshot = await leadsCollection
      .where('studentId', '==', uid)
      .where('callbackRequested', '==', true)
      .where('status', 'in', ['new', 'assigned', 'in_progress'])
      .limit(1)
      .get();

    if (!existingLeadSnapshot.empty) {
      return NextResponse.json({ 
        error: 'You already have a pending callback request',
        existingCallback: true,
      }, { status: 409 });
    }

    // Create a new lead with callback requested
    const lead = await createLead({
      studentId: uid,
      studentName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      studentPhone: user?.phone || '',
      studentEmail: user?.email || '',
      studentLocation: `${user?.city || ''}, ${user?.state || ''}`.replace(/^, |, $/g, ''),
      rankUsed: student.rank || 0,
      preferredBranch: student.preferredBranch || '',
      year: student.yearOfPassing || new Date().getFullYear(),
    });

    // Update the lead to mark callback as requested
    await leadsCollection.doc(lead.id).update({
      callbackRequested: true,
      updatedAt: Timestamp.now(),
    });

    // Update dashboard stats
    const statsDoc = adminDb.collection(COLLECTIONS.DASHBOARD_STATS).doc('global');
    await statsDoc.update({
      totalCallbacks: FieldValue.increment(1),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Callback request submitted successfully',
      leadId: lead.id,
    });
  } catch (error) {
    console.error('Create callback error:', error);
    return NextResponse.json({ error: 'Failed to create callback request' }, { status: 500 });
  }
}
