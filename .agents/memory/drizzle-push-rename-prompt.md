---
name: Drizzle push table rename prompt
description: drizzle-kit push can hang requiring a TTY prompt when a schema change looks like a table rename (old table dropped, new table added in the same push).
---

When a Drizzle schema change removes one or more tables and adds new one(s) in the same push (e.g. consolidating several tables into one unified table), `drizzle-kit push` tries to ask interactively "was this table renamed from X, or is it new?" and fails with `Interactive prompts require a TTY terminal` in this environment — `--force` does not bypass this specific prompt (it only skips data-loss confirmations).

**Why:** the agent sandbox shell is non-interactive, so any push relying on that prompt cannot complete no matter how many times it's retried.

**How to apply:** before running `pnpm --filter @workspace/db run push` after a schema change that drops table(s), drop the old table(s) directly via a `DROP TABLE IF EXISTS ... CASCADE` SQL statement first (via the database execute-SQL tool), then run the push — with no ambiguous old table present, Drizzle creates the new table cleanly without prompting.
