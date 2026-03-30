// components/question-editor/qtypes.ts
// Shared question-type catalogue used by both the wizard and the editor.

import { BarChart3, Cloud, MessageSquare, Sparkles, Star } from 'lucide-react'

export const Q_TYPES = [
  {
    kind:   'quiz' as const,
    label:  'Quiz',
    sub:    'Multiple choice with correct answer + timer',
    icon:   Sparkles,
    color:  '#00A6A6',
    bg:     'rgba(0,166,166,0.10)',
    border: 'rgba(0,166,166,0.22)',
  },
  {
    kind:   'poll' as const,
    label:  'Live Poll',
    sub:    'Multiple choice — live bar-chart results, no correct answer',
    icon:   BarChart3,
    color:  '#F08700',
    bg:     'rgba(240,135,0,0.10)',
    border: 'rgba(240,135,0,0.22)',
  },
  {
    kind:   'word_cloud' as const,
    label:  'Word Cloud',
    sub:    'Free-text words from the audience visualised as a cloud',
    icon:   Cloud,
    color:  '#8A7000',
    bg:     'rgba(239,202,8,0.14)',
    border: 'rgba(239,202,8,0.28)',
  },
  {
    kind:   'qa' as const,
    label:  'Q&A',
    sub:    'Open questions — audience asks, others upvote',
    icon:   MessageSquare,
    color:  '#00A6A6',
    bg:     'rgba(0,166,166,0.10)',
    border: 'rgba(0,166,166,0.22)',
  },
  {
    kind:   'feedback' as const,
    label:  'Rating / Feedback',
    sub:    'Star rating, NPS scale, or short text response',
    icon:   Star,
    color:  '#C07800',
    bg:     'rgba(244,159,10,0.12)',
    border: 'rgba(244,159,10,0.26)',
  },
] as const

export type QuestionKind = typeof Q_TYPES[number]['kind']

export function kindMeta(kind: QuestionKind) {
  return Q_TYPES.find(t => t.kind === kind)!
}

// Dark-theme values used inside participant preview
export const PREVIEW_META: Record<string, { bg: string; color: string; selectedBorder: string }> = {
  quiz:       { bg: 'rgba(0,166,166,0.18)',   color: '#00A6A6', selectedBorder: 'rgba(0,166,166,0.50)'   },
  poll:       { bg: 'rgba(240,135,0,0.18)',   color: '#F08700', selectedBorder: 'rgba(240,135,0,0.50)'   },
  word_cloud: { bg: 'rgba(239,202,8,0.18)',   color: '#EFCA08', selectedBorder: 'rgba(239,202,8,0.50)'   },
  qa:         { bg: 'rgba(0,166,166,0.18)',   color: '#00A6A6', selectedBorder: 'rgba(0,166,166,0.50)'   },
  feedback:   { bg: 'rgba(244,159,10,0.18)',  color: '#F49F0A', selectedBorder: 'rgba(244,159,10,0.50)'  },
}
