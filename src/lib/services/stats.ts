import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import { DashboardStats } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const statsDoc = adminDb.collection(COLLECTIONS.DASHBOARD_STATS).doc('global');

/**
 * Initialize dashboard stats if they don't exist
 */
export async function initializeStats(): Promise<void> {
  const doc = await statsDoc.get();
  
  if (!doc.exists) {
    await statsDoc.set({
      totalRegistrations: 0,
      totalInfoFilled: 0,
      totalRequests: 0,
      pendingCallbacks: 0,
      updatedAt: Timestamp.now(),
    });
  }
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const doc = await statsDoc.get();
  
  if (!doc.exists) {
    await initializeStats();
    return {
      id: 'global',
      totalRegistrations: 0,
      totalInfoFilled: 0,
      totalRequests: 0,
      pendingCallbacks: 0,
      updatedAt: Timestamp.now(),
    };
  }
  
  return { id: 'global', ...doc.data() } as DashboardStats;
}

/**
 * Increment a specific stat
 */
export async function incrementStat(
  stat: keyof Omit<DashboardStats, 'id' | 'updatedAt'>,
  amount: number = 1
): Promise<void> {
  await statsDoc.update({
    [stat]: FieldValue.increment(amount),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Decrement a specific stat
 */
export async function decrementStat(
  stat: keyof Omit<DashboardStats, 'id' | 'updatedAt'>,
  amount: number = 1
): Promise<void> {
  await statsDoc.update({
    [stat]: FieldValue.increment(-amount),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Recalculate all stats from scratch (utility function)
 */
export async function recalculateStats(): Promise<DashboardStats> {
  const [usersSnap, studentsSnap, leadsSnap, pendingSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.USERS).where('role', '==', 'student').count().get(),
    adminDb.collection(COLLECTIONS.STUDENTS).where('isProfileComplete', '==', true).count().get(),
    adminDb.collection(COLLECTIONS.LEADS).count().get(),
    adminDb.collection(COLLECTIONS.LEADS).where('status', 'in', ['assigned', 'in_progress']).count().get(),
  ]);
  
  const stats: Omit<DashboardStats, 'id'> = {
    totalRegistrations: usersSnap.data().count,
    totalInfoFilled: studentsSnap.data().count,
    totalRequests: leadsSnap.data().count,
    pendingCallbacks: pendingSnap.data().count,
    updatedAt: Timestamp.now(),
  };
  
  await statsDoc.set(stats);
  
  return { id: 'global', ...stats };
}
