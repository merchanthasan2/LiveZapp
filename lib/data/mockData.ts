/**
 * lib/data/mockData.ts
 *
 * UI/analytics mock data — traffic, testimonials, and dashboard rows.
 * Plan data has moved to `types/plans.ts` (canonical source).
 * Rich domain presentation data lives in `mock/sampleData.ts`.
 *
 * Replace with real Firebase/API calls in future phases.
 */

import type { TrafficMetric, Testimonial, DashboardPresentation } from '@/types'

// ── Dashboard presentation rows (lightweight display type) ────────────────
export const MOCK_PRESENTATIONS: DashboardPresentation[] = [
  {
    id: 'pres_quiz_1',
    title: 'Friday Team Quiz',
    questionsCount: 2,
    lastActivity: '2026-03-13T08:00:00Z',
    status: 'draft',
    audienceSize: 0,
  },
  {
    id: 'pres_qa_1',
    title: 'Town Hall Q&A',
    questionsCount: 1,
    lastActivity: '2026-03-12T14:30:00Z',
    status: 'scheduled',
    audienceSize: 0,
  },
  {
    id: 'pres_feedback_1',
    title: 'Workshop Feedback',
    questionsCount: 2,
    lastActivity: '2026-03-10T10:00:00Z',
    status: 'draft',
    audienceSize: 0,
  },
  {
    id: 'pres-004',
    title: 'Customer Discovery Workshop',
    questionsCount: 3,
    lastActivity: '2026-03-13T11:00:00Z',
    status: 'live',
    audienceSize: 18,
  },
]

// ── Mock Traffic Metrics (last 30 days) ───────────────────────────────────
export const MOCK_TRAFFIC: TrafficMetric[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, 12 + i)
  return {
    date: date.toISOString().split('T')[0],
    visitsLiveZapp: Math.floor(120 + Math.sin(i / 3) * 80 + i * 4),
    visitsQuantumStep: Math.floor(200 + Math.cos(i / 4) * 100 + i * 7),
  }
})

// ── Testimonials ──────────────────────────────────────────────────────────
export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-001',
    quote:
      'LiveZapp transformed how I run workshops. Real-time polls keep everyone involved — the energy in the room is completely different now.',
    author: 'Priya Sharma',
    role: 'Learning & Development Lead',
    company: 'TechBridge Solutions',
  },
  {
    id: 'test-002',
    quote:
      'Set up my first interactive presentation in under ten minutes. The audience loved it and I finally got honest feedback without awkward silences.',
    author: 'Marcus Webb',
    role: 'Head of Product',
    company: 'Horizon Labs',
  },
]
