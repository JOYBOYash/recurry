---
name: Friendly Progression UI Design
version: 1.0
description: A reusable UI design skill for creating friendly, gamified, progression-led application interfaces inspired by the structural and interaction patterns in the supplied Duolingo screen references, without copying Duolingo's brand identity.
---

# Friendly Progression UI Design Skill

## Purpose

Use this skill when designing or implementing application screens that should feel approachable, guided, tactile, lightweight, and rewarding. The supplied references demonstrate a consistent product language across onboarding, the learning path, lesson content, profile, achievements, leaderboards, shop, and desktop web views.

Reproduce the **design logic**: hierarchy, spacing, layout, component shapes, information density, navigation patterns, and interaction feedback. Do not reproduce Duolingo's visual identity.

## 1. Non-negotiable brand boundaries

- Use the product's existing brand palette. Do not derive, prescribe, or import Duolingo colors, color values, or color combinations.
- Use the product's existing typefaces. Do not identify, import, or imitate Duolingo's typeface. Reproduce the hierarchy through size, weight, line height, and spacing only.
- Do not use Duolingo's logo, owl, characters, illustrations, badges, proprietary icons, sounds, or branded copy.
- Create original illustrations and icons that fit the product's own subject matter.
- Do not copy a screen pixel-for-pixel. Translate the layout and interaction pattern to the app's own content and information architecture.
- Color may communicate state only through the app's existing semantic tokens. Never introduce new color assignments as part of this skill.

## 2. Core design principles

### 2.1 One clear job per screen

Every screen should have one obvious primary purpose and one visually dominant next action. Keep secondary actions quieter and visually subordinate. Avoid presenting several equally prominent calls to action.

### 2.2 Guided, progressive disclosure

Reveal information in the order users need it. Break long processes into short, understandable steps. Use progress indicators, numbered stages, completion markers, and contextual helper text to explain where the user is and what comes next.

### 2.3 Friendly, compact structure

Prefer a clear vertical content flow over dense dashboards. Use grouped cards, short sections, concise labels, and predictable alignment. Keep enough white space for clarity, but do not leave large empty areas without a purpose.

### 2.4 Tactile interface surfaces

Controls should feel pressable and understandable. Use rounded rectangles, consistent corner radii, subtle borders, and restrained depth cues. Buttons, cards, and selectable rows should have unmistakable interaction states.

### 2.5 Progress should be visible

Where the product has goals, tasks, levels, streaks, completion, or milestones, show progress near the related action. Prefer simple progress bars, step markers, completion icons, and compact statistics over large analytical visualizations.

### 2.6 Supportive feedback

Use short, contextual messages to acknowledge success, explain errors, and encourage the next step. Keep feedback near the action that caused it. Do not rely on color alone to communicate a state.

## 3. Layout and spacing system

Use a 4 px base spacing unit. Apply a consistent scale rather than choosing arbitrary gaps screen by screen.

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | 4 px | Icon-to-label micro gap, tight inline grouping |
| `space-2` | 8 px | Related labels, compact list rows |
| `space-3` | 12 px | Card internals, form field groups |
| `space-4` | 16 px | Standard content gap and mobile side padding baseline |
| `space-6` | 24 px | Section separation, larger card padding |
| `space-8` | 32 px | Major content groups |
| `space-10` | 40 px | Screen-level vertical separation |
| `space-12` | 48 px | Large transitions between major regions |

These are starting tokens, not immutable pixel measurements from the screenshots. Preserve the rhythm and adjust for the target device and content.

### Mobile layout

- Design for a narrow portrait viewport first. Use a single primary content column.
- Start with 16–20 px horizontal page gutters. Increase only when the device width justifies it.
- Keep the main content aligned to a consistent vertical grid. Avoid cards that shift unpredictably between sections.
- Use 12–16 px between related cards and 24–32 px between major sections.
- Reserve space for system safe areas. Do not let sticky actions or bottom navigation overlap scrollable content.
- Keep primary actions in a predictable location. For onboarding and focused tasks, a bottom-pinned action area is appropriate.
- Keep bottom navigation visually separate from the scrollable content and consistently positioned across top-level screens.

### Desktop and web layout

- Use a stable left navigation rail for primary destinations when the product has several top-level sections.
- Keep navigation labels paired with simple, original icons. Maintain consistent icon alignment and label spacing.
- Constrain the main content to a readable maximum width rather than stretching every card across a very wide monitor.
- Use a centered main column or a clear main-plus-secondary-column layout where the content benefits from it.
- Use two-column grids for compact statistics or related modules. Use a single-column list for long, sequential content such as achievements or activity.
- Maintain the same component language as mobile; desktop should be an adaptation, not a different product.

## 4. Typography hierarchy

Use the app's existing font family throughout. Match the reference's hierarchy and density without copying its specific typeface.

| Role | Mobile starting size | Weight and treatment | Usage |
|---|---:|---|---|
| Screen title | 22–26 px | Semibold or bold; compact line height | Main screen heading |
| Section title | 18–20 px | Semibold or bold | Section and card-group headings |
| Card title | 15–17 px | Semibold | Card names, lesson names, item labels |
| Body | 14–16 px | Regular; comfortable line height | Explanations and descriptions |
| Supporting text | 12–14 px | Regular or medium | Metadata, hints, secondary descriptions |
| Eyebrow / micro label | 10–12 px | Semibold; optional uppercase and tracking | Categories, progress labels, compact metadata |
| Button label | 13–15 px | Bold or semibold | Short action labels |

Rules:

- Use a clear difference between title, section title, body, and metadata; do not create a separate size for every component.
- Keep body copy comfortably readable. Avoid long paragraphs inside narrow cards.
- Use short line lengths and natural wrapping. Avoid manually breaking every heading into decorative lines.
- Use uppercase sparingly for small labels, not for paragraphs or long headings.
- Use consistent line heights: approximately 1.15–1.25 for headings and 1.4–1.55 for body copy.
- Use weight and spacing to establish hierarchy before adding decorative treatments.

## 5. Shape, depth, and component treatment

### Surfaces and cards

- Use rounded rectangular cards as the primary grouping device.
- Start with 12–16 px card corner radii. Use larger radii only for larger containers or deliberately softer surfaces.
- Prefer a subtle outline or restrained elevation to separate cards from the page. Avoid heavy, blurred shadows.
- Keep card padding consistent: typically 12–16 px for compact cards and 16–20 px for larger content cards.
- Use dividers sparingly inside a card. Prefer spacing and alignment to separate related content.

### Buttons

- Primary buttons should be easy to notice and easy to hit. Use a 48–56 px target height as a starting range.
- Use a full-width primary button when the screen has one main action, especially in onboarding and lesson flows.
- Keep button labels short, action-led, and centered.
- Secondary actions should use a quieter outlined, text, or low-emphasis treatment.
- Provide distinct default, pressed, focused, disabled, loading, and completed states.
- A subtle lower edge or pressed-depth treatment may create a tactile feel, but do not overdo the effect or make controls look skeuomorphic.

### Selection and answer cards

- Make the entire card or row selectable, not just a tiny radio control.
- Keep the label and supporting detail aligned consistently.
- Selected, correct, incorrect, and disabled states must be distinguishable through more than color: use border treatment, iconography, text, or layout feedback.
- Use a clear gap between selectable options. Do not compress touch targets to fit more choices.

### Progress indicators

- Use simple horizontal progress bars, segmented steps, circular lesson nodes, or completion markers.
- Keep the progress indicator close to the task it describes.
- Pair progress with a short label or value when the meaning is not self-evident.
- Use consistent thickness, corner treatment, and label placement across the product.

### Icons and illustrations

- Use simple, friendly, instantly recognizable original icons.
- Keep icons optically aligned with text and consistent in visual weight.
- Use expressive illustration as a focal point in onboarding, empty states, milestones, and feedback moments—not as decoration in every card.
- Keep illustrations visually separate from dense text and interface controls.
- Never use Duolingo's owl or recreate its character designs.

## 6. Navigation patterns

### Mobile

- Use a persistent bottom tab bar for the product's primary destinations when the information architecture supports it.
- Keep the number of primary tabs limited; use a secondary destination or overflow area for less frequent actions.
- Use an icon with a concise label where space allows. Keep the active tab state unambiguous.
- Give the tab bar a stable height and consistent hit areas. Include safe-area padding.
- Do not change tab order or icon placement between screens.

### Desktop

- Use a persistent vertical navigation rail or sidebar for top-level areas.
- Keep the active destination visibly distinct using the app's own existing state treatment.
- Align icons, labels, and spacing across all navigation rows.
- Avoid duplicating primary navigation in both the sidebar and the page header unless a genuine secondary navigation is needed.

## 7. Screen patterns to reuse

### 7.1 Onboarding and account setup

- Keep the screen focused on one step at a time.
- Use a short title, one compact explanatory paragraph, and a focused illustration or simple visual anchor.
- Use a top progress cue when onboarding has multiple steps.
- Place the primary action consistently, often in a bottom action area.
- Place account alternatives or secondary actions beneath or beside the primary action with lower emphasis.
- Validate inputs inline and explain what needs fixing without forcing users to infer the error.

### 7.2 Home and progression screen

- Put compact account or progress metrics near the top when they help orient the user.
- Give the current section a clear header or summary card.
- Make the next recommended activity the strongest focal point.
- If the product has sequential progress, represent it as a path or ordered set of nodes. Make the current node prominent, completed nodes recognizable, and locked or upcoming nodes visibly secondary.
- Use occasional supporting illustrations to create personality without obscuring the path.
- Keep secondary rewards or resources compact and subordinate to the main activity.

### 7.3 Lesson, task, or guided workflow

- Show progress and an exit or back action in a predictable top area.
- Keep the question or task prompt visually dominant.
- Place supporting content directly below the prompt.
- Use large, well-spaced answer or action cards.
- Keep the primary continue/check action in a stable bottom area when the screen is task-focused.
- After submission, provide clear feedback before moving to the next step. Preserve the user's context and selection where appropriate.

### 7.4 Profile and account overview

- Start with a compact identity or profile summary.
- Group statistics into small, scannable cards rather than a large table.
- Use a two-column layout for a small set of related metrics when space permits.
- Place achievements, activity, or social information in stacked sections below the summary.
- Use consistent rows with a small leading visual, title, short description, and optional progress indicator.

### 7.5 Leaderboards and social progress

- Make the current user's position easy to find.
- Use consistent list rows with rank, avatar or original identity marker, display name, and score/progress value.
- Keep rows aligned and evenly spaced; avoid changing row anatomy for each entry.
- Use a restrained highlight for the current user and clear empty/locked states when data is unavailable.

### 7.6 Quests, achievements, and milestones

- Present each achievement as a compact, repeatable module.
- Include a distinct icon or original badge, a concise name, a one-line goal, and progress when relevant.
- Keep completion state visible without making the card unnecessarily large.
- Group related achievements under clear section titles.

### 7.7 Shop, inventory, and rewards

- Use a simple category structure and repeatable item cards.
- Keep item illustration, name, cost or requirement, and action in a predictable arrangement.
- Make locked, available, selected, and purchased states explicit.
- Avoid allowing reward visuals to overwhelm the actual item information or purchase action.

## 8. Interaction and state rules

Every interactive component must define its states before implementation.

- **Default:** quiet, clearly interactive, and visually consistent with its component family.
- **Hover:** use only where a pointer exists; do not rely on hover for essential information.
- **Pressed:** provide immediate tactile feedback through a small surface or position change.
- **Focused:** provide a clearly visible keyboard focus treatment.
- **Selected:** make the selected option unmistakable through shape, border, icon, label, or a combination.
- **Disabled:** communicate that the control is unavailable and prevent interaction.
- **Loading:** retain the control's place in the layout and explain the in-progress action where useful.
- **Success:** confirm completion close to the action and show the next reasonable step.
- **Error:** explain the problem and the recovery action in plain language.
- **Locked / upcoming:** show why an item is unavailable or what must happen next whenever that information is known.

Do not make the interface depend on animation to communicate status. Motion should be short and purposeful: confirm an action, show a transition, or direct attention. Respect reduced-motion preferences.

## 9. Responsive behavior

- Preserve the same hierarchy and component anatomy across screen sizes.
- On mobile, collapse desktop side navigation into the product's mobile navigation pattern; do not simply squeeze the sidebar into the content area.
- Convert multi-column statistic or card grids into one column when cards become too narrow to scan.
- Keep action buttons full width when they are the main mobile action; allow appropriately sized inline buttons on wider screens.
- Preserve readable line lengths and avoid overly wide paragraph blocks on desktop.
- Ensure the bottom navigation and sticky action areas do not cover the last content item.
- Test narrow mobile, standard mobile, tablet, and desktop widths. Do not rely on one screenshot size.

## 10. Accessibility and usability requirements

- Aim for at least 44 × 44 px interactive hit areas; 48 px is a useful default for primary touch controls.
- Maintain adequate text contrast using the app's own existing palette and semantic tokens.
- Never communicate correct/incorrect, selected/unselected, or enabled/disabled states through color alone.
- Give icon-only controls accessible names and tooltips where appropriate.
- Preserve logical heading order, keyboard navigation, visible focus, and form labels.
- Keep instructions concise and place them next to the field or action they explain.
- Avoid tiny metadata text when it carries important information.

## 11. Quality checklist before shipping

- [ ] The screen has one obvious primary action.
- [ ] The title, section headings, body, and metadata follow the defined type hierarchy.
- [ ] Page gutters, card padding, and section gaps follow the spacing scale.
- [ ] Cards, buttons, selection rows, and progress indicators use consistent shape and dimensions.
- [ ] Navigation is stable across the relevant screen family.
- [ ] Progress and completion states are visible where they matter.
- [ ] Every interactive element has default, pressed, focus, disabled, and feedback states as applicable.
- [ ] The layout works at mobile and desktop breakpoints without cramped cards or excessive empty space.
- [ ] Illustrations and icons are original and belong to the app's own subject matter.
- [ ] The app's existing fonts and palette are preserved; no Duolingo brand assets or styling tokens have been introduced.

## 12. Instruction to an AI design or coding agent

When asked to create or modify a screen, first identify its screen pattern from Section 7. Reuse the spacing, typography, card, navigation, and interaction rules in this skill. Inspect the existing app before changing it; preserve its current colors, fonts, brand assets, data model, and established component conventions unless explicitly instructed otherwise. Build responsive, production-usable components rather than a static imitation. Do not redesign unrelated screens. Explain which components and layout rules were applied, and call out any assumptions where the reference does not specify behavior.

The desired result is a friendly, guided, tactile, progress-oriented product interface with clear hierarchy and repeatable components—recognizably inspired by the *design approach* of the supplied references, but original to the app.
