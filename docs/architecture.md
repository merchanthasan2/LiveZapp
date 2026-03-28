# LiveZapp — Architecture Overview

## Project type

Next.js 14 App Router, TypeScript, Tailwind CSS. Static generation for marketing pages; client components for interactive elements (forms, charts, nav).

---

## Directory structure

```
LiveZapp v01/
│
├── app/                         # Next.js App Router
│   ├── globals.css              # Base CSS reset + utility classes + CSS variables
│   ├── layout.tsx               # Root layout: font, Navbar, Footer, body gradient
│   ├── page.tsx                 # / — Home page (Server Component)
│   │
│   ├── plans/page.tsx           # /plans — Pricing table (Server Component)
│   ├── about/page.tsx           # /about — About page (Server Component)
│   ├── contact/page.tsx         # /contact — Contact form (Client Component)
│   ├── login/page.tsx           # /login — Login form (Client Component)
│   ├── register/page.tsx        # /register — Register form (Client Component)
│   │
│   ├── app/                     # Authenticated app area
│   │   ├── layout.tsx           # Sidebar layout for /app/* routes
│   │   └── dashboard/page.tsx   # /app/dashboard (Client Component)
│   │
│   └── admin/                   # Admin area
│       ├── layout.tsx           # Admin sidebar layout
│       └── page.tsx             # /admin — guarded panel (Client Component)
│
├── components/
│   ├── Navbar.tsx               # Global nav (Client — needs scroll listener, mobile state)
│   ├── Footer.tsx               # Global footer (Server Component)
│   │
│   └── home/                    # Home page sections (all Client for animations)
│       ├── HeroSection.tsx      # Hero with mock dashboard card
│       ├── FeaturesSection.tsx  # 4-card features grid
│       ├── HowItWorks.tsx       # 3-step explainer
│       ├── PricingPreview.tsx   # 4 plan cards (summary)
│       ├── QuantumStepSection.tsx  # Brand + tools links
│       └── Testimonials.tsx     # 2 mock quote cards
│
├── lib/
│   ├── firebase.ts              # Firebase stub functions (TODO: real SDK)
│   ├── hooks/
│   │   └── useAuth.ts           # Auth hook stub (TODO: Firebase Auth listener)
│   └── data/
│       └── mockData.ts          # PLANS, MOCK_PRESENTATIONS, MOCK_TRAFFIC, TESTIMONIALS
│
├── types/
│   └── index.ts                 # Shared TS interfaces
│
├── __tests__/
│   ├── Navbar.test.tsx
│   └── PricingCards.test.tsx
│
├── docs/                        # This documentation
│
├── tailwind.config.js           # Design tokens
├── next.config.js
├── tsconfig.json
├── jest.config.js
└── package.json
```

---

## Layer responsibilities

| Layer | Responsibility |
|---|---|
| `app/` | Route segments, page metadata, layout composition |
| `components/` | Reusable, self-contained UI pieces |
| `lib/data/` | Mock data — replace with Firebase/API calls per feature |
| `lib/hooks/` | React hooks for cross-cutting concerns (auth, etc.) |
| `lib/firebase.ts` | Firebase SDK wrapper — stubs until Phase 9 |
| `types/` | Shared TypeScript interfaces used across all layers |

---

## Component rendering strategy

| Component | Rendering |
|---|---|
| Navbar | Client (scroll listener, mobile state) |
| Footer | Server |
| Home page sections | Client (Framer Motion animations) |
| `/plans`, `/about` | Server |
| `/contact` | Client (RHF form) |
| `/login`, `/register` | Client (RHF forms) |
| `/app/dashboard` | Client (filter state) |
| `/admin` | Client (isAdmin check, chart) |

---

## Data flow (current — mock)

```
mockData.ts → imported directly by page/component
```

## Data flow (future — Firebase)

```
Firebase Auth → useAuth hook → page/component
Firestore → lib/firebase.ts helpers → page/component (via React Query)
```
