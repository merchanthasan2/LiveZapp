import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
    ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

  if (projectId && clientEmail && privateKeyRaw) {
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n')
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    })
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({
      credential: applicationDefault(),
      databaseURL,
    })
  }

  throw new Error(
    'Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.',
  )
}

export function adminAuth() {
  return getAuth(getAdminApp())
}

export function adminDb() {
  return getDatabase(getAdminApp())
}
