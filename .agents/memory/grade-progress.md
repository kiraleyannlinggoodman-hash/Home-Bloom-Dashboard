---
name: Grade Progress architecture
description: Durable data and UI decisions for Bloom's Grade Progress Tracker.
---

The Progress Tracker stores one row per subject in `progress_grades`; `term1` through `term4` are nullable integers from 0–100. The table response is the only source used by the term bar chart and dynamic subject line charts.

**Why:** Keeping one normalized row shape prevents duplicated chart datasets and makes blank future terms distinct from a zero grade.

**How to apply:** Use the existing Subjects API to populate subject selects. New subject binders should become available to grade rows without chart code changes. After create/update/delete, invalidate the generated progress-grades query key.