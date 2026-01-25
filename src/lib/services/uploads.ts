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
  'Location',
  'Type',
  'Branch',
  'Year',
  'Category',
  'Quota',
  'Opening Rank',
  'Closing Rank',
] as const;

interface ExcelRow {
  'College Name': string;
  'Location': string;
  'Type': string;
  'Branch': string;
  'Year': number;
  'Category': string;
  'Quota': string;
  'Opening Rank': number;
  'Closing Rank': number;
}

/**
 * Parse location into city and state
 */
function parseLocation(location: string): { city: string; state: string } {
  const parts = location.split(',').map(s => s.trim());
  
  if (parts.length >= 2) {
    return {
      city: parts[0],
      state: parts[parts.length - 1],
    };
  }
  
  return {
    city: location,
    state: '',
  };
}

/**
 * Normalize college type from Excel
 */
function normalizeCollegeType(type: string): CollegeType {
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
  if (!row['Location']) {
    errors.push(`Row ${rowIndex}: Missing Location`);
  }
  if (!row['Type']) {
    errors.push(`Row ${rowIndex}: Missing Type`);
  }
  if (!row['Branch']) {
    errors.push(`Row ${rowIndex}: Missing Branch`);
  }
  if (!row['Year'] || isNaN(Number(row['Year']))) {
    errors.push(`Row ${rowIndex}: Invalid Year`);
  }
  if (!row['Category']) {
    errors.push(`Row ${rowIndex}: Missing Category`);
  }
  if (!row['Quota']) {
    errors.push(`Row ${rowIndex}: Missing Quota`);
  }
  if (!row['Opening Rank'] || isNaN(Number(row['Opening Rank']))) {
    errors.push(`Row ${rowIndex}: Invalid Opening Rank`);
  }
  if (!row['Closing Rank'] || isNaN(Number(row['Closing Rank']))) {
    errors.push(`Row ${rowIndex}: Invalid Closing Rank`);
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
  fileName: string
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
  
  // Determine year from first row (assumes all rows are same year)
  const year = Number(rows[0]['Year']);
  
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
        const { city, state } = parseLocation(row['Location']);
        const collegeType = normalizeCollegeType(row['Type']);
        
        // Get or create college
        const collegeInput: CreateCollegeInput = {
          collegeName: row['College Name'],
          location: row['Location'],
          city,
          state,
          type: collegeType,
        };
        
        const college = await getOrCreateCollege(collegeInput);
        
        // Check for existing cutoff
        const existingCutoff = await findCutoff(
          college.id,
          row['Branch'],
          Number(row['Year']),
          row['Category'],
          row['Quota']
        );
        
        if (existingCutoff) {
          // Update existing cutoff
          await updateCutoff(
            existingCutoff.id,
            Number(row['Opening Rank']),
            Number(row['Closing Rank'])
          );
        } else {
          // Create new cutoff
          const cutoffInput: CreateCutoffInput = {
            collegeId: college.id,
            collegeName: college.collegeName,
            collegeLocation: college.location,
            collegeType: college.type,
            branch: row['Branch'],
            year: Number(row['Year']),
            category: row['Category'],
            quota: row['Quota'],
            openingRank: Number(row['Opening Rank']),
            closingRank: Number(row['Closing Rank']),
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
