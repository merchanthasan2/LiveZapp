'use client'

import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'

const isTestEnv = process.env.NODE_ENV === 'test'
const isDev = process.env.NODE_ENV === 'development'

const hasPublicFirebaseConfig = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
)

/** Use placeholder config in test, or in dev when .env is missing, so the app shell can render (auth/DB calls will fail until configured). */
const usePlaceholderConfig = isTestEnv || (isDev && !hasPublicFirebaseConfig)

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? (usePlaceholderConfig ? 'test-api-key' : undefined),
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    (usePlaceholderConfig ? 'livezapp-test.firebaseapp.com' : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? (usePlaceholderConfig ? 'livezapp-test' : undefined),
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    (usePlaceholderConfig ? 'livezapp-test.appspot.com' : undefined),
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? (usePlaceholderConfig ? '000000000000' : undefined),
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    (usePlaceholderConfig ? '1:000000000000:web:0000000000000000000000' : undefined),
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    (usePlaceholderConfig ? 'https://livezapp-test-default-rtdb.firebaseio.com' : undefined),
}

// Initialize Firebase (invalid/missing production keys would throw — dev placeholder avoids a blank screen during local setup)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
export const storage = getStorage(app)

export default app
