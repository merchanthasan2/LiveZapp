// types/domain.ts
// Core domain interfaces — single source of truth for all presentation/question data.

export type PresentationType = 'quiz' | 'poll' | 'word_cloud' | 'qa' | 'feedback'

export type PresentationStatus = 'draft' | 'scheduled' | 'live' | 'completed'

// ─── Question base ────────────────────────────────────────────────────────

export interface BaseQuestion {
  id: string
  prompt: string
  orderIndex: number
  isRequired: boolean
}

export interface Option {
  id: string
  label: string
}

// ─── Quiz question ────────────────────────────────────────────────────────

export interface QuizQuestion extends BaseQuestion {
  kind: 'quiz'
  options: Option[]
  timerSeconds: number // 10–120
  correctOptionId: string
  points: number // base score
}

// ─── Q&A question ─────────────────────────────────────────────────────────

export interface QAQuestion extends BaseQuestion {
  kind: 'qa'
  allowMultipleSubmissions: boolean
}

// ─── Feedback question ────────────────────────────────────────────────────

export type FeedbackQuestionType =
  | 'rating'
  | 'multiple_choice'
  | 'short_text'
  | 'long_text'

export interface FeedbackQuestion extends BaseQuestion {
  kind: 'feedback'
  feedbackType: FeedbackQuestionType
  options?: Option[]   // only for rating / multiple_choice
  scaleMax?: number    // for rating (e.g. 5 or 10)
}

// ─── Poll question ────────────────────────────────────────────────────────

export interface PollQuestion extends BaseQuestion {
  kind: 'poll'
  options: Option[]
  allowMultipleSelections: boolean
}

// ─── Word cloud question ──────────────────────────────────────────────────

export interface WordCloudQuestion extends BaseQuestion {
  kind: 'word_cloud'
  maxWordsPerResponse: number  // how many words each participant can submit (1–5)
}

export type Question = QuizQuestion | QAQuestion | FeedbackQuestion | PollQuestion | WordCloudQuestion

// ─── Question set ─────────────────────────────────────────────────────────

export interface QuestionSet {
  id: string
  presentationId: string
  presentationType: PresentationType
  title: string
  questions: Question[]
}

// ─── Branding ─────────────────────────────────────────────────────────────

export interface BrandingConfig {
  brandName: string        // Presenter/individual name shown to participants
  companyName: string      // Organization/company name shown to participants
  logoUrl: string          // Publicly accessible image URL
  accentColor: string      // Hex color for buttons/highlights in participant view
  showPoweredBy: boolean   // Whether "Powered by LiveZapp" footer is visible
}

export const DEFAULT_BRANDING: BrandingConfig = {
  brandName: '',
  companyName: '',
  logoUrl: '',
  accentColor: '#5478FF',
  showPoweredBy: true,
}

// ─── Presentation ─────────────────────────────────────────────────────────

export interface Presentation {
  id: string
  createdBy: string      // Changed from ownerUserId to match service
  title: string
  description?: string
  type: PresentationType // Changed from presentationType to match service/UI
  status: PresentationStatus
  joinCode?: string      // Optional during draft
  joinLink?: string      // Optional during draft
  qrCodeUrl?: string
  questionsCount: number // Required for dashboard
  audienceSize: number   // Required for dashboard
  createdAt: string      // ISO 8601
  updatedAt: string      // ISO 8601
  // Per-presentation branding (overrides user profile branding)
  brandName?: string     // Custom brand/organization name for this Zapp
  brandLogoUrl?: string  // Custom logo for this Zapp (shown before questions)
  brandAccentColor?: string // Custom accent color for this Zapp
}
