import { ref, set, push, get, update, remove } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { Question, QuestionSet, PresentationType } from '@/types/domain';

/**
 * Service for managing Questions in Firebase Realtime Database
 */
export const QuestionService = {
  /**
   * Save or update a question set for a presentation
   */
  async saveQuestionSet(
    presentationId: string, 
    questions: Question[], 
    presentationType: PresentationType,
    title: string
  ): Promise<void> {
    const questionSetRef = ref(rtdb, `presentations/${presentationId}/questions`);
    
    const questionSet: QuestionSet = {
      id: presentationId, // Use presentation ID as question set ID for 1:1 mapping
      presentationId,
      presentationType,
      title,
      questions,
    };
    
    await set(questionSetRef, questionSet);
    
    // Also update the presentation metadata for count
    await update(ref(rtdb, `presentations/${presentationId}`), {
      questionsCount: questions.length,
      updatedAt: new Date().toISOString()
    });
  },

  /**
   * Get the question set for a presentation
   */
  async getQuestionSet(presentationId: string): Promise<QuestionSet | null> {
    const snapshot = await get(ref(rtdb, `presentations/${presentationId}/questions`));
    return snapshot.exists() ? (snapshot.val() as QuestionSet) : null;
  },

  /**
   * Add a single question to a presentation
   */
  async addQuestion(
    presentationId: string, 
    question: Question, 
    presentationType: PresentationType,
    title: string
  ): Promise<void> {
    const currentSet = await this.getQuestionSet(presentationId);
    const questions = currentSet ? [...currentSet.questions, question] : [question];
    await this.saveQuestionSet(presentationId, questions, presentationType, title);
  },

  /**
   * Update a specific question in a set
   */
  async updateQuestion(
    presentationId: string, 
    questionId: string, 
    updates: Partial<Question>,
    presentationType: PresentationType,
    title: string
  ): Promise<void> {
    const currentSet = await this.getQuestionSet(presentationId);
    if (!currentSet) return;

    const questions = currentSet.questions.map(q => 
      q.id === questionId ? { ...q, ...updates } as Question : q
    );
    
    await this.saveQuestionSet(presentationId, questions, presentationType, title);
  },

  /**
   * Delete a specific question from a set
   */
  async deleteQuestion(
    presentationId: string, 
    questionId: string,
    presentationType: PresentationType,
    title: string
  ): Promise<void> {
    const currentSet = await this.getQuestionSet(presentationId);
    if (!currentSet) return;

    const questions = currentSet.questions.filter(q => q.id !== questionId);
    await this.saveQuestionSet(presentationId, questions, presentationType, title);
  }
};
