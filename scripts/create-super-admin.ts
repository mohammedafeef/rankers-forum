/**
 * Super Admin Setup Script
 * 
 * This script creates a super admin user in Firebase.
 * Run with: npx ts-node --skip-project scripts/create-super-admin.ts
 * 
 * Or add to package.json scripts:
 * "create-super-admin": "tsx scripts/create-super-admin.ts"
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin
function initFirebase() {
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase Admin SDK credentials in .env.local');
    console.log('Required variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function createSuperAdmin() {
  console.log('\n🔐 Super Admin Setup\n');
  console.log('This will create a super admin user who can manage the entire platform.\n');

  initFirebase();

  const auth = getAuth();
  const db = getFirestore();

  // Get user input
  const email = await prompt('Email: ');
  const password = await prompt('Password (min 6 chars): ');
  const firstName = await prompt('First Name: ');
  const lastName = await prompt('Last Name: ');
  const phone = await prompt('Phone Number: ');

  if (!email || !password || !firstName || !lastName) {
    console.error('❌ All fields are required');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }

  try {
    console.log('\n⏳ Creating super admin...');

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    console.log(`✅ Firebase Auth user created: ${userRecord.uid}`);

    const now = Timestamp.now();

    // Create user document
    await db.collection('users').doc(userRecord.uid).set({
      role: 'super_admin',
      firstName,
      lastName,
      email,
      phone,
      city: '',
      state: '',
      isActive: true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });

    console.log('✅ User document created in Firestore');

    // Create admin profile
    await db.collection('admin_profiles').doc(userRecord.uid).set({
      userId: userRecord.uid,
      employeeNumber: 'SA001',
      dateOfBirth: null,
      dateOfJoining: now,
      jobTitle: 'Super Admin',
      jobType: 'full_time',
      maritalStatus: '',
      bloodGroup: '',
      nationality: 'India',
      noticePeriod: '1 Month',
      maxActiveLeads: 100,
      activeLeadCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    console.log('✅ Admin profile created');

    console.log('\n🎉 Super Admin created successfully!\n');
    console.log('Login details:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: (the one you entered)`);
    console.log(`  Role: super_admin`);
    console.log('\nYou can now login at /super-admin/dashboard');

  } catch (error: unknown) {
    console.error('\n❌ Error creating super admin:', error);
    
    if ((error as { code?: string }).code === 'auth/email-already-exists') {
      console.log('\nThe email is already registered. You can:');
      console.log('1. Use a different email');
      console.log('2. Delete the existing user from Firebase Console and try again');
    }
    
    process.exit(1);
  }

  process.exit(0);
}

createSuperAdmin();
