import { adminDb, adminAuth } from '../firebase/admin';
import { COLLECTIONS, DEFAULT_MAX_ACTIVE_LEADS } from '../constants';
import { AdminProfile, CreateAdminInput, AdminWithUser, User } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const adminsCollection = adminDb.collection(COLLECTIONS.ADMIN_PROFILES);
const usersCollection = adminDb.collection(COLLECTIONS.USERS);
const statsDoc = adminDb.collection(COLLECTIONS.DASHBOARD_STATS).doc('global');

/**
 * Create a new admin user and profile
 */
export async function createAdmin(
  data: CreateAdminInput,
  password: string
): Promise<AdminWithUser> {
  const now = Timestamp.now();

  // Create Firebase Auth user
  const userRecord = await adminAuth.createUser({
    email: data.email,
    password: password,
    displayName: `${data.firstName} ${data.lastName}`,
  });

  const batch = adminDb.batch();

  // Create user document
  const user: Omit<User, 'id'> = {
    role: 'admin',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    city: '',
    state: '',
    isActive: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };

  batch.set(usersCollection.doc(userRecord.uid), user);

  // Create admin profile
  const adminProfile: Omit<AdminProfile, 'userId'> = {
    employeeNumber: data.employeeNumber,
    dateOfJoining: now,
    jobTitle: data.jobTitle,
    jobType: data.jobType,
    noticePeriod: '',
    dateOfBirth: now, // Will be updated later
    gender: 'male', // Default, will be updated later
    maritalStatus: '',
    bloodGroup: '',
    nationality: 'India',
    maxActiveLeads: data.maxActiveLeads || DEFAULT_MAX_ACTIVE_LEADS,
    currentActiveLeads: 0,
    isAvailable: true,
    createdAt: now,
    updatedAt: now,
  };

  batch.set(adminsCollection.doc(userRecord.uid), adminProfile);

  await batch.commit();

  return {
    id: userRecord.uid,
    ...user,
    profile: { userId: userRecord.uid, ...adminProfile },
  } as AdminWithUser;
}

/**
 * Get an admin profile by user ID
 */
export async function getAdminByUserId(userId: string): Promise<AdminProfile | null> {
  const doc = await adminsCollection.doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  return { userId: doc.id, ...doc.data() } as AdminProfile;
}

/**
 * Get admin with user data
 */
export async function getAdminWithUser(userId: string): Promise<AdminWithUser | null> {
  const [userDoc, adminDoc] = await Promise.all([
    usersCollection.doc(userId).get(),
    adminsCollection.doc(userId).get(),
  ]);

  if (!userDoc.exists || !adminDoc.exists) {
    return null;
  }

  return {
    id: userDoc.id,
    ...userDoc.data(),
    profile: { userId: adminDoc.id, ...adminDoc.data() },
  } as AdminWithUser;
}

/**
 * Get all admins with their user data
 */
export async function getAllAdmins(): Promise<AdminWithUser[]> {
  // Only get admin role users, exclude super_admin
  const usersSnapshot = await usersCollection
    .where('role', '==', 'admin')
    .get();

  const admins: AdminWithUser[] = [];;

  for (const userDoc of usersSnapshot.docs) {
    const adminDoc = await adminsCollection.doc(userDoc.id).get();

    if (adminDoc.exists) {
      admins.push({
        id: userDoc.id,
        ...userDoc.data(),
        profile: { userId: adminDoc.id, ...adminDoc.data() },
      } as AdminWithUser);
    }
  }

  return admins;
}

/**
 * Get available admins for lead assignment
 */
export async function getAvailableAdmins(): Promise<AdminWithUser[]> {
  const adminsSnapshot = await adminsCollection
    .where('isAvailable', '==', true)
    .get();

  const availableAdmins: AdminWithUser[] = [];

  for (const adminDoc of adminsSnapshot.docs) {
    const adminData = adminDoc.data() as Omit<AdminProfile, 'userId'>;

    // Check if admin has capacity
    if (adminData.currentActiveLeads < adminData.maxActiveLeads) {
      const userDoc = await usersCollection.doc(adminDoc.id).get();

      // Filter out super_admin users - only include regular admins
      if (userDoc.exists && (userDoc.data() as User).isActive && (userDoc.data() as User).role === 'admin') {
        availableAdmins.push({
          id: userDoc.id,
          ...userDoc.data(),
          profile: { userId: adminDoc.id, ...adminData },
        } as AdminWithUser);
      }
    }
  }

  return availableAdmins;
}

/**
 * Update admin profile
 */
export async function updateAdminProfile(
  userId: string,
  data: Partial<Omit<AdminProfile, 'userId' | 'createdAt'>>
): Promise<void> {
  await adminsCollection.doc(userId).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Set admin availability
 */
export async function setAdminAvailability(
  userId: string,
  isAvailable: boolean
): Promise<void> {
  await adminsCollection.doc(userId).update({
    isAvailable,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Deactivate an admin
 */
export async function deactivateAdmin(userId: string): Promise<void> {
  const batch = adminDb.batch();

  batch.update(usersCollection.doc(userId), {
    isActive: false,
    updatedAt: Timestamp.now(),
  });

  batch.update(adminsCollection.doc(userId), {
    isAvailable: false,
    updatedAt: Timestamp.now(),
  });

  await batch.commit();
}

/**
 * Activate an admin
 */
export async function activateAdmin(userId: string): Promise<void> {
  const batch = adminDb.batch();

  batch.update(usersCollection.doc(userId), {
    isActive: true,
    updatedAt: Timestamp.now(),
  });

  batch.update(adminsCollection.doc(userId), {
    isAvailable: true,
    updatedAt: Timestamp.now(),
  });

  await batch.commit();
}
