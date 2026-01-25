import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getUserById } from '@/lib/services/users';
import { processExcelUpload, getUploadLogs } from '@/lib/services/uploads';

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
 * GET /api/super-admin/colleges/upload - Get upload history
 */
export async function GET(request: NextRequest) {
  try {
    const superAdminUid = await verifySuperAdminSession(request);
    
    if (!superAdminUid) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const limit = parseInt(searchParams.get('limit') || '20');

    const logs = await getUploadLogs({
      year: year ? parseInt(year) : undefined,
      limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get upload logs error:', error);
    return NextResponse.json({ error: 'Failed to get upload logs' }, { status: 500 });
  }
}

/**
 * POST /api/super-admin/colleges/upload - Upload Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const superAdminUid = await verifySuperAdminSession(request);
    
    if (!superAdminUid) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Upload .xlsx or .xls' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process the upload
    const result = await processExcelUpload(buffer, superAdminUid, file.name);

    return NextResponse.json({
      success: true,
      uploadId: result.id,
      totalRows: result.totalRows,
      processedRows: result.processedRows,
      failedRows: result.failedRows,
      status: result.status,
      errors: result.errorLog.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
