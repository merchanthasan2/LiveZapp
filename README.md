# LiveZapp

**Interactive presentations & live audience engagement** — by QuantumStep

> LiveZapp lets you create real-time quizzes, polls, and audience Q&A that participants join from any device. No downloads required.

🔗 Live at: [livezapp.quantumstep.in](https://livezapp.quantumstep.in)

---

## Quick start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for production

```bash
npm run build
npm start
```

### Run tests

```bash
npm test
```

---

## Environment variables

Create a `.env.local` file at the root. The following variables will be required once Firebase is connected:

```env
# Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

> Firebase credentials are required for auth/RTDB-backed features; some UI may still work without them.

---

## Project structure

```
.
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout (Navbar + Footer)
│   ├── page.tsx                # Home / marketing page
│   ├── plans/page.tsx          # Pricing table
│   ├── about/page.tsx          # About QuantumStep & LiveZapp
│   ├── contact/page.tsx        # Contact form
│   ├── login/page.tsx          # Login form
│   ├── register/page.tsx       # Registration form
│   ├── app/
│   │   ├── layout.tsx          # Dashboard sidebar layout
│   │   └── dashboard/page.tsx  # User dashboard shell
│   └── admin/
│       ├── layout.tsx          # Admin sidebar layout
│       └── page.tsx            # Admin panel (guarded)
├── components/
│   ├── Navbar.tsx              # Top navigation bar
│   ├── Footer.tsx              # Site footer
│   └── home/                   # Home page section components
│       ├── HeroSection.tsx
│       ├── FeaturesSection.tsx
│       ├── HowItWorks.tsx
│       ├── PricingPreview.tsx
│       ├── QuantumStepSection.tsx
│       └── Testimonials.tsx
├── lib/
│   ├── firebase.ts             # Firebase SDK wrapper (auth/RTDB)
│   ├── hooks/useAuth.ts        # Firebase auth listener hook
│   └── data/mockData.ts        # All mock/placeholder data
├── types/index.ts              # TypeScript type definitions
├── __tests__/                  # Jest + React Testing Library tests
├── docs/                       # Project documentation
├── tailwind.config.js          # Tailwind with LiveZapp design tokens
└── package.json
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Tests | Jest + React Testing Library |

---

## Documentation

See the [`docs/`](./docs/) folder:

- [`docs/architecture.md`](./docs/architecture.md) — folder structure and layer documentation
- [`docs/design-system.md`](./docs/design-system.md) — color tokens, typography, component guide
- [`docs/phases.md`](./docs/phases.md) — phased roadmap and Firebase integration plan

---

## License

© 2026 QuantumStep. All rights reserved.
