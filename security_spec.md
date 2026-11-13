# recurry — Firestore Security Specification

## 1. Data Invariants
1. A `UserProfile` document (`/users/{userId}`) can only be read, created, or updated by the authenticated owner (`request.auth.uid == userId`).
2. `uid` and `createdAt` on `/users/{userId}` are immutable after creation; `createdAt` must equal `request.time` on create, and `updatedAt` must equal `request.time` on create/update.
3. `dailyGenerationCount` must never exceed `1` (`0 <= dailyGenerationCount <= 1`).
4. Subcollection documents (`tracks/{trackId}`, `certificates/{certId}`, `references/{entryId}`) must belong to the parent `{userId}` (`data.uid == userId`), match their path ID (`data.id == docId`), and have valid `isValidId()` path segments.
5. `certificates/{certId}` are immutable once issued (`allow update, delete: if false;`), with `stars` bounded `1..5` and `accuracyPercent` bounded `0..100`.
6. Zero PII (`email`, passwords) is stored in Firestore user profile documents.

## 2. The "Dirty Dozen" Payloads (Expected: `PERMISSION_DENIED`)
1. Unauthenticated read of `/users/u1`
2. Cross-user read of `/users/u2` while signed in as `u1`
3. Creating `/users/u1` with spoofed `uid: "u2"`
4. Creating `/users/u1` with an extra shadow field (`isAdmin: true`)
5. Creating `/users/u1` with `dailyGenerationCount: 5` (bypassing 1/day limit)
6. Updating `/users/u1` to mutate `uid` or `createdAt`
7. Client-forged timestamp on `/users/u1` (`createdAt: "2020-01-01"`) instead of `serverTimestamp()`
8. Oversized ID path poisoning (`/users/u1/tracks/<200-char-invalid-id!>`)
9. Creating a track with `language: "ruby"` (outside Beginning Five)
10. Creating a track with `modules: []` (empty list) or `> 16` modules
11. Creating a certificate with `stars: 99` or `accuracyPercent: 150`
12. Updating or deleting an issued certificate at `/users/u1/certificates/cert-1`

## 3. Authentication Provider Note
- **Google OAuth** sets `email_verified = true` automatically.
- **Email & Password** users authenticate via Firebase Auth (`request.auth != null`) and immediately configure their non-PII `username` and track preferences in `/onboarding` with strict `isOwner(userId)` isolation.
