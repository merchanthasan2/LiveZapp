// components/question-editor/makeQuestion.ts
// Factory: creates a default Question object for the given kind.

import type {
  Question, QuizQuestion, PollQuestion,
  WordCloudQuestion, QAQuestion, FeedbackQuestion,
} from '@/types/domain'
import type { QuestionKind } from './qtypes'

export function makeQuestion(kind: QuestionKind, orderIndex: number, sectionId?: string): Question {
  const id = Math.random().toString(36).substring(2, 9)
  const base = { id, orderIndex, isRequired: true, ...(sectionId ? { sectionId } : {}) }
  switch (kind) {
    case 'quiz':
      return {
        ...base, kind: 'quiz',
        prompt: '',
        options: [
          { id: 'a', label: 'Option A' },
        ],
        correctOptionId: 'a',
        timerSeconds: 30,
        points: 100,
      } satisfies QuizQuestion
    case 'poll':
      return {
        ...base, kind: 'poll',
        prompt: '',
        options: [
          { id: 'a', label: 'Option A' },
        ],
        allowMultipleSelections: false,
      } satisfies PollQuestion
    case 'word_cloud':
      return {
        ...base, kind: 'word_cloud',
        prompt: '',
        maxWordsPerResponse: 3,
      } satisfies WordCloudQuestion
    case 'qa':
      return {
        ...base, kind: 'qa',
        prompt: '',
        allowMultipleSubmissions: false,
      } satisfies QAQuestion
    case 'feedback':
      return {
        ...base, kind: 'feedback',
        prompt: '',
        feedbackType: 'rating',
        scaleMax: 5,
      } satisfies FeedbackQuestion
  }
}

/** Rebuild a question as a new kind while preserving id, order, section, and prompt text. */
export function convertQuestionKind(old: Question, newKind: QuestionKind): Question {
  const fresh = makeQuestion(newKind, old.orderIndex, old.sectionId)
  return {
    ...fresh,
    id: old.id,
    orderIndex: old.orderIndex,
    ...(old.sectionId ? { sectionId: old.sectionId } : {}),
    prompt: old.prompt,
  } as Question
}
