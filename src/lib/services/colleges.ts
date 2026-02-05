import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import {
  CollegeRankCutoff,
  CollegeWithChance,
  ChanceLevel,
  CollegeType,
} from '@/types';
import { Timestamp } from 'firebase-admin/firestore';

const cutoffsCollection = adminDb.collection(COLLECTIONS.COLLEGE_RANK_CUTOFFS);
const locationsCollection = adminDb.collection(COLLECTIONS.LOCATIONS);
const coursesCollection = adminDb.collection(COLLECTIONS.COURSES);

// ============================================
// Chance Calculation
// ============================================

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

// ============================================
// Cutoff Functions
// ============================================

/**
 * Bulk create cutoffs using batched writes
 */
export async function bulkCreateCutoffs(
  cutoffs: Omit<CollegeRankCutoff, 'id' | 'createdAt'>[]
): Promise<number> {
  const BATCH_SIZE = 500;
  const now = Timestamp.now();
  let totalWritten = 0;

  for (let i = 0; i < cutoffs.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = cutoffs.slice(i, i + BATCH_SIZE);

    for (const cutoff of chunk) {
      const docRef = cutoffsCollection.doc();
      batch.set(docRef, {
        ...cutoff,
        createdAt: now,
      });
    }

    await batch.commit();
    totalWritten += chunk.length;
  }

  return totalWritten;
}

/**
 * Delete all cutoffs for a specific year
 */
export async function deleteCutoffsByYear(year: number): Promise<number> {
  const BATCH_SIZE = 500;
  let totalDeleted = 0;

  const snapshot = await cutoffsCollection
    .where('year', '==', year)
    .get();

  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);

    for (const doc of chunk) {
      batch.delete(doc.ref);
    }

    await batch.commit();
    totalDeleted += chunk.length;
  }

  return totalDeleted;
}

/**
 * Get eligible colleges for a student based on their rank
 */
export async function getEligibleColleges(options: {
  studentRank: number;
  courseName: string;
  category: string;
  year: number;
  quota?: string;
  collegeType?: CollegeType;
  locations?: string[];
}): Promise<{ primary: CollegeWithChance[]; others: CollegeWithChance[] }> {
  let baseQuery = cutoffsCollection
    .where('courseName', '==', options.courseName)
    .where('year', '==', options.year)
    // .where('category', '==', options.category)
    .where('rank', '>=', options.studentRank)
    .orderBy('rank')
    .limit(300);

  if (options.collegeType) {
    baseQuery = baseQuery.where('collegeType', '==', options.collegeType);
  }

  let query = baseQuery;
  if (options.locations && options.locations.length > 0) {
    query = baseQuery.where('collegeLocation', 'in', options.locations);
  }

  let snapshot = await query.get();
  let isFallback = false;

  // If we have location constraints and found few results, try without location constraints
  if (snapshot.size < 30 && options.locations && options.locations.length > 0) {
    snapshot = await baseQuery.get();
    isFallback = true;
  }

  const primary: CollegeWithChance[] = [];
  const others: CollegeWithChance[] = [];
  const locationSet = options.locations ? new Set(options.locations) : null;

  snapshot.docs.forEach(doc => {
    const data = doc.data() as Omit<CollegeRankCutoff, 'id'>;
    const chance = calculateChance(options.studentRank, data.rank);

    const college = {
      id: doc.id,
      ...data,
      chance,
      chanceLabel: getChanceLabel(chance),
    } as CollegeWithChance;

    // Distribute to primary or others list
    if (options.locations && options.locations.length > 0) {
      if (isFallback) {
        if (locationSet?.has(data.collegeLocation)) {
          primary.push(college);
        } else {
          others.push(college);
        }
      } else {
        primary.push(college);
      }
    } else {
      primary.push(college);
    }
  });

  return { primary, others };
}

/**
 * Get previous year cutoffs for a student's rank
 */

interface PreviousYearCutoffs {
  colleges: CollegeWithChance[];
  otherColleges: CollegeWithChance[];
  totalCount: number;
}
export async function getPreviousYearCutoffs(options: {
  studentRank: number;
  courseName: string;
  category: string;
  currentYear: number;
  yearsBack?: number;
  collegeType?: CollegeType;
  locations?: string[];
}): Promise<Record<number, PreviousYearCutoffs>> {
  const yearsBack = options.yearsBack || 2;
  const results: Record<number, PreviousYearCutoffs> = {};

  for (let i = 1; i <= yearsBack; i++) {
    const year = options.currentYear - i;
    const { primary, others } = await getEligibleColleges({
      studentRank: options.studentRank,
      courseName: options.courseName,
      category: options.category,
      year,
      collegeType: options.collegeType,
      locations: options.locations,
    });

    results[year] = {colleges: primary, otherColleges: others, totalCount: primary.length + others.length};
  }

  return results;
}

/**
 * Get cutoffs by year for admin view
 */
export async function getCutoffsByYear(year: number): Promise<CollegeRankCutoff[]> {
  const snapshot = await cutoffsCollection
    .where('year', '==', year)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CollegeRankCutoff));
}

/**
 * Get distinct years available in the cutoffs data
 */
export async function getAvailableYears(): Promise<number[]> {
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

// ============================================
// Location Functions
// ============================================

export interface Location {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Sync locations - clear existing and add new ones from the upload
 */
export async function syncLocations(locationNames: string[]): Promise<number> {
  const BATCH_SIZE = 500;

  // Get unique, non-empty locations
  const uniqueLocations = [...new Set(locationNames.filter(l => l && l.trim()))];

  // Clear existing locations
  const existingSnapshot = await locationsCollection.get();
  for (let i = 0; i < existingSnapshot.docs.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = existingSnapshot.docs.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  // Add new locations
  for (let i = 0; i < uniqueLocations.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = uniqueLocations.slice(i, i + BATCH_SIZE);

    for (const name of chunk) {
      const docRef = locationsCollection.doc();
      batch.set(docRef, {
        name: name.trim(),
        isActive: true,
      });
    }

    await batch.commit();
  }

  return uniqueLocations.length;
}

/**
 * Get all active locations
 */
export async function getLocations(): Promise<Location[]> {
  const snapshot = await locationsCollection
    .where('isActive', '==', true)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Location));
}

// ============================================
// Course Functions
// ============================================

export interface Course {
  id: string;
  name: string;
  isActive: boolean;
}

/**
 * Sync courses - check existing and add new ones from the upload
 */
export async function syncCourses(courseNames: string[]): Promise<number> {
  const BATCH_SIZE = 500;

  // Get unique, non-empty courses
  const uniqueCourses = [...new Set(courseNames.filter(l => l && l.trim()))];

  // Clear existing courses
  const existingSnapshot = await coursesCollection.get();
  for (let i = 0; i < existingSnapshot.docs.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = existingSnapshot.docs.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  // Add new courses
  for (let i = 0; i < uniqueCourses.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    const chunk = uniqueCourses.slice(i, i + BATCH_SIZE);

    for (const name of chunk) {
      const docRef = coursesCollection.doc();
      batch.set(docRef, {
        name: name.trim(),
        isActive: true,
      });
    }

    await batch.commit();
  }

  return uniqueCourses.length;
}

/**
 * Get all active courses
 */
export async function getCourses(): Promise<Course[]> {
  const snapshot = await coursesCollection
    .where('isActive', '==', true)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Course));
}
