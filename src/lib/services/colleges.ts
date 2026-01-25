import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import { 
  College, 
  CreateCollegeInput, 
  CollegeRankCutoff, 
  CreateCutoffInput,
  CollegeWithChance,
  ChanceLevel,
  CollegeType,
} from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

const collegesCollection = adminDb.collection(COLLECTIONS.COLLEGES);
const cutoffsCollection = adminDb.collection(COLLECTIONS.COLLEGE_RANK_CUTOFFS);

/**
 * Calculate chance level based on student rank vs closing rank
 */
export function calculateChance(studentRank: number, closingRank: number): ChanceLevel {
  if (studentRank > closingRank) {
    return 'not_eligible';
  }
  
  const margin = closingRank - studentRank;
  const percentage = (margin / closingRank) * 100;
  
  if (percentage >= 20) return 'high';
  if (percentage >= 10) return 'moderate';
  return 'low';
}

/**
 * Get chance label for display
 */
export function getChanceLabel(chance: ChanceLevel): string {
  switch (chance) {
    case 'high': return 'High Chance';
    case 'moderate': return 'Moderate Chance';
    case 'low': return 'Low Chance';
    case 'not_eligible': return 'Not Eligible';
  }
}

/**
 * Create a new college
 */
export async function createCollege(data: CreateCollegeInput): Promise<College> {
  const now = Timestamp.now();
  
  const college: Omit<College, 'id'> = {
    ...data,
    shortName: data.shortName || null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await collegesCollection.add(college);
  
  return { id: docRef.id, ...college } as College;
}

/**
 * Get college by ID
 */
export async function getCollegeById(id: string): Promise<College | null> {
  const doc = await collegesCollection.doc(id).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return { id: doc.id, ...doc.data() } as College;
}

/**
 * Find college by name and location (for deduplication)
 */
export async function findCollegeByNameAndLocation(
  collegeName: string,
  location: string
): Promise<College | null> {
  const snapshot = await collegesCollection
    .where('collegeName', '==', collegeName)
    .where('location', '==', location)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as College;
}

/**
 * Create or get existing college
 */
export async function getOrCreateCollege(data: CreateCollegeInput): Promise<College> {
  const existing = await findCollegeByNameAndLocation(data.collegeName, data.location);
  
  if (existing) {
    return existing;
  }
  
  return createCollege(data);
}

/**
 * Get all colleges with optional filters
 */
export async function getColleges(options: {
  type?: CollegeType;
  state?: string;
  isActive?: boolean;
} = {}): Promise<College[]> {
  let query = collegesCollection.orderBy('collegeName');
  
  if (options.type) {
    query = query.where('type', '==', options.type);
  }
  
  if (options.state) {
    query = query.where('state', '==', options.state);
  }
  
  if (options.isActive !== undefined) {
    query = query.where('isActive', '==', options.isActive);
  }
  
  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as College));
}

/**
 * Create a rank cutoff entry
 */
export async function createCutoff(data: CreateCutoffInput): Promise<CollegeRankCutoff> {
  const now = Timestamp.now();
  
  const cutoff: Omit<CollegeRankCutoff, 'id'> = {
    ...data,
    createdAt: now,
  };

  const docRef = await cutoffsCollection.add(cutoff);
  
  return { id: docRef.id, ...cutoff } as CollegeRankCutoff;
}

/**
 * Find existing cutoff (for deduplication during upload)
 */
export async function findCutoff(
  collegeId: string,
  branch: string,
  year: number,
  category: string,
  quota: string
): Promise<CollegeRankCutoff | null> {
  const snapshot = await cutoffsCollection
    .where('collegeId', '==', collegeId)
    .where('branch', '==', branch)
    .where('year', '==', year)
    .where('category', '==', category)
    .where('quota', '==', quota)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as CollegeRankCutoff;
}

/**
 * Update an existing cutoff
 */
export async function updateCutoff(
  id: string,
  openingRank: number,
  closingRank: number
): Promise<void> {
  await cutoffsCollection.doc(id).update({
    openingRank,
    closingRank,
  });
}

/**
 * Get eligible colleges for a student based on their rank
 */
export async function getEligibleColleges(options: {
  studentRank: number;
  branch: string;
  category: string;
  quota: string;
  year: number;
  collegeType?: CollegeType;
  state?: string;
}): Promise<CollegeWithChance[]> {
  let query = cutoffsCollection
    .where('branch', '==', options.branch)
    .where('category', '==', options.category)
    .where('quota', '==', options.quota)
    .where('year', '==', options.year)
    .where('closingRank', '>=', options.studentRank)
    .orderBy('closingRank');
  
  if (options.collegeType) {
    query = query.where('collegeType', '==', options.collegeType);
  }
  
  const snapshot = await query.get();
  
  let results = snapshot.docs.map(doc => {
    const data = doc.data() as Omit<CollegeRankCutoff, 'id'>;
    const chance = calculateChance(options.studentRank, data.closingRank);
    
    return {
      id: doc.id,
      ...data,
      chance,
      chanceLabel: getChanceLabel(chance),
    } as CollegeWithChance;
  });
  
  // Filter by state if specified (need to filter in memory due to Firestore limitations)
  if (options.state) {
    results = results.filter(r => r.collegeLocation.includes(options.state!));
  }
  
  return results;
}

/**
 * Get previous year cutoffs for a student's rank
 */
export async function getPreviousYearCutoffs(options: {
  studentRank: number;
  branch: string;
  category: string;
  quota: string;
  currentYear: number;
  yearsBack?: number;
  collegeType?: CollegeType;
  state?: string;
}): Promise<Record<number, CollegeWithChance[]>> {
  const yearsBack = options.yearsBack || 2;
  const results: Record<number, CollegeWithChance[]> = {};
  
  for (let i = 1; i <= yearsBack; i++) {
    const year = options.currentYear - i;
    const colleges = await getEligibleColleges({
      studentRank: options.studentRank,
      branch: options.branch,
      category: options.category,
      quota: options.quota,
      year,
      collegeType: options.collegeType,
      state: options.state,
    });
    
    results[year] = colleges;
  }
  
  return results;
}

/**
 * Get cutoffs by year for admin view
 */
export async function getCutoffsByYear(year: number): Promise<CollegeRankCutoff[]> {
  const snapshot = await cutoffsCollection
    .where('year', '==', year)
    .orderBy('collegeName')
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollegeRankCutoff));
}

/**
 * Get distinct years available in the cutoffs data
 */
export async function getAvailableYears(): Promise<number[]> {
  // Firestore doesn't support DISTINCT, so we'll use a different approach
  // For now, return a fixed list - in production, consider maintaining a metadata document
  const snapshot = await cutoffsCollection
    .orderBy('year', 'desc')
    .limit(100)
    .get();
  
  const years = new Set<number>();
  snapshot.docs.forEach(doc => {
    years.add((doc.data() as CollegeRankCutoff).year);
  });
  
  return Array.from(years).sort((a, b) => b - a);
}
