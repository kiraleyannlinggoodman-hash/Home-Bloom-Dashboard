---
name: Focus Tracker architecture
description: Durable integration decisions for the Bloom Focus Tracker.
---

The Focus Tracker uses a dedicated `focus_sessions` lifecycle table because the existing `study_sessions` table only records completed duration/date. A completed focus session is also mirrored into `study_sessions`.

**Why:** This preserves the existing dashboard streak, daily study minutes, and Bloom Progress behavior while adding timer start/end timestamps and reflection data without changing the old table contract.

**How to apply:** Keep timer UI state local to the Focus page; persist lifecycle transitions through the focus-sessions API. If the legacy study-session schema changes, verify the mirror write in the end-session route.