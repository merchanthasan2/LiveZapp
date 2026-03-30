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
          { id: 'b', label: 'Option B' },
          { id: 'c', label: 'Option C' },
          { id: 'd', label: 'Option D' },
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
          { id: 'b', label: 'Option B' },
          { id: 'c', label: 'Option C' },
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
