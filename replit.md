# Bloom

A calm, minimalist student productivity web app whose philosophy is "studying is rewarded with better studying."

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/bloom run dev` — run the Bloom web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, Tailwind, Framer Motion
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bloom` — the web frontend: Home (`/`), Planner (`/planner`), Subjects (`/subjects`), Subject workspace (`/subjects/:id`), Focus Tracker (`/focus`)
- `artifacts/api-server/src/routes` — dashboard, planner-items, study-sessions, focus-sessions, quotes, subjects, storage routes
- `lib/db/src/schema` — `plannerItems`, `studySessions`, `userStats`, `subjects`, `subjectNotes`, `subjectFiles`, `focusSessions`
- `lib/api-spec/openapi.yaml` — source of truth for the API contract
- `lib/object-storage-web` — client-side upload helpers (Uppy-based, not currently used in Bloom UI — upload is done via direct fetch + `useRequestUploadUrl` hook instead)

## Architecture decisions

- `planner_items` is a single unified table for every schedulable item (homework, exam, event, study block, note) with a `type` discriminator.
- `study_sessions` logs actual completed focus time (feeds "study minutes today", streak, Bloom Progress), distinct from a *scheduled* study block on the planner.
- `user_stats` is a singleton row (id=1) holding `bloomProgressPercent` and `focusStreakDays`.
- **Subjects**: `subjects` table (id, name unique, emoji, masteryPercent, createdAt). Subject–planner-item and subject–study-session linkage is done by **exact name string match** on the existing `plannerItems.subject` and `studySessions.subject` free-text columns — no FK. This is intentional; old seed rows with different names simply won't link.
- **Object storage upload** — the upload route (`POST /storage/uploads/request-url`) has **no auth guard**. This is deliberate: Bloom has no multi-user auth (single user "Kira"). A future session should NOT add auth to just this route without adding auth app-wide. See `.agents/memory/subjects-feature.md`.
- **Focus Tracker**: `focus_sessions` stores the timer lifecycle separately from legacy `study_sessions`; ending a focus session also writes its duration to `study_sessions` so existing dashboard streak/minutes/progress integrations continue to work. The Focus page owns timer elapsed state, while the API owns persisted start/end timestamps, reflection fields, history filters, and aggregate charts.
- The user is hardcoded as "Kira" (from the original design brief) — no auth yet.

## Product

- Home Dashboard (`/`): dynamic greeting, today's focus (study time), stat cards (tasks due, exams, streak), today's schedule timeline, quick actions, Bloom Progress bar, daily quote.
- Planner (`/planner`): unified Today/Week/Month views over all planner item types, type filter chips, monthly calendar with per-type colored dots, floating "+" to create any item type, swipe-to-complete/delete on mobile (DnD uses framer-motion; `isDragging` state gates the hint overlay to prevent stuck-drag UI bug).
- Subjects (`/subjects`): responsive grid of subject binder cards — each shows emoji, name, mastery label+bar, notes count, and next upcoming homework/exam. Includes "Add Subject" card. Mastery levels: Just Started (0-33%), Growing (34-66%), Confident (67-89%), Mastered (90%+).
- Subject Workspace (`/subjects/:id`): 7-tab binder — 📚 Notes (create/edit/delete rich text notes), 📄 Files (upload via GCS presigned URL + record metadata), 🎯 Mastery (slider to update mastery %), 📅 Planner (subject's upcoming planner items), 📊 Progress (study minutes, task completion), 🔥 Continue Studying (study technique suggestions), 🩷 Recent Activity (merged timeline of notes/files/sessions/planner items).
- Focus Tracker (`/focus`): calm timer with setup fields, real-time start/pause/resume/end controls, reflection dialog, floating petals, rotating quotes, streak badge, searchable/filterable/sortable focus history, and Recharts statistics for daily, subject, and weekly focus.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
