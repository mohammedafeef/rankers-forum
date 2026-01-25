import { adminDb } from '../firebase/admin';
import { COLLECTIONS, MAX_COLLEGE_CHECKS } from '../constants';
import { Student, CreateStudentInput } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const studentsCollection = adminDb.collection(COLLECTIONS.STUDENTS);
const statsDoc = adminDb.collection(COLLECTIONS.DASHBOARD_STATS).doc('global');

/**
 * Create a new student profile
 */
export async function createStudent(
  userId: string,
  data: CreateStudentInput
): Promise<Student> {
  const now = Timestamp.now();
  
  const student: Omit<Student, 'userId'> = {
    ...data,
    checksUsed: 0,
    isProfileComplete: true,
    createdAt: now,
    updatedAt: now,
  };

  // Use batch to update student and stats atomically
  const batch = adminDb.batch();
  
  batch.set(studentsCollection.doc(userId), student);
  
  // Increment totalInfoFilled in stats
  batch.update(statsDoc, {
    totalInfoFilled: FieldValue.increment(1),
    updatedAt: now,
  });

  await batch.commit();
  
  return { userId, ...student } as Student;
}

/**
 * Get a student by their user ID
 */
export async function getStudentByUserId(userId: string): Promise<Student | null> {
  const doc = await studentsCollection.doc(userId).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return { userId: doc.id, ...doc.data() } as Student;
}

/**
 * Update a student's profile
 */
export async function updateStudent(
  userId: string,
  data: Partial<Omit<Student, 'userId' | 'createdAt' | 'checksUsed'>>
): Promise<void> {
  await studentsCollection.doc(userId).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Increment the checks used count for a student
 * Returns false if max checks already reached
 */
export async function incrementChecksUsed(userId: string): Promise<boolean> {
  const student = await getStudentByUserId(userId);
  
  if (!student) {
    throw new Error('Student not found');
  }
  
  if (student.checksUsed >= MAX_COLLEGE_CHECKS) {
    return false;
  }
  
  await studentsCollection.doc(userId).update({
    checksUsed: student.checksUsed + 1,
    updatedAt: Timestamp.now(),
  });
  
  return true;
}

/**
 * Check if a student can perform more college lookups
 */
export async function canPerformLookup(userId: string): Promise<boolean> {
  const student = await getStudentByUserId(userId);
  
  if (!student) {
    return false;
  }
  
  return student.checksUsed < MAX_COLLEGE_CHECKS;
}

/**
 * Get remaining checks for a student
 */
export async function getRemainingChecks(userId: string): Promise<number> {
  const student = await getStudentByUserId(userId);
  
  if (!student) {
    return 0;
  }
  
  return MAX_COLLEGE_CHECKS - student.checksUsed;
}

/**
 * Get all students with pagination
 */
export async function getStudents(
  limit: number = 20,
  startAfter?: string
): Promise<Student[]> {
  let query = studentsCollection
    .orderBy('createdAt', 'desc')
    .limit(limit);
  
  if (startAfter) {
    const startDoc = await studentsCollection.doc(startAfter).get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }
  
  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() } as Student));
}

/**
 * Count total students
 */
export async function countStudents(): Promise<number> {
  const snapshot = await studentsCollection.count().get();
  return snapshot.data().count;
}

/**
 * Count students with complete profiles
 */
export async function countCompletedProfiles(): Promise<number> {
  const snapshot = await studentsCollection
    .where('isProfileComplete', '==', true)
    .count()
    .get();
  
  return snapshot.data().count;
}
