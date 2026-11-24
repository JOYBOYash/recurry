# recurry — Firestore Security Specification

## 1. Data Invariants
1. A `UserProfile` document (`/users/{userId}`) can only be read, created, or updated by the authenticated owner (`request.auth.uid == userId`).
2. `uid` and `createdAt` on `/users/{userId}` are immutable after creation; `createdAt` must equal `request.time` on create, and `updatedAt` must equal `request.time` on create/update.
3. `dailyGenerationCount` must never exceed `1` (`0 <= dailyGenerationCount <= 1`).
4. Subcollection documents (`tracks/{trackId}`, `certificates/{certId}`, `references/{entryId}`) must belong to the parent `{userId}` (`data.uid == userId`), match their path ID (`data.id == docId`), and have valid `isValidId()` path segments.
5. `certificates/{certId}` are immutable once issued (`allow update, delete: if false;`), with `stars` bounded `1..5` and `accuracyPercent` bounded `0..100`.
6. Zero PII (`email`, passwords) is stored in Firestore user profile or Algo Mode documents.
7. Shared Algo Mode blueprints (`/algoProblems/{problemId}`) are readable by authenticated users, creatable once by an authenticated user with `createdByUid == request.auth.uid` (no overwrites/deletes of canonical steps), and updatable ONLY to append valid language IDs to `availableLanguages` without mutating any canonical field.
8. Shared Algo Mode language adapters (`/algoProblems/{problemId}/adapters/{languageId}`) are immutable once created (`allow update, delete: if false;`), keyed by valid language IDs (`sql`, `java`, `cpp`, `python`, `javascript`, `ruby`), and bounded to 3–12 step hints.
9. Private Algo Mode progress (`/users/{userId}/algoProgress/{problemId}`) is strictly owner-isolated (`request.auth.uid == userId`), validates `uid == userId` and `problemId == docId`, and never leaks to other learners.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. Unauthenticated read of `/users/u1` or `/algoProblems/algo-add-two-numbers`
2. Cross-user read or write of `/users/u2` or `/users/u2/algoProgress/algo-add-two-numbers` while signed in as `u1`
3. Creating `/users/u1` with spoofed `uid: "u2"`
4. Creating `/users/u1` with an extra shadow field (`isAdmin: true`)
5. Creating `/users/u1` with `dailyGenerationCount: 5` (bypassing 1/day limit)
6. Updating `/users/u1` to mutate `uid` or `createdAt`
7. Client-forged timestamp on `/users/u1` (`createdAt: "2020-01-01"`) instead of `serverTimestamp()`
8. Oversized ID path poisoning (`/users/u1/tracks/<200-char-invalid-id!>` or `/algoProblems/<invalid-id!>`)
9. Creating a track or adapter with an unsupported language (`language: "cobol"`)
10. Creating a track with `modules: []` or `> 16` modules, or an Algo blueprint with `< 3` or `> 12` steps
11. Mutating canonical `steps` or `fingerprint` on an existing `/algoProblems/{problemId}` document, or deleting a shared problem/adapter
12. Updating or deleting an issued certificate at `/users/u1/certificates/cert-1` or overwriting an existing adapter at `/algoProblems/algo-add-two-numbers/adapters/python`

## 3. Authentication Provider Note
- **Google OAuth** sets `email_verified = true` automatically.
- **Email & Password** users authenticate via Firebase Auth (`request.auth != null`) and immediately configure their non-PII `username` and track preferences in `/onboarding` with strict `isOwner(userId)` isolation.
