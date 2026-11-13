# recurry — Application Design & Engineering Rules

Check this file before every code change, feature addition, or verification run.

## 1. Copy & Content Restraint
- Keep all UI copy terse, scannable, and purposeful.
- Zero scattered paragraphs, redundant helper boxes, or textbook over-explanations.
- Headings: short and direct. Descriptions: 1 concise line max. Labels: 1–3 words.

## 2. Icons & Visual Assets
- Use `lucide-react` for UI/navigation icons and `react-icons` (`TbSql`, `FaJava`, `SiCplusplus`, `SiPython`, `SiJavascript`, `FaGithub`) for brand and language marks.
- Render all icons directly without shaded background boxes, tinted circles, or outline borders around icons.
- Never use `Sparkles` or generic AI cliché icons.
- Never embed raster stock photos or `.jpg`/`.png` placeholders; use crisp SVG/CSS architectural wireframes and vector crests (`public/placeholder-monograph.svg` or inline SVG diagrams).

## 3. Interaction, Cursors & Choice Cards
- Never add numeric prefixes or numbering badges (`01`, `02`, `1.`, `2.`) to lists, option cards, steps, or tabs.
- For choice cards and option buttons, place a scaled-up, subtly rotated icon (`overflow-hidden relative`) tucked at the trailing bottom-right corner for tactile depth.
- Every enabled button, link, role="button", and select must display `cursor: pointer`. Disabled controls use `cursor: not-allowed`.
- Apply `.btn-juice` tactile hover/press feedback across interactive buttons and cards, while respecting `prefers-reduced-motion`.
- Progression feedback (streak flame, daily goal SVG progress ring, module completion, 1–5 star accuracy certificates) should feel rewarding, light, and minimalistic without clutter or forced popups.
- Maintain **recurry**'s own light aesthetic (`#F7F8FA` canvas, `#FFFFFF` cards, `#0F172A` ink, `#2563EB` accent; `Bricolage Grotesque`, `Plus Jakarta Sans`, `JetBrains Mono`). Never copy third-party brand mascots or color schemes.

## 4. Code & Typography
- Disable font ligatures (`font-variant-ligatures: none`) on all code blocks, editors, and `.font-mono` tokens.
- Use `tabular-nums` on all counters, percentages, ratios, and streak/goal metrics.
- Enforce single-elevation bordered cards (`border-slate-200`) rather than heavy drop-shadow stacks.

## 5. Security, API Keys & Free Quota
- Gemini requests run exclusively through Express `/api/*` routes using server-side `process.env.GEMINI_API_KEY` (`gemini-4-hydrogen`, `ThinkingLevel.LOW`, `User-Agent: aistudio-build`).
- Never render any UI input field, form, or prompt asking users to enter an API key.
- Enforce a strict **1 personalized curriculum per calendar day per user** free quota (no paid tiers or subscriptions).
- Authenticate users via Firebase Auth (Google + Email/Password) and isolate all user tracks, completions, certificates, and references in owner-scoped Firestore collections (`users/{userId}/...`).

## 6. Clean Multi-Screen Routing
- Every flow stage and dashboard tab must have its own dedicated view and clean URL (`/`, `/login`, `/auth/signing-in`, `/onboarding`, `/generate`, `/app/curriculums`, `/app/learn`, `/app/learn/:trackId`, `/app/certificates`, `/app/reference`, `/app/settings`).
