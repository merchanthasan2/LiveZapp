import { ref, set, push, get, update, remove, runTransaction } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { Presentation, PresentationStatus } from '@/types/domain';
import { PLANS } from '@/types/plans';
import type { PlanId } from '@/types/plans';

/**
 * Service for managing Presentations in Firebase Realtime Database
 */
export const PresentationService = {
  /**
   * Create a new presentation.
   * Enforces the plan's monthly Zapp limit (creations are cumulative; deleted Zapps still count).
   */
  async createPresentation(
    userId: string,
    presentation: Pick<Presentation, 'title' | 'description' | 'type'>
  ): Promise<string> {
    // ── 1. Read current user profile to get planId + Zapps-created count ───────
    const userRef = ref(rtdb, `users/${userId}`);
    const userSnap = await get(userRef);

    if (!userSnap.exists()) throw new Error('User profile not found.');

    const profile = userSnap.val() as {
      planId: PlanId;
      lifetimePresentationsCreated?: number;
    };

    const planId: PlanId = profile.planId ?? 'free';
    const lifetimeCount: number = profile.lifetimePresentationsCreated ?? 0;

    const plan = PLANS.find(p => p.id === planId)!;
    const limit = plan.limits.maxPresentations;

    // ── 2. Check monthly Zapp limit ───────────────────────────────────────────
    if (limit !== 'unlimited' && lifetimeCount >= limit) {
      throw new Error(
        `PLAN_LIMIT: Your ${plan.name} plan allows up to ${limit} Zapp${limit === 1 ? '' : 's'} per month (including deleted ones). ` +
        `Upgrade your plan to create more.`
      );
    }

    // ── 3. Create the presentation ────────────────────────────────────────────
    const presentationsRef = ref(rtdb, 'presentations');
    const newPresentationRef = push(presentationsRef);
    const id = newPresentationRef.key as string;

    const newPresentation: Presentation = {
      title: presentation.title,
      description: presentation.description || '',
      type: presentation.type,
      status: 'draft',
      questionsCount: 0,
      audienceSize: 0,
      id,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(ref(rtdb, `presentations/${id}`), newPresentation);

    // ── 4. Track in user index + atomically increment Zapps-created counter ───
    await set(ref(rtdb, `users/${userId}/presentations/${id}`), true);

    await runTransaction(ref(rtdb, `users/${userId}/lifetimePresentationsCreated`), current => {
      return (current ?? 0) + 1;
    });

    return id;
  },

  /**
   * Get a single presentation by ID
   */
  async getPresentation(id: string): Promise<Presentation | null> {
    const snapshot = await get(ref(rtdb, `presentations/${id}`));
    return snapshot.exists() ? (snapshot.val() as Presentation) : null;
  },

  /**
   * Get all presentations for a specific user
   */
  async getUserPresentations(userId: string): Promise<Presentation[]> {
    const userIndexSnapshot = await get(ref(rtdb, `users/${userId}/presentations`));

    if (!userIndexSnapshot.exists()) return [];

    const presentationIds = Object.keys(userIndexSnapshot.val());
    const presentationPromises = presentationIds.map(id => this.getPresentation(id));

    const results = await Promise.all(presentationPromises);
    return results.filter((p): p is Presentation => p !== null);
  },

  /**
   * Update a presentation
   */
  async updatePresentation(id: string, updates: Partial<Presentation>): Promise<void> {
    const presentationRef = ref(rtdb, `presentations/${id}`);
    await update(presentationRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a presentation.
   * The user's index entry is removed but lifetimePresentationsCreated is NOT decremented —
   * deleted Zapps still count toward the monthly allowance.
   */
  async deletePresentation(userId: string, id: string): Promise<void> {
    await remove(ref(rtdb, `presentations/${id}`));
    await remove(ref(rtdb, `users/${userId}/presentations/${id}`));
    // Intentionally NOT decrementing lifetimePresentationsCreated
  },

  /**
   * Check live participant count vs the host's plan cap (counts RTDB `live_sessions/{joinCode}/participants`).
   * If `participantId` is already in that map, allow (reconnect / same device).
   */
  async canParticipantJoin(
    presentationId: string,
    joinCode: string,
    participantId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const presentation = await this.getPresentation(presentationId);
    if (!presentation) return { allowed: false, reason: 'Session not found.' };

    const userSnap = await get(ref(rtdb, `users/${presentation.createdBy}`));
    if (!userSnap.exists()) return { allowed: false, reason: 'Presenter not found.' };

    const profile = userSnap.val() as { planId: PlanId };
    const plan = PLANS.find(p => p.id === (profile.planId ?? 'free'))!;
    const cap = plan.limits.maxParticipantsPerSession;

    const partSnap = await get(ref(rtdb, `live_sessions/${joinCode}/participants`));
    const raw = partSnap.exists() ? (partSnap.val() as Record<string, unknown>) : {};
    const ids = Object.keys(raw);
    if (participantId && ids.includes(participantId)) {
      return { allowed: true };
    }
    const participantCount = ids.length;
    if (participantCount >= cap) {
      return {
        allowed: false,
        reason: `This session has reached its participant limit (${cap.toLocaleString()}).`,
      };
    }

    return { allowed: true };
  },
};
