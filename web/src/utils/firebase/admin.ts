import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Handle newline characters in the private key string correctly
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin Initialized successfully with credentials');
    } else {
      console.warn('FIREBASE_PRIVATE_KEY is missing. Firebase Admin will not have write access.');
      // Initialize with default credentials, may fail or have limited scope
      initializeApp();
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
  }
}

export const getAdminDb = () => {
  if (getApps().length > 0) {
    return getFirestore();
  }
  return null;
};

export const getAdminAuth = async () => {
  if (getApps().length > 0) {
    const { getAuth } = await import('firebase-admin/auth');
    return getAuth();
  }
  return null;
};
