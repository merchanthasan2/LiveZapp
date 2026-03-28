/**
 * lib/data/mockUsers.ts
 *
 * Hard-coded development accounts for pre-Firebase testing.
 * Replace the entire auth layer with Firebase in Phase 10.
 *
 *  admin@gmail.com / admin   → Super Admin (Pro plan)
 *  user1@gmail.com / user1   → Regular user (Free tier)
 *  user2@gmail.com / user2   → Regular user (Basic tier)
 */

import type { User } from '@/types/auth'

export interface MockCredential {
  email: string
  password: string
  user: User
}

export const MOCK_CREDENTIALS: MockCredential[] = [
  {
    email: 'admin@gmail.com',
    password: 'admin',
    user: {
      id: 'user_admin_1',
      name: 'Super Admin',
      email: 'admin@gmail.com',
      role: 'admin',
      planId: 'pro',
    },
  },
  {
    email: 'user1@gmail.com',
    password: 'user1',
    user: {
      id: 'user_free_1',
      name: 'User One',
      email: 'user1@gmail.com',
      role: 'user',
      planId: 'free',
    },
  },
  {
    email: 'user2@gmail.com',
    password: 'user2',
    user: {
      id: 'user_basic_1',
      name: 'User Two',
      email: 'user2@gmail.com',
      role: 'user',
      planId: 'basic',
    },
  },
]

/** Returns the matching User or null if credentials are wrong. */
export function findMockUser(email: string, password: string): User | null {
  const found = MOCK_CREDENTIALS.find(
    c => c.email.toLowerCase() === email.trim().toLowerCase() && c.password === password
  )
  return found?.user ?? null
}

export const SESSION_KEY = 'livezapp_mock_user'
