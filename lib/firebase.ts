'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const isTestEnv = process.env.NODE_ENV === 'test'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? (isTestEnv ? 'test-api-key' : undefined),
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    (isTestEnv ? 'livezapp-test.firebaseapp.com' : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? (isTestEnv ? 'livezapp-test' : undefined),
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (isTestEnv ? 'livezapp-test.appspot.com' : undefined),
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? (isTestEnv ? '000000000000' : undefined),
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    (isTestEnv ? '1:000000000000:web:0000000000000000000000' : undefined),
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    (isTestEnv ? 'https://livezapp-test-default-rtdb.firebaseio.com' : undefined),
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const storage = getStorage(app)

export default app
