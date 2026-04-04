# Home Redesign Implementation Plan (Content-Safe)

## Goal
Apply the new homepage look-and-feel while preserving LiveZapp's established product messaging, feature set, and data-driven sections.

## Non-Negotiables
- Do not replace core LiveZapp value props with generic placeholder copy.
- Keep real plan data from `types/plans.ts` as pricing source of truth.
- Keep real testimonials from `lib/data/mockData.ts`.
- Keep existing conversion routes (`/register`, `/join`, `/plans`, `/contact`, `/login`).
- Preserve mobile responsiveness and existing auth redirect behavior on `/`.

## Section Mapping (Old Content -> New Visual Slot)
1. Hero
- Keep existing LiveZapp proposition, CTA intent, and join-code action.
- Use new visual treatment (top nav, large headline, code card, collage image stack).

2. Features
- Preserve existing 4 feature pillars from prior implementation:
  - Multi-question presentations
  - Mobile-first participation
  - Real-time results and leaderboards
  - Scales from classrooms to conferences
- Render in new editorial card style.

3. How It Works
- Preserve existing 3-step flow:
  - Create
  - Share
  - Engage
- Restyle into new page visual language.

4. Pricing
- Replace mock plan text with canonical `PLANS` data.
- Keep recommendation highlight behavior for `isRecommended`.
- Keep CTA behavior consistent with acquisition flow.

5. Testimonials
- Use canonical `TESTIMONIALS` data, not placeholder quotes.
- Keep card style aligned with new theme.

6. QuantumStep Section
- Preserve existing studio/product ecosystem messaging.
- Keep as branded supporting section in new style.

7. Contact
- Keep contact/help entry section and form shell from new design direction.

## Execution Phases
1. Phase 1 (Now): Content Preservation Pass
- Replace placeholder homepage copy with established LiveZapp content.
- Wire plans/testimonials to canonical data.

2. Phase 2: Visual Consistency Pass
- Normalize spacing, typographic scale, and icon treatment across all sections.
- Ensure one coherent light editorial theme.

3. Phase 3: Interaction and QA
- Validate mobile and desktop rendering.
- Validate CTA links and join flow behavior.
- Run type-check/build and resolve unrelated blockers.

## Validation Checklist
- [ ] Every legacy section concept appears on new homepage.
- [ ] No placeholder pricing or fabricated limits remain.
- [ ] No placeholder testimonials remain.
- [ ] Nav/footer behavior correct on `/` and non-home routes.
- [ ] Performance acceptable on first render and mobile.
- [ ] Build passes after resolving unrelated existing type issues.
