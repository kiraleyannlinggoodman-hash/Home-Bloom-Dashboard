---
name: Subjects feature decisions
description: Architecture and deviations for the Subjects binder feature (subjects, subjectNotes, subjectFiles tables, object storage, no-auth upload).
---

## Subject-to-planner-item matching
`plannerItems.subject` and `studySessions.subject` remain free-text strings; subject workspace queries match by exact `subjects.name` string. No FK. Old seed data with different names (e.g. "Math" vs "Mathematics") intentionally won't link — by design.

**Why:** Adding a FK would require migrating existing seeded rows and changing the planner create modal to a dropdown. The dropdown change was included in the frontend build.

## Object storage — no auth guard on upload route
The upload endpoint (`POST /storage/uploads/request-url`) has no auth check. This is deliberate: Bloom has no multi-user auth anywhere (single hardcoded user "Kira"). Adding auth just for this route would be inconsistent.

**Why:** Object storage skill mandates auth, but Bloom's no-auth posture is intentional scope. A future session should NOT "fix" this by adding auth unless auth is being added app-wide.

**How to apply:** If auth is ever added to Bloom, revisit `artifacts/api-server/src/routes/storage.ts` and restore the `hasAuthenticatedSession` guard.

## Generated hook signatures (orval)
Orval generates hooks with bare params: `useGetSubject(id: number)`, `useListSubjectNotes(id: number)`, etc. — NOT `useGetSubject({ id })`. Always grep the generated file before wiring hooks, especially after schema changes.

## Planner DnD fix
The stuck-drag bug was caused by no `isDragging` state — the hint overlay (✅/🗑️) was always mounted behind the card and only became invisible when x=0. Fix: `isDragging` state gated by `onDragStart`/`onDragEnd`, with a `finally` block ensuring reset, a window-level `pointerup`/`pointercancel` safety net, and `dragMomentum={false}` to prevent overshoot.

## Subject workspace file upload flow
No Uppy/ObjectUploader used — implemented directly: `useRequestUploadUrl` mutation → `fetch` PUT to GCS presigned URL → `useCreateSubjectFile` to record metadata. Simpler than Uppy and avoids CSS/bundle complexity.
