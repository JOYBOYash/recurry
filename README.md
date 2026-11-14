# recurry

**recurry** is an open-source programming language syntax and problem-solving platform powered by Gemini, Firebase, Express, and React. Learners authenticate with Google or email/password, complete a multi-step onboarding flow, generate tailored multi-module tracks across six core languages (**SQL, Java, C++, Python, JavaScript, and Ruby**), solve interactive coding challenges with server-side AI evaluation, track daily module goals and streaks, and earn **1–5 star accuracy-ranked certificates**.

Repository: [https://github.com/JOYBOYash/recurry](https://github.com/JOYBOYash/recurry)

---

## Core Features

- **Six Supported Languages**: `SQL` (ANSI/PostgreSQL 16), `Java` (21 LTS), `C++` (C++20), `Python` (3.12), `JavaScript` (ES2024), and `Ruby` (3.3).
- **Five Skill Ranks**: `Noob`, `Intern`, `Expert`, `Master`, and `Legend` calibrate module complexity, grammar density, and challenge hints.
- **Two Learning Modes**: **Syntax Mastery** (grammar forms, idioms, pitfalls) and **Problem Solving** (algorithmic drills and edge-case reasoning).
- **Multi-Step Onboarding & Track Generator**: Dedicated URL-routed onboarding steps (`/onboarding/:step`) leading directly into track generation (`/generate`) with a strict **1 free curriculum per calendar day per user** quota.
- **Interactive Workspace**:
  - **My Curriculums (`/app/curriculums`)**: Browse progress across saved tracks, resume active modules, or redo finished tracks to raise accuracy.
  - **Learn Track (`/app/learn/:trackId`)**: Grammar reference, custom zero-dependency syntax highlighting (`font-variant-ligatures: none`), deep-dive expansion, built-in AI syntax tutor, and live code challenge evaluator.
  - **Syntax Reference (`/app/reference`)**: Side-by-side cross-language comparisons generated and saved per user.
  - **Certificates (`/app/certificates`)**: SVG completion certificates graded `1–5 stars` from average challenge accuracy across track modules.
  - **Progress & Retention**: Consecutive active-day **streak counter** and configurable **daily module goal ring** (`1–10 modules/day`) in the navigation bar and `/app/settings`.

---

## System Architecture

```text
Browser (React 19 + Vite + Tailwind CSS v4)
  ├── Public Landing & Auth (/ , /login , /auth/signing-in)
  ├── Onboarding & Generator (/onboarding/:step , /generate)
  └── Protected Workspace (/app/curriculums , /app/learn , /app/reference , /app/certificates , /app/settings)
        │
        ├── Firebase Auth & Cloud Firestore (client SDK, owner-scoped users/{uid}/...)
        │     ├── users/{uid}                 -> profile, dailyModuleGoal, completions, accuracy, quota
        │     ├── users/{uid}/tracks/{id}     -> generated curriculum modules
        │     ├── users/{uid}/certificates    -> immutable 1–5 star certificates
        │     └── users/{uid}/references      -> saved cross-language snippets
        │
        └── Express API Proxy (server.ts, Bearer Firebase ID token verified via Identity Toolkit)
              ├── GET  /api/health
              ├── GET  /api/quota
              ├── POST /api/curriculum/generate
              ├── POST /api/lesson/expand
              ├── POST /api/code/evaluate
              ├── POST /api/tutor/ask
              └── POST /api/reference/generate
                    │
                    └── Google Gemini (@google/genai · gemini-4-hydrogen) via server-side GEMINI_API_KEY
```

### Security & Quota Design
- **Zero Client AI Keys**: Gemini calls run strictly on the Express backend (`server.ts` + `server/geminiService.ts`) using `process.env.GEMINI_API_KEY`. Users never supply or store API keys in the browser.
- **Env-Only Configuration**: Both the Express backend (`server/config.ts`) and Vite client (`src/firebase.ts` / `src/utils/firebaseConfig.ts`) read configuration strictly from environment variables (`GEMINI_API_KEY`, `FIREBASE_API_KEY`, `VITE_FIREBASE_*`). `.env` is ignored via `.gitignore`.
- **Token Verification & API Hardening**: Every `/api/*` mutation and `/api/quota` route requires a `Bearer <firebaseIdToken>` header verified via Firebase Identity Toolkit (rejecting disabled accounts), enforces strict CORS origin checks, sliding-window IP & per-user rate limits, bounded payload sizes (`128kb`), input clamping, sanitized error responses, and production security headers (CSP, HSTS, `nosniff`, `same-origin-allow-popups`).
- **Owner-Scoped Firestore Access**: Client reads and writes are strictly scoped under `users/{uid}/...` with schema definitions documented in `firebase-blueprint.json` and enforced by your project's deployed Firestore security rules.
- **1 Curriculum/Day Quota**: Enforced server-side (`server/store.ts`, configurable via `QUOTA_STORE_PATH`) and validated against Firestore daily generation counts (`dailyGenerationCount <= 1`). Existing saved tracks can always be opened, practiced, or redone anytime.

---

## Project Structure

```text
.
├── server.ts                       # Express server + Vite middleware (dev) / static dist (prod)
├── server/
│   ├── config.ts                   # Environment configuration resolver
│   ├── security.ts                 # Security headers, CORS, rate limiter & payload sanitizers
│   ├── geminiService.ts            # Structured Gemini prompts & response schemas
│   └── store.ts                    # Server-side daily curriculum quota tracking
├── firebase-blueprint.json         # Firestore entity & path schema blueprint
├── public/assets/images/           # Brand logos (app-logo.png, logo.svg), OG/IG social previews, parallax & halftone assets
├── src/
│   ├── App.tsx                     # Router & protected route wrappers
│   ├── firebase.ts                 # Firebase SDK bootstrap via Vite env vars
│   ├── context/AppAuthContext.tsx  # Firebase Auth state & owner-scoped Firestore listeners
│   ├── data/
│   │   ├── languages.ts            # Language metadata, skill ranks, daily goals
│   │   └── landingContent.ts       # Code showcases, FAQ items, repo config
│   ├── utils/
│   │   ├── curriculumLogic.ts      # Streaks, daily goal ring, accuracy/stars, quota helpers
│   │   ├── firebaseConfig.ts       # Firebase client config resolver
│   │   ├── onboardingSteps.ts      # 8-step onboarding state machine
│   │   └── syntaxHighlight.ts      # Single-pass tokenizer (SQL, Java, C++, Python, JS, Ruby)
│   ├── components/                 # Shared UI, BrandLogo, Hero, SkillsShowcase, WhoItsFor, FAQ, Footer, Workspace views
│   └── pages/                      # Route pages (Landing, Login, Onboarding, Generate, Curriculums, Learn, Reference, Certificates, Settings)
└── .gitignore                      # Ignores .env*, dist/, node_modules/
```

---

## Self-Hosting & Local Setup

### 1. Clone & Install

```bash
git clone https://github.com/JOYBOYash/recurry.git
cd recurry
npm install
```

### 2. Configure Firebase Project

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/) and register a **Web app**.
2. Enable **Authentication** sign-in providers: **Google** and **Email/Password**.
3. Under **Authentication → Settings → Authorized domains**, add your hosting domains (e.g., `localhost`, `your-domain.vercel.app`).
4. Create a **Cloud Firestore** database (standard `(default)` database) and deploy owner-scoped security rules matching `firebase-blueprint.json`.

### 3. Configure Environment Variables

Create a local `.env` file (or configure variables directly in your hosting provider; `Node.js 22.18+` recommended):

- **Server variables**: `GEMINI_API_KEY`, `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `APP_URL`, `CORS_ORIGIN`, `FRAME_ANCESTORS="'self'"`, `NODE_ENV="production"`, `TRUST_PROXY="1"`, and optionally `QUOTA_STORE_PATH="/var/data/recurry-quotas.json"`.
- **Client build variables (`VITE_FIREBASE_*`)**: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (must be present during `npm run build` so Vite embeds the public Firebase client config).

### 4. Run Locally & Production Build

```bash
# Development server (Express + Vite middleware on http://localhost:3000)
npm run dev

# TypeScript typecheck
npm run lint

# Build production client bundle (requires VITE_FIREBASE_* env vars)
npm run build

# Start production server (Node 22.18+ native TypeScript support)
NODE_ENV=production npm start

# Run pure logic, lexer, onboarding, content, and security tests
npx --yes tsx --test \
  src/utils/curriculumLogic.test.ts \
  src/utils/syntaxHighlight.test.ts \
  src/utils/onboardingSteps.test.ts \
  src/data/landingContent.test.ts \
  server/security.test.ts
```

---

## License

MIT License
