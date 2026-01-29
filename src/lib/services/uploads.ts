import * as XLSX from 'xlsx';
import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import {
  ExcelUploadLog,
  CollegeRankCutoff,
} from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { bulkCreateCutoffs, deleteCutoffsByYear, syncLocations } from './colleges';

const uploadsCollection = adminDb.collection(COLLECTIONS.EXCEL_UPLOAD_LOGS);

// Expected column headers in the Excel file
const EXPECTED_COLUMNS = [
  'College Name',
  'Category',
  'Course Name',
  'Course Code',
  'All India Rank',
  'Course Fee',
] as const;

interface ExcelRow {
  'College Name': string;
  'Location'?: string;
  'Type'?: string;
  'Category': string;
  'Course Name': string;
  'Course Code': string;
  'All India Rank': number;
  'Course Fee'?: number;
}

interface NormalizedCutoff {
  collegeName: string;
  collegeLocation: string;
  collegeType: string;
  courseName: string;
  courseCode: string;
  courseFee: number;
  category: string;
  rank: number;
  year: number;
}

/**
 * Validate Excel row
 */
function validateRow(row: Record<string, unknown>, rowIndex: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row['College Name']) {
    errors.push(`Row ${rowIndex}: Missing College Name`);
  }

  if (!row['Category']) {
    errors.push(`Row ${rowIndex}: Missing Category`);
  }
  if (!row['Course Name']) {
    errors.push(`Row ${rowIndex}: Missing Course Name`);
  }
  if (!row['Course Code']) {
    errors.push(`Row ${rowIndex}: Missing Course Code`);
  }
  if (!row['All India Rank'] || isNaN(Number(row['All India Rank']))) {
    errors.push(`Row ${rowIndex}: Invalid All India Rank`);
  }
  if (!row['Course Fee'] || isNaN(Number(row['Course Fee']))) {
    errors.push(`Row ${rowIndex}: Invalid Course Fee`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Normalize Excel data in memory - takes LAST occurrence for each unique combination
 */
function normalizeExcelData(rows: ExcelRow[], year: number): NormalizedCutoff[] {
  const map = new Map<string, NormalizedCutoff>();

  for (const row of rows) {
    // Create unique key for deduplication
    const key = `${row['College Name']}|${row['Course Name']}|${row['Category']}`;

    // Always overwrite with later row (last wins)
    map.set(key, {
      collegeName: row['College Name'],
      collegeLocation: row['Location']?.trim() || '',
      collegeType: row['Type']?.trim() || '', // Store as-is, no normalization
      courseName: row['Course Name'],
      courseCode: row['Course Code'],
      courseFee: Number(row['Course Fee']),
      category: row['Category'],
      rank: Number(row['All India Rank']),
      year,
    });
  }

  return Array.from(map.values());
}

/**
 * Extract unique locations from rows
 */
function extractLocations(rows: ExcelRow[]): string[] {
  const locations = new Set<string>();

  for (const row of rows) {
    const location = row['Location']?.trim();
    if (location) {
      locations.add(location);
    }
  }

  return Array.from(locations);
}

/**
 * Create upload log
 */
export async function createUploadLog(
  uploadedBy: string,
  year: number,
  fileName: string,
  totalRows: number
): Promise<ExcelUploadLog> {
  const now = Timestamp.now();

  const log: Omit<ExcelUploadLog, 'id'> = {
    uploadedBy,
    year,
    fileName,
    totalRows,
    processedRows: 0,
    failedRows: 0,
    errorLog: [],
    status: 'processing',
    createdAt: now,
    completedAt: null,
  };

  const docRef = await uploadsCollection.add(log);

  return { id: docRef.id, ...log } as ExcelUploadLog;
}

/**
 * Update upload log progress
 */
export async function updateUploadLog(
  id: string,
  data: Partial<ExcelUploadLog>
): Promise<void> {
  await uploadsCollection.doc(id).update(data);
}

/**
 * Process Excel file for college data upload - OPTIMIZED with bulk operations
 */
export async function processExcelUpload(
  buffer: Buffer,
  uploadedBy: string,
  fileName: string,
  year: number
): Promise<ExcelUploadLog> {
  // Parse Excel file
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

  if (rows.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Validate headers
  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  const missingColumns = EXPECTED_COLUMNS.filter(col => !headers.includes(col));

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Create upload log
  const uploadLog = await createUploadLog(uploadedBy, year, fileName, rows.length);

  const errorLog: string[] = [];
  let validRows: ExcelRow[] = [];
  let failedRows = 0;

  try {
    // Step 1: Validate all rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // Excel rows are 1-indexed, plus header

      const validation = validateRow(row as unknown as Record<string, unknown>, rowIndex);

      if (!validation.valid) {
        errorLog.push(...validation.errors);
        failedRows++;
      } else {
        validRows.push(row);
      }
    }

    // Step 2: Normalize data in memory (take last occurrence for duplicates)
    const normalizedData = normalizeExcelData(validRows, year);

    // Step 3: Extract unique locations
    const locations = extractLocations(rows);

    // Step 4: Delete existing cutoffs for this year (replace mode)
    await deleteCutoffsByYear(year);

    // Step 5: Bulk insert normalized cutoffs
    const cutoffsToInsert: Omit<CollegeRankCutoff, 'id' | 'createdAt'>[] = normalizedData.map(item => ({
      collegeName: item.collegeName,
      collegeLocation: item.collegeLocation,
      collegeType: item.collegeType as CollegeRankCutoff['collegeType'],
      courseName: item.courseName,
      courseCode: item.courseCode,
      year: item.year,
      category: item.category,
      rank: item.rank,
    }));

    const insertedCount = await bulkCreateCutoffs(cutoffsToInsert);

    // Step 6: Sync locations
    await syncLocations(locations);

    // Final update
    await updateUploadLog(uploadLog.id, {
      processedRows: insertedCount,
      failedRows,
      errorLog,
      status: failedRows === rows.length ? 'failed' : 'completed',
      completedAt: Timestamp.now(),
    });

    return {
      ...uploadLog,
      processedRows: insertedCount,
      failedRows,
      errorLog,
      status: failedRows === rows.length ? 'failed' : 'completed',
      completedAt: Timestamp.now(),
    };
  } catch (error) {
    await updateUploadLog(uploadLog.id, {
      status: 'failed',
      errorLog: [...errorLog, (error as Error).message],
      completedAt: Timestamp.now(),
    });

    throw error;
  }
}

/**
 * Get upload logs with optional filters
 */
export async function getUploadLogs(options: {
  year?: number;
  status?: ExcelUploadLog['status'];
  limit?: number;
} = {}): Promise<ExcelUploadLog[]> {
  let query = uploadsCollection.orderBy('createdAt', 'desc');

  if (options.year) {
    query = query.where('year', '==', options.year);
  }

  if (options.status) {
    query = query.where('status', '==', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const snapshot = await query.get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExcelUploadLog));
}

/**
 * Get upload log by ID
 */
export async function getUploadLogById(id: string): Promise<ExcelUploadLog | null> {
  const doc = await uploadsCollection.doc(id).get();

  if (!doc.exists) {
    return null;
  }

  return { id: doc.id, ...doc.data() } as ExcelUploadLog;
}
