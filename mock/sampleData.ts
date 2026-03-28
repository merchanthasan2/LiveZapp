/**
 * mock/sampleData.ts
 *
 * Rich domain-level sample data for development and demos.
 * Uses the canonical types from `types/domain.ts` and `types/plans.ts`.
 *
 * Replace with real Firestore reads in Phase 9.
 */

import type {
  Presentation,
  QuestionSet,
  QuizQuestion,
  QAQuestion,
  FeedbackQuestion,
} from '@/types/domain'

export const SAMPLE_USER_ID = 'user_demo_1'

// ─── Sample presentations ─────────────────────────────────────────────────

export const SAMPLE_PRESENTATIONS: Presentation[] = [
  {
    id: 'pres_quiz_1',
    createdBy: SAMPLE_USER_ID,
    title: 'Friday Team Quiz',
    description: 'Quick 10-minute check-in with fun questions.',
    type: 'quiz',
    status: 'draft',
    joinCode: '483291',
    joinLink: 'https://livezapp.quantumstep.in/join/483291',
    qrCodeUrl: '/placeholder/qr-483291.png',
    questionsCount: 5,
    audienceSize: 0,
    createdAt: '2026-03-13T06:00:00.000Z',
    updatedAt: '2026-03-13T06:00:00.000Z',
  },
  {
    id: 'pres_qa_1',
    createdBy: SAMPLE_USER_ID,
    title: 'Town Hall Q&A',
    description: 'Collect anonymous questions from the audience.',
    type: 'qa',
    status: 'scheduled',
    joinCode: '927460',
    joinLink: 'https://livezapp.quantumstep.in/join/927460',
    qrCodeUrl: '/placeholder/qr-927460.png',
    questionsCount: 3,
    audienceSize: 0,
    createdAt: '2026-03-12T10:00:00.000Z',
    updatedAt: '2026-03-12T14:30:00.000Z',
  },
  {
    id: 'pres_feedback_1',
    createdBy: SAMPLE_USER_ID,
    title: 'Workshop Feedback',
    description: 'Quick feedback form after the session.',
    type: 'feedback',
    status: 'draft',
    joinCode: '135790',
    joinLink: 'https://livezapp.quantumstep.in/join/135790',
    qrCodeUrl: '/placeholder/qr-135790.png',
    questionsCount: 4,
    audienceSize: 0,
    createdAt: '2026-03-10T09:00:00.000Z',
    updatedAt: '2026-03-10T09:00:00.000Z',
  },
]

// ─── Sample questions ─────────────────────────────────────────────────────

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q_quiz_1',
    kind: 'quiz',
    prompt: 'How confident are you using AI tools at work?',
    orderIndex: 0,
    isRequired: true,
    options: [
      { id: 'opt_1', label: 'Very confident' },
      { id: 'opt_2', label: 'Somewhat confident' },
      { id: 'opt_3', label: 'Just starting out' },
      { id: 'opt_4', label: 'Not at all' },
    ],
    timerSeconds: 20,
    correctOptionId: 'opt_1',
    points: 1000,
  },
  {
    id: 'q_quiz_2',
    kind: 'quiz',
    prompt: 'How many people can join a Pro session on LiveZapp?',
    orderIndex: 1,
    isRequired: true,
    options: [
      { id: 'opt_1', label: '100' },
      { id: 'opt_2', label: '500' },
      { id: 'opt_3', label: '2000' },
      { id: 'opt_4', label: 'Unlimited' },
    ],
    timerSeconds: 25,
    correctOptionId: 'opt_3',
    points: 1000,
  },
]

const QA_QUESTIONS: QAQuestion[] = [
  {
    id: 'q_qa_1',
    kind: 'qa',
    prompt: "What's one question you'd like answered today?",
    orderIndex: 0,
    isRequired: false,
    allowMultipleSubmissions: true,
  },
]

const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  {
    id: 'q_feedback_1',
    kind: 'feedback',
    prompt: "Rate today's session overall.",
    orderIndex: 0,
    isRequired: true,
    feedbackType: 'rating',
    scaleMax: 5,
  },
  {
    id: 'q_feedback_2',
    kind: 'feedback',
    prompt: 'What was the most useful part?',
    orderIndex: 1,
    isRequired: false,
    feedbackType: 'short_text',
  },
]

// ─── Question sets ────────────────────────────────────────────────────────

export const SAMPLE_QUESTION_SETS: QuestionSet[] = [
  {
    id: 'qs_quiz_1',
    presentationId: 'pres_quiz_1',
    presentationType: 'quiz',
    title: 'Team Quiz Questions',
    questions: QUIZ_QUESTIONS,
  },
  {
    id: 'qs_qa_1',
    presentationId: 'pres_qa_1',
    presentationType: 'qa',
    title: 'Town Hall Q&A',
    questions: QA_QUESTIONS,
  },
  {
    id: 'qs_feedback_1',
    presentationId: 'pres_feedback_1',
    presentationType: 'feedback',
    title: 'Workshop Feedback Form',
    questions: FEEDBACK_QUESTIONS,
  },
]
