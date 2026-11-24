# recurry — Application Design & Engineering Rules

Check this file before every code change, feature addition, or verification run.

## 1. Core UI/UX Philosophy (Underlying Logic)
- **Zero Hard-Bordered Shaded Pills & Chunky 3D Buttons**: Never style badges, chips, tags, or secondary buttons with a colored/dark border paired with a same-hue tinted/shaded background (e.g., amber border + amber shaded fill, blue border + blue shaded box) or heavy `border-b-2` 3D edges. Render metadata/ranks as clean unboxed typography + colored icon; use crisp flat fills for primary (`bg-blue-600`) and destructive (`bg-red-600`) buttons, and quiet neutral hover surfaces for secondary controls.
- **Icon-First Minimalism**: Whenever a universally understood icon clearly communicates a secondary action (hint, syntax, snippet, reset, delete, edit), render a clean icon button (with `aria-label` + tooltip) instead of verbose text buttons. When paired with a label for clarity, keep it ultra-short (e.g., `+ Add` instead of `Insert into Editor`).
- **Zero Redundant UI, Screens, or Popups**:
  - Never expose two entry points or screens for the same task (e.g., remove redundant `Learn` nav item when tracks open directly from `Curriculums`).
  - Never show a modal popup for a view that already exists as a dedicated screen (e.g., clicking streak indicators goes directly to the Streaks view inside Profile instead of opening a duplicate calendar popup).
  - Consolidate personal progress surfaces (Streaks and Certificates) inside a single `Profile` destination.
  - Place `Settings` at the bottom of the navigation chrome and tuck account-level actions like `Sign Out` (styled as an unmistakable red button) inside Settings.
- **Bite-Sized Progressive Flows Over Overwhelming Walls of Controls**:
  - Break multi-step configuration and problem-solving into one focused piece at a time with smooth directional transitions (`animate-step-forward` / `animate-step-back`).
  - Use compact dropdowns for multi-option parameters (Language, Focus, Depth) and interactive cyclic flip cards with arrow controls (`<` / `>`) for tiered choices (Skill Level) instead of large repetitive button grids.
  - Keep a single unified flow for Onboarding and New Curriculum creation (simply omitting the username step when already signed in).
- **Duolingo-Style Micro-Accomplishments**: In Lessons and Algo Mode, let learners build solutions incrementally piece-by-piece, rewarding each completed step with a brief, crisp accomplishment transition that flows naturally into the next step.
- **Minimalist Cards & Tight Vertical Rhythm**: Strip nested borders, inner horizontal dividers where whitespace suffices, and secondary text clutter from curriculum and lesson cards so the title, progress, and single primary action stand out cleanly.
- **Expressive Visual Indicators Over Dry Counters**:
  - Represent daily module goals with stylized, edgy/angular geometric heart icons (empty & gently blinking when incomplete, filled when earned) rather than dry text fractions.
  - Represent streaks with a vibrant multi-tone flaming icon.
- **Confirmation Modals for Important Decisions**: Always prompt the user with the reusable `ConfirmDialog` before committing meaningful state changes or destructive actions (signing out, changing daily goals, deleting a curriculum, restarting a track, or resetting problem progress).
- **Distraction-Free Focus Mode**: Provide a persistent Focus Mode toggle in Settings that hides non-essential navigation, sidebars, top bar chrome, and extra metadata so readers can concentrate solely on the lesson or coding editor, with a quiet one-click exit control.

## 2. Copy & Content Restraint
- Keep all UI copy terse, scannable, and purposeful.
- Zero scattered paragraphs, redundant helper boxes, or textbook over-explanations.
- Headings: short and direct. Descriptions: 1 concise line max. Labels: 1–3 words.

## 3. Icons & Visual Assets
- Use `lucide-react` for UI/navigation icons, `react-icons` (`TbSql`, `FaJava`, `SiCplusplus`, `SiPython`, `SiJavascript`, `FaGithub`) for brand and language marks, and bespoke crisp inline SVGs for signature indicators (edgy daily-goal hearts, vibrant flame).
- Size desktop sidebar icons generously (`h-5 w-5`) for fast visual scanning.
- Render all icons directly without shaded background boxes, tinted circles, or outline borders around icons.
- Never use `Sparkles` or generic AI cliché icons.
- Never embed raster stock photos or `.jpg`/`.png` placeholders; use crisp SVG/CSS architectural wireframes and vector crests.

## 4. Interaction, Motion & Palette
- Never add numeric prefixes or numbering badges (`01`, `02`, `1.`, `2.`) to lists, option cards, steps, or tabs.
- Every enabled button, link, role="button", and select must display `cursor: pointer`. Disabled controls use `cursor: not-allowed`.
- Use smooth compositor-only transitions (`transform`, `opacity`) for route changes, step flows, flip cards, accomplishment banners, and modals, while respecting `prefers-reduced-motion`.
- Maintain **recurry**'s clean light aesthetic (`#F7F8FA` canvas, `#FFFFFF` cards, `#0F172A` ink, `#2563EB` accent; `Bricolage Grotesque`, `Plus Jakarta Sans`, `JetBrains Mono`).
- **Dark Mode Palette (Non-Landing Views Only)**: Never use blue-tinted dark backgrounds or `slate-*` hues (`#0B0F17`, `#111827`, `#0D131F`, `dark:bg-blue-950/*`). Replace light whites/greys with pure charcoal/black shades (`#121212` canvas, `#161616`/`#181818` cards/sidebars/headers, `#202020` recessed surfaces, `neutral-*` borders and text), reserving blue strictly for primary CTAs and active selection highlights. Landing page (`/`) stays strictly light mode.

## 5. Code, Headers & Typography
- Never place descriptive eyebrow/kicker pills or uppercase labels above headers (`HANDLE`, `LANGUAGE`, `SKILL RANK`, `LEARNING FOCUS`, `DAILY GOAL`, etc.) and never add `@username` or status pills beside logos or on headers.
- Disable font ligatures (`font-variant-ligatures: none`) on all code blocks, editors, and `.font-mono` tokens.
- Use `tabular-nums` on all counters, percentages, ratios, and streak/goal metrics.
- Enforce single-elevation surfaces (`border-slate-200/80` in light, `dark:border-neutral-800` in dark) rather than nested card-in-card borders or heavy shadow stacks.

## 6. Security, API Keys & Free Quota
- Gemini requests run exclusively through Express `/api/*` routes using server-side `process.env.GEMINI_API_KEY`.
- Never render any UI input field, form, or prompt asking users to enter an API key.
- Enforce a strict **1 personalized curriculum per calendar day per user** free quota (no paid tiers or subscriptions).
- Authenticate users via Firebase Auth (Google + Email/Password) and isolate all user tracks, completions, certificates, and references in owner-scoped Firestore collections (`users/{userId}/...`).

## 7. Clean Multi-Screen Routing
- Keep dedicated clean URLs (`/`, `/login`, `/auth/signing-in`, `/onboarding`, `/generate`, `/app/curriculums`, `/app/learn/:trackId`, `/app/algo`, `/app/profile`, `/app/reference`, `/app/settings`) and redirect legacy `/app/streaks` and `/app/certificates` paths smoothly into `/app/profile`.
