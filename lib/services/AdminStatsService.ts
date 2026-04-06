import { collection, getDocs } from 'firebase/firestore'
import { get, ref } from 'firebase/database'
import { db, rtdb } from '@/lib/firebase'
import { PLANS } from '@/types/plans'

export interface AdminOverviewStats {
  totalUsers: number
  activeUsers30d: number
  paidUsers: number
  suspendedUsers: number
  totalSessions: number
  liveSessions: number
  totalParticipants: number
  mrr: number
  planDist: { id: string; name: string; count: number; color: string; textColor: string }[]
  recentUsers: { name: string; email: string; planId: string; createdAt: string | null }[]
  source: 'firestore' | 'rtdb'
}

const DEFAULT_TIMEOUT_MS = 4500

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
    promise
      .then(value => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch(error => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

function toDateValue(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000)
  if (typeof value === 'number') return new Date(value)
  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function isActivePaidUser(u: any): boolean {
  if ((u?.planId ?? 'free') === 'free') return false
  const expires = toDateValue(u?.planExpiresAt)
  if (u?.planCancelledAt && !expires) return false
  return !!expires && expires.getTime() > Date.now()
}

function asNumber(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function buildOverviewFromData(
  allUsers: any[],
  allPresentations: any[],
  source: 'firestore' | 'rtdb'
): AdminOverviewStats {
  const now = Date.now()
  const in30days = 30 * 86400000

  const totalUsers = allUsers.length
  const activeUsers30d = allUsers.filter(u => {
    const d = toDateValue(u?.lastLoginAt)
    return d ? now - d.getTime() < in30days : false
  }).length
  const paidUsers = allUsers.filter(isActivePaidUser).length
  const suspendedUsers = allUsers.filter(u => !!u?.suspended).length

  const mrr = allUsers.filter(isActivePaidUser).reduce((sum, u) => {
    const plan = PLANS.find(p => p.id === (u?.planId ?? 'free'))
    if (!plan) return sum
    return sum + (u?.billingCycle === 'annual' ? plan.pricePerYear / 12 : plan.pricePerMonth)
  }, 0)

  const totalSessions = allPresentations.length
  const liveSessions = allPresentations.filter(p => p?.status === 'live' || p?.status === 'active').length
  const totalParticipants = allPresentations.reduce(
    (sum, p) => sum + asNumber(p?.audienceSize ?? p?.participantCount),
    0
  )

  const planDist = PLANS.map(plan => ({
    id: plan.id,
    name: plan.name,
    count: allUsers.filter(u => (u?.planId ?? 'free') === plan.id).length,
    color: plan.id === 'free' ? '#BBDEF0' : plan.id === 'basic' ? '#00A6A6' : plan.id === 'regular' ? '#EFCA08' : '#F08700',
    textColor: plan.id === 'free' || plan.id === 'regular' ? '#1A1A2E' : '#FFFFFF',
  }))

  const recentUsers = [...allUsers]
    .filter(u => !!toDateValue(u?.createdAt))
    .sort((a, b) => {
      const bDate = toDateValue(b?.createdAt)?.getTime() ?? 0
      const aDate = toDateValue(a?.createdAt)?.getTime() ?? 0
      return bDate - aDate
    })
    .slice(0, 5)
    .map(u => {
      const createdAt = toDateValue(u?.createdAt)
      return {
        name: u?.name ?? 'Unknown',
        email: u?.email ?? '-',
        planId: u?.planId ?? 'free',
        createdAt: createdAt ? createdAt.toISOString() : null,
      }
    })

  return {
    totalUsers,
    activeUsers30d,
    paidUsers,
    suspendedUsers,
    totalSessions,
    liveSessions,
    totalParticipants,
    mrr,
    planDist,
    recentUsers,
    source,
  }
}

async function loadFromFirestore(): Promise<AdminOverviewStats> {
  const [usersSnap, presentationsSnap] = await withTimeout(
    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'presentations')),
    ]),
    'Firestore admin overview fetch',
    7000,
  )

  if (usersSnap.empty && presentationsSnap.empty) {
    throw new Error('Firestore has no admin overview data yet')
  }

  const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  const presentations = presentationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return buildOverviewFromData(users, presentations, 'firestore')
}

async function loadFromRtdb(): Promise<AdminOverviewStats> {
  const [usersSnap, presSnap] = await withTimeout(
    Promise.all([get(ref(rtdb, 'users')), get(ref(rtdb, 'presentations'))]),
    'RTDB admin overview fetch',
  )

  const usersData = usersSnap.exists() ? (usersSnap.val() as Record<string, any>) : {}
  const presData = presSnap.exists() ? (presSnap.val() as Record<string, any>) : {}
  return buildOverviewFromData(Object.values(usersData), Object.values(presData), 'rtdb')
}

export async function loadAdminOverviewStats(): Promise<AdminOverviewStats> {
  let rtdbStats: AdminOverviewStats | null = null
  let rtdbError: unknown = null

  try {
    rtdbStats = await loadFromRtdb()
    const hasRtdbData = rtdbStats.totalUsers > 0 || rtdbStats.totalSessions > 0
    if (hasRtdbData) return rtdbStats
  } catch (error) {
    rtdbError = error
  }

  try {
    const firestoreStats = await loadFromFirestore()
    const hasFirestoreData = firestoreStats.totalUsers > 0 || firestoreStats.totalSessions > 0
    if (hasFirestoreData || !rtdbStats) return firestoreStats
  } catch (firestoreError) {
    if (rtdbError) {
      throw new Error('Failed to load admin overview from both RTDB and Firestore')
    }
    throw firestoreError
  }

  if (rtdbStats) return rtdbStats
  throw new Error('Admin overview data is unavailable')
}
