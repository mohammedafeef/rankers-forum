import { adminDb } from '../firebase/admin';
import { COLLECTIONS } from '../constants';
import { User, CreateUserInput, UserRole } from '@/types';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const usersCollection = adminDb.collection(COLLECTIONS.USERS);

/**
 * Create a new user document in Firestore
 */
export async function createUser(
  uid: string,
  data: CreateUserInput
): Promise<User> {
  const now = Timestamp.now();
  
  const user: Omit<User, 'id'> = {
    ...data,
    isActive: true,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };

  await usersCollection.doc(uid).set(user);
  
  return { id: uid, ...user } as User;
}

/**
 * Get a user by their UID
 */
export async function getUserById(uid: string): Promise<User | null> {
  const doc = await usersCollection.doc(uid).get();
  
  if (!doc.exists) {
    return null;
  }
  
  return { id: doc.id, ...doc.data() } as User;
}

/**
 * Get a user by their email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const snapshot = await usersCollection
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
}

/**
 * Update a user's profile
 */
export async function updateUser(
  uid: string,
  data: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<void> {
  await usersCollection.doc(uid).update({
    ...data,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  uid: string,
  role: UserRole
): Promise<void> {
  await usersCollection.doc(uid).update({
    role,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Deactivate a user account
 */
export async function deactivateUser(uid: string): Promise<void> {
  await usersCollection.doc(uid).update({
    isActive: false,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Activate a user account
 */
export async function activateUser(uid: string): Promise<void> {
  await usersCollection.doc(uid).update({
    isActive: true,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Get all users by role
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const snapshot = await usersCollection
    .where('role', '==', role)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
}

/**
 * Count users by role
 */
export async function countUsersByRole(role: UserRole): Promise<number> {
  const snapshot = await usersCollection
    .where('role', '==', role)
    .count()
    .get();
  
  return snapshot.data().count;
}
