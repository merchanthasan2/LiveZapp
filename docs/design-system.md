# LiveZapp — Design System

## Color palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#4C6FFF` | Primary actions, active states, links |
| `secondary` | `#16C5B8` | Success, teal accents, secondary highlights |
| `accent` | `#FFB547` | Warm highlights, warnings, "Most popular" badge |
| `bg-start` | `#F4F2FF` | Body gradient start (lavender) |
| `bg-end` | `#E6F0FF` | Body gradient end (pale blue) |
| `text-primary` | `#1A1D3B` | Headings, body text |
| `text-secondary` | `#6B7280` | Captions, labels, muted text |
| `surface` | `#FFFFFF` | Card surfaces |
| `border-light` | `rgba(255,255,255,0.6)` | Glass card borders |

### Gradient stops

| Name | Value |
|---|---|
| Background | `135deg, #F4F2FF → #E6F0FF` |
| Primary | `135deg, #4C6FFF → #7B5EA7` |
| Secondary | `135deg, #16C5B8 → #4C6FFF` |
| Accent | `135deg, #FFB547 → #FF8C42` |

---

## Typography

**Google Font:** Inter (loaded via `next/font/google`)

| Role | Size | Weight | Class / Notes |
|---|---|---|---|
| Hero heading | 40–56px (responsive) | 700 | `text-4xl sm:text-5xl lg:text-[3.4rem]` |
| Section heading | 30–36px | 700 | `text-3xl sm:text-4xl` |
| Sub-heading | 20–24px | 700 | `text-xl` |
| Body | 14–16px | 400 | `text-sm` / `text-base` |
| Caption / label | 12px | 400–600 | `text-xs` |
| Micro label | 10px | 600 | `text-[10px]` |

### Gradient text

Apply with `.gradient-text` utility:
```css
background: linear-gradient(to right, #4C6FFF, #16C5B8);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

---

## Components

### Glass card

```jsx
<div className="glass-card">...</div>
```

CSS:
```css
background: rgba(255,255,255,0.6);
backdrop-filter: blur(20px);
border: 1px solid rgba(255,255,255,0.6);
border-radius: 24px;
box-shadow: 0 8px 32px rgba(76,111,255,0.12);
```

Hover variant: `glass-card-hover` — adds `-translate-y-1` and stronger shadow on hover.

---

### Primary button

```jsx
<button className="btn-primary">Label</button>
<Link href="/register" className="btn-primary">Get started</Link>
```

- Gradient background: primary → purple
- `shadow-btn-primary`: `0 4px 20px rgba(76,111,255,0.4)`
- On hover: `brightness(1.1)`, `-translate-y-0.5`, stronger shadow
- Focus: 2px ring in `primary/60`

---

### Ghost button

```jsx
<button className="btn-ghost">Label</button>
```

- Translucent white background, primary border
- Hover: `bg-primary/10`

---

### Icon backgrounds (pastel)

```jsx
<div className="icon-bg-primary">  // bg-primary/10, text-primary
<div className="icon-bg-secondary"> // bg-secondary/10, text-secondary
<div className="icon-bg-accent">   // bg-accent/10, text-accent
```

---

## Spacing & layout

| Concept | Value |
|---|---|
| Section vertical padding | `py-24` (96px) |
| Container max-width | `max-w-7xl` |
| Container horizontal padding | `px-4 sm:px-6 lg:px-8` (via `.section-container`) |
| Card border radius | `rounded-3xl` (24px) |
| Button border radius | `rounded-2xl` (16px) |
| Input border radius | `rounded-2xl` (16px) |

---

## Animation

All animations use Framer Motion with these conventions:

| Effect | Config |
|---|---|
| Section entry | `{ opacity: 0, y: 20 } → { opacity: 1, y: 0 }`, `viewport={{ once: true }}` |
| Hero entry | `{ opacity: 0, x: -30 } → ...`, `duration: 0.6` |
| Stagger | `delay: index * 0.1` per card |
| Float | `translateY(0) → translateY(-8px)`, `3s infinite` via Tailwind keyframe |
| Hover lift | `hover:-translate-y-1` via Tailwind |

**Rule:** Keep animations subtle. Duration ≤ 0.6s. No bouncing.

---

## Tailwind custom utilities (defined in `globals.css`)

| Class | Effect |
|---|---|
| `.glass-card` | Glassmorphism card base |
| `.glass-card-hover` | Glass card + hover lift + shadow |
| `.gradient-bg` | Body gradient background |
| `.gradient-primary/secondary/accent` | Gradient backgrounds |
| `.gradient-text` | Clip text through primary→secondary gradient |
| `.btn-primary` | Full primary gradient button |
| `.btn-ghost` | Translucent ghost button |
| `.section-container` | Max-width centered container |
| `.icon-bg-primary/secondary/accent` | Pastel icon background |
| `.gradient-divider` | Horizontal gradient separator line |
