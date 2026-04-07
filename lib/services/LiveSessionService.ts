import { ref, set, get, update, onValue, off } from 'firebase/database'
import { rtdb } from '@/lib/firebase'
import type { Question } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────

export interface LiveSessionData {
  id: string
  presentationId: string
  joinCode: string
  hostId: string
  isActive: boolean
  isPaused?: boolean
  hasStarted?: boolean   // true only after presenter clicks "Start presentation"
  startedAt: string
  endedAt?: string
  currentQuestionIndex: number
  title: string
  questions: Question[]
  activeQuestionId?: string | null
  questionStartedAt?: string | null
  answerDeadlineAt?: string | null
  quizAnswersOpen?: boolean
  quizRevealCorrectAnswer?: boolean
  brandLogoUrl?: string  // Firebase Storage download URL for host's logo
  brandName?: string     // Host's display / brand name
  brandAccentColor?: string
}

export interface ParticipantResponse {
  answer: string | string[] | number
  submittedAt: string
}

function buildQuestionPhase(index: number, question?: Question) {
  const startedAt = new Date().toISOString()
  const base = {
    currentQuestionIndex: index,
    activeQuestionId: question?.id ?? null,
    questionStartedAt: question ? startedAt : null,
    answerDeadlineAt: null,
    quizAnswersOpen: false,
    quizRevealCorrectAnswer: false,
  }

  if (question?.kind !== 'quiz') {
    return base
  }

  const deadline = new Date(Date.now() + Math.max(1, question.timerSeconds) * 1000).toISOString()
  return {
    ...base,
    answerDeadlineAt: deadline,
    quizAnswersOpen: true,
  }
}

// ─── Service ──────────────────────────────────────────────────────────────

export const LiveSessionService = {
  /**
   * Start a live session for a presentation.
   * Writes to `live_sessions/{joinCode}` and sets presentation status → 'live'.
   */
  async startSession(params: {
    presentationId: string
    hostId: string
    joinCode: string
    title: string
    questions: Question[]
    brandLogoUrl?: string
    brandName?: string
    brandAccentColor?: string
  }): Promise<void> {
    const { presentationId, hostId, joinCode, title, questions, brandLogoUrl, brandName, brandAccentColor } = params
    const session: LiveSessionData = {
      id: joinCode,
      presentationId,
      joinCode,
      hostId,
      isActive: true,
      isPaused: false,
      hasStarted: false,   // participants wait until presenter clicks "Start"
      startedAt: new Date().toISOString(),
      currentQuestionIndex: 0,
      title,
      questions,
      activeQuestionId: null,
      questionStartedAt: null,
      answerDeadlineAt: null,
      quizAnswersOpen: false,
      quizRevealCorrectAnswer: false,
      ...(brandLogoUrl ? { brandLogoUrl } : {}),
      ...(brandName    ? { brandName    } : {}),
      ...(brandAccentColor ? { brandAccentColor } : {}),
    }
    await set(ref(rtdb, `live_sessions/${joinCode}`), session)
    await update(ref(rtdb, `presentations/${presentationId}`), {
      status: 'live',
      joinCode,
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * End a live session. Sets isActive → false, presentation status → 'completed'.
   */
  async endSession(joinCode: string, presentationId: string): Promise<void> {
    await update(ref(rtdb, `live_sessions/${joinCode}`), {
      isActive: false,
      endedAt: new Date().toISOString(),
    })
    await update(ref(rtdb, `presentations/${presentationId}`), {
      status: 'completed',
      updatedAt: new Date().toISOString(),
    })
  },

  /**
   * One-time fetch of a session by join code.
   */
  async getSession(joinCode: string): Promise<LiveSessionData | null> {
    const snap = await get(ref(rtdb, `live_sessions/${joinCode}`))
    return snap.exists() ? (snap.val() as LiveSessionData) : null
  },

  /**
   * Navigate to a specific question (presenter only).
   */
  async setCurrentQuestion(joinCode: string, index: number, question?: Question): Promise<void> {
    await update(ref(rtdb, `live_sessions/${joinCode}`), buildQuestionPhase(index, question))
  },

  /**
   * Submit a participant's answer to a question.
   * Path: live_sessions/{code}/responses/{questionId}/{participantId}
   */
  async submitResponse(
    joinCode: string,
    questionId: string,
    participantId: string,
    response: ParticipantResponse,
  ): Promise<void> {
    await set(
      ref(rtdb, `live_sessions/${joinCode}/responses/${questionId}/${participantId}`),
      response,
    )
  },

  /**
   * Register a participant joining the session.
   * Path: live_sessions/{code}/participants/{participantId}
   */
  async joinAsParticipant(joinCode: string, participantId: string, name = 'Guest'): Promise<void> {
    await set(ref(rtdb, `live_sessions/${joinCode}/participants/${participantId}`), {
      joinedAt: new Date().toISOString(),
      name,
    })
  },

  /** Mark session as started — participants transition from wait screen to questions. */
  async startPresentation(joinCode: string, index = 0, question?: Question): Promise<void> {
    await update(ref(rtdb, `live_sessions/${joinCode}`), {
      hasStarted: true,
      ...buildQuestionPhase(index, question),
    })
  },

  /** Pause a session — participants see a holding screen. */
  async pauseSession(joinCode: string): Promise<void> {
    await update(ref(rtdb, `live_sessions/${joinCode}`), { isPaused: true })
  },

  /** Resume a paused session. */
  async resumeSession(joinCode: string): Promise<void> {
    await update(ref(rtdb, `live_sessions/${joinCode}`), { isPaused: false })
  },

  /** Close the quiz answer window and reveal the correct option. */
  async closeQuizAnswerWindow(joinCode: string, questionId: string): Promise<void> {
    const sessionRef = ref(rtdb, `live_sessions/${joinCode}`)
    const snap = await get(sessionRef)
    if (!snap.exists()) return

    const session = snap.val() as LiveSessionData
    if (session.activeQuestionId !== questionId) return

    await update(sessionRef, {
      quizAnswersOpen: false,
      quizRevealCorrectAnswer: true,
      answerDeadlineAt: new Date().toISOString(),
    })
  },

  /**
   * Real-time subscription to the session document.
   * Returns an unsubscribe function.
   */
  subscribeToSession(
    joinCode: string,
    callback: (data: LiveSessionData | null) => void,
  ): () => void {
    const r = ref(rtdb, `live_sessions/${joinCode}`)
    onValue(r, snap => callback(snap.exists() ? (snap.val() as LiveSessionData) : null))
    return () => off(r)
  },

  /**
   * Real-time subscription to all responses for one question.
   * Returns an unsubscribe function.
   */
  subscribeToResponses(
    joinCode: string,
    questionId: string,
    callback: (responses: Record<string, ParticipantResponse>) => void,
  ): () => void {
    const r = ref(rtdb, `live_sessions/${joinCode}/responses/${questionId}`)
    onValue(r, snap => callback(snap.exists() ? snap.val() : {}))
    return () => off(r)
  },

  /**
   * One-time fetch of all responses for a question.
   * Path: live_sessions/{code}/responses/{questionId}
   */
  async getResponsesForQuestion(
    joinCode: string,
    questionId: string,
  ): Promise<Record<string, ParticipantResponse>> {
    const snap = await get(ref(rtdb, `live_sessions/${joinCode}/responses/${questionId}`))
    return snap.exists() ? (snap.val() as Record<string, ParticipantResponse>) : {}
  },

  /**
   * One-time fetch of all participants for a session.
   * Path: live_sessions/{code}/participants/{participantId}
   */
  async getParticipants(
    joinCode: string,
  ): Promise<Record<string, { name?: string; joinedAt?: string }>> {
    const snap = await get(ref(rtdb, `live_sessions/${joinCode}/participants`))
    return snap.exists() ? (snap.val() as Record<string, { name?: string; joinedAt?: string }>) : {}
  },

  /**
   * Real-time subscription to participant list.
   * Returns an unsubscribe function.
   */
  subscribeToParticipants(
    joinCode: string,
    callback: (count: number) => void,
  ): () => void {
    const r = ref(rtdb, `live_sessions/${joinCode}/participants`)
    onValue(r, snap => callback(snap.exists() ? Object.keys(snap.val()).length : 0))
    return () => off(r)
  },
}
