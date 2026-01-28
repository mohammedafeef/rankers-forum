import * as XLSX from 'xlsx';
import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import { 
  ExcelUploadLog, 
  CollegeType,
  CreateCollegeInput,
  CreateCutoffInput,
} from '@/types';
import { Timestamp } from 'firebase-admin/firestore';
import { getOrCreateCollege, findCutoff, createCutoff, updateCutoff } from './colleges';

const uploadsCollection = adminDb.collection(COLLECTIONS.EXCEL_UPLOAD_LOGS);

// Expected column headers in the Excel file
const EXPECTED_COLUMNS = [
  'College Name',
  'Category',
  'Course Name',
  'Course Code',
  'Rank',
  'Fee',
] as const;

interface ExcelRow {
  'College Name': string;
  'Location'?: string;
  'Type'?: string;
  'Category': string;
  'Course Name': string;
  'Course Code': string;
  'Rank': number;
  'Fee': number;
}

/**
 * Parse location (single field)
 */
function parseLocation(location?: string): string {
  if (!location || location.trim() === '') {
    return '';
  }
  
  return location.trim();
}

/**
 * Normalize college type from Excel
 */
function normalizeCollegeType(type?: string): CollegeType | undefined {
  if (!type || type.trim() === '') {
    return undefined; // Return undefined when no type provided
  }
  
  const normalized = type.toLowerCase().trim();
  
  if (normalized.includes('government') || normalized.includes('govt')) {
    return 'government';
  }
  if (normalized.includes('deemed')) {
    return 'deemed';
  }
  return 'private';
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
  if (!row['Rank'] || isNaN(Number(row['Rank']))) {
    errors.push(`Row ${rowIndex}: Invalid Rank`);
  }
  if (!row['Fee'] || isNaN(Number(row['Fee']))) {
    errors.push(`Row ${rowIndex}: Invalid Fee`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
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
 * Process Excel file for college data upload
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
  
  let processedRows = 0;
  let failedRows = 0;
  const errorLog: string[] = [];
  
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // Excel rows are 1-indexed, plus header
      
      try {
        // Validate row
        const validation = validateRow(row as unknown as Record<string, unknown>, rowIndex);
        
        if (!validation.valid) {
          errorLog.push(...validation.errors);
          failedRows++;
          continue;
        }
        
        // Parse location
        const location = parseLocation(row['Location']);
        const collegeType = normalizeCollegeType(row['Type']);
        
        // Get or create college
        const collegeInput: CreateCollegeInput = {
          collegeName: row['College Name'],
          location: location,
          city: '',
          state: '',
          type: collegeType,
        };
        
        const college = await getOrCreateCollege(collegeInput);
        
        // Check for existing cutoff
        const existingCutoff = await findCutoff(
          college.id,
          row['Course Name'],
          year,
          row['Category']
        );
        
        if (existingCutoff) {
          // Update existing cutoff
          await updateCutoff(
            existingCutoff.id,
            Number(row['Rank'])
          );
        } else {
          // Create new cutoff
          const cutoffInput: CreateCutoffInput = {
            collegeId: college.id,
            collegeName: college.collegeName,
            collegeLocation: college.location,
            collegeType: college.type,
            courseName: row['Course Name'],
            courseCode: row['Course Code'],
            year: year,
            category: row['Category'],
            rank: Number(row['Rank']),
          };
          
          await createCutoff(cutoffInput);
        }
        
        processedRows++;
        
        // Update progress every 50 rows
        if (processedRows % 50 === 0) {
          await updateUploadLog(uploadLog.id, {
            processedRows,
            failedRows,
            errorLog,
          });
        }
      } catch (rowError) {
        errorLog.push(`Row ${rowIndex}: ${(rowError as Error).message}`);
        failedRows++;
      }
    }
    
    // Final update
    await updateUploadLog(uploadLog.id, {
      processedRows,
      failedRows,
      errorLog,
      status: failedRows === rows.length ? 'failed' : 'completed',
      completedAt: Timestamp.now(),
    });
    
    return {
      ...uploadLog,
      processedRows,
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
