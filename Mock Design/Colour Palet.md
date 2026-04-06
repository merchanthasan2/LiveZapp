# The Design System Strategy & Implementation Guide

## 1. Overview & Creative North Star: The Kinetic Conductor
This design system is built to bridge the gap between high-energy audience participation and high-end professional software. Our Creative North Star is **"The Kinetic Conductor."** 

Unlike standard educational tools that feel like toys, this design system treats the user interaction as a premium event. We move beyond the "template" look by utilizing **Intentional Asymmetry** and **Editorial Scale**. We break the rigid grid with overlapping containers and oversized typography that feels curated, not just placed. The interface doesn't just sit there; it vibrates with a professional, tech-savvy energy that signals reliability and innovation.

---

## 2. Colors: Tonal Depth & Vibrancy
The palette is anchored by a deep, vibrant purple (`primary: #650cd9`) and energized by sophisticated teal (`secondary: #006b5f`) and coral (`tertiary: #912f03`) accents.

### The "No-Line" Rule
To achieve a high-end editorial feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts or tonal transitions. Use `surface-container-low` for large section backgrounds to distinguish them from the main `surface` or `background` colors.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper. 
- Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural lift.
- Use the `surface-container-highest` only for the most critical interactive elements to pull them toward the user.

### The "Glass & Gradient" Rule
To avoid a flat, "out-of-the-box" appearance, floating elements (like overlays or navigation bars) should utilize **Glassmorphism**. Combine semi-transparent surface colors with a `backdrop-blur` effect.
- **Signature Textures:** Main CTAs and hero sections should use subtle linear gradients (e.g., `primary` transitioning to `primary_container`) to provide visual "soul" and depth that flat hex codes cannot achieve alone.

---

## 3. Typography: The Editorial Scale
We use a dual-font strategy to balance tech-savviness with friendly approachability.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "Voice." Large, bold, and slightly wide, they provide an authoritative editorial feel. Use `display-lg` (3.5rem) for high-impact hero statements to command attention.
*   **Body & Titles (Inter):** This is our "Utility." Inter provides world-class readability for fast-paced interaction. Use `body-lg` (1rem) for most user-generated content to ensure clarity in high-pressure live environments.

**Hierarchy Note:** Typography is the primary driver of hierarchy. Ensure a significant scale jump between `headline-md` and `body-md` to maintain the energetic, modern rhythm of the brand.

---

## 4. Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional structural lines.

### The Layering Principle
Stacking surface tokens creates a sophisticated "stacked" appearance.
- **Base Layer:** `surface` (#fcf9f8)
- **Mid Layer:** `surface-container-low` (#f6f3f2)
- **Top Layer (Cards):** `surface-container-lowest` (#ffffff)

### Ambient Shadows
When a "floating" effect is required, shadows must be extra-diffused. Use large blur values (24px–48px) with a low opacity (4%–8%). The shadow color must be a tinted version of `on-surface` (#1c1b1b), mimicking natural ambient light rather than a harsh grey drop shadow.

### The "Ghost Border" Fallback
If a border is absolutely necessary for accessibility (e.g., in a high-contrast mode), use a **Ghost Border**. Apply the `outline-variant` token at 15% opacity. Never use 100% opaque borders.

---

## 5. Components: Refined Interactivity

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`) with `on-primary` text. Use `rounded-full` for a friendly, modern feel.
- **Secondary:** `secondary-container` background with `on-secondary-container` text. No borders.
- **State Changes:** On hover, increase the elevation through a subtle increase in the `surface-tint` overlay rather than changing the hex color drastically.

### Cards & Lists
- **The Divider Rule:** Forbid the use of divider lines. Separate list items using vertical white space (referencing our `1rem` and `1.5rem` spacing) or subtle background shifts (`surface-container-low` vs `surface-container-high`).
- **Layout:** Use `rounded-xl` (1.5rem) for main containers to soften the professional edge.

### Input Fields
- Avoid the "box" look. Use `surface-container` backgrounds with a `rounded-md` corner.
- **Active State:** Instead of a thick border, use a 2px `primary` underline or a subtle `primary` glow (using the ambient shadow rule).

### Live-Interaction Components (Signature)
- **Poll Bars:** Use `primary` for the leading edge and `primary-fixed-dim` for the track background.
- **Participant Chips:** Use `secondary-fixed` for high visibility against dark mode or `surface-bright` backgrounds.

---

## 6. Do's and Don'ts

### Do:
- **Do** use intentional white space. Let elements breathe to convey a premium "pro" feel.
- **Do** overlap images of people interacting over the edge of containers to create a sense of three-dimensional space.
- **Do** use `plus-jakarta-sans` for all numbers in live results to emphasize tech-savviness.

### Don't:
- **Don't** use black (#000000) for text. Always use `on-surface` (#1c1b1b) for a softer, high-end look.
- **Don't** use standard 1px borders. If you feel you need a line, use a background color change instead.
- **Don't** use high-saturation shadows. Keep them "airy" and diffused.
- **Don't** crowd the interface. If the screen feels full, increase the container padding using the `xl` (1.5rem) scale.