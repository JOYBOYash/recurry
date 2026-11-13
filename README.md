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
- **Zero Client API Keys**: Gemini calls run strictly on the Express backend (`server.ts` + `server/geminiService.ts`) using `process.env.GEMINI_API_KEY`. Users never supply or store API keys in the browser.
- **Token Verification**: Every `/api/*` mutation and `/api/quota` route requires a `Bearer <firebaseIdToken>` header verified via Firebase Identity Toolkit.
- **Owner-Scoped Firestore Rules**: `firestore.rules` enforces default-deny, document ID validation, temporal integrity (`request.time`), strict field schemas (`firebase-blueprint.json`), immutable certificates, and `where('uid', '==', uid)` matching on subcollection queries.
- **1 Curriculum/Day Quota**: Enforced both server-side (`server/store.ts`) and via Firestore rules (`dailyGenerationCount <= 1`). Existing saved tracks can always be opened, practiced, or redone anytime.

---

## Project Structure

```text
.
├── server.ts                       # Express server + Vite middleware (dev) / static dist (prod)
├── server/
│   ├── geminiService.ts            # Structured Gemini prompts & response schemas
│   └── store.ts                    # Server-side daily curriculum quota tracking
├── firestore.rules                 # Zero-trust Firestore security rules
├── firestore.rules.test.ts         # Rules & query invariant tests
├── firebase-blueprint.json         # Firestore entity & path schema blueprint
├── src/
│   ├── App.tsx                     # Router & protected route wrappers
│   ├── context/AppAuthContext.tsx  # Firebase Auth state & owner-scoped Firestore listeners
│   ├── data/
│   │   ├── languages.ts            # Language metadata, skill ranks, daily goals
│   │   └── landingContent.ts       # Code showcases, FAQ items, repo config
│   ├── utils/
│   │   ├── curriculumLogic.ts      # Streaks, daily goal ring, accuracy/stars, quota helpers
│   │   ├── onboardingSteps.ts      # 8-step onboarding state machine
│   │   └── syntaxHighlight.ts      # Single-pass tokenizer (SQL, Java, C++, Python, JS, Ruby)
│   ├── components/                 # Shared UI, Hero, SkillsShowcase, WhoItsFor, FAQ, Footer, Workspace views
│   └── pages/                      # Route pages (Landing, Login, Onboarding, Generate, Curriculums, Learn, Reference, Certificates, Settings)
└── .env.example                    # Required environment variables template
```

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/JOYBOYash/recurry.git
cd recurry
npm install
```

### 2. Configure Environment & Firebase

1. Copy `.env.example` to `.env` and set your server-side Gemini API key:

```env
GEMINI_API_KEY="your_gemini_api_key"
APP_URL="http://localhost:3000"
```

2. Ensure `firebase-applet-config.json` contains your Firebase web configuration (`apiKey`, `authDomain`, `projectId`, `firestoreDatabaseId`) with **Google** and **Email/Password** providers enabled in Firebase Authentication, and deploy `firestore.rules` to your Firestore database.

### 3. Run Locally

```bash
npm run dev
```

The Express + Vite dev server starts on `http://localhost:3000`.

### 4. Build, Typecheck & Test

```bash
# TypeScript typecheck
npm run lint

# Production build (Vite client bundle -> dist/)
npm run build

# Start production server
npm start

# Run pure logic, lexer, onboarding, content, and Firestore rule tests
npx --yes tsx --test \
  src/utils/curriculumLogic.test.ts \
  src/utils/syntaxHighlight.test.ts \
  src/utils/onboardingSteps.test.ts \
  src/data/landingContent.test.ts \
  firestore.rules.test.ts
```

---

## License

MIT License
