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

- `artifacts/bloom` — the web frontend: Home dashboard (`/`) and Planner (`/planner`)
- `artifacts/api-server/src/routes` — dashboard/planner-items/study-sessions/quotes routes
- `lib/db/src/schema` — `plannerItems` (unified homework/exam/event/study_block/note table), `studySessions`, `userStats` (singleton row for streak + Bloom Progress)
- `lib/api-spec/openapi.yaml` — source of truth for the API contract

## Architecture decisions

- `planner_items` is a single unified table for every schedulable item (homework, exam, event, study block, note) with a `type` discriminator, rather than separate per-type tables — this powers both the Home dashboard (today's schedule, tasks due, upcoming exams) and the Planner page (today/week/month views, filters, calendar dots) from one source of truth, so an item created in one place is always consistent everywhere.
- `study_sessions` stays a separate table from `planner_items` — it logs actual completed focus time (feeds "study minutes today", streak, Bloom Progress), distinct from a *scheduled* study block on the planner.
- `user_stats` is a singleton row (id=1) holding `bloomProgressPercent` and `focusStreakDays`, since these are derived personal-growth metrics rather than naturally computed from other tables. Logging a study session nudges both; completing a planner item nudges progress slightly (and completing a study_block also logs its duration as a study session).
- The user is hardcoded as "Kira" (from the original design brief) — no auth yet.

## Product

- Home Dashboard (`/`): dynamic greeting, today's focus (study time), stat cards (tasks due, exams, streak), today's schedule timeline, quick actions to add homework/study sessions/events/notes, Bloom Progress bar, and a rotating daily quote.
- Planner (`/planner`): unified Today/Week/Month views over all planner item types, type filter chips, monthly calendar with per-type colored dots, floating "+" to create any item type, swipe-to-complete/delete on mobile.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
