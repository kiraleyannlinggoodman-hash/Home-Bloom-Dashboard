---
name: Expo workspace dependency installation
description: Dependency links can be missing from an existing Expo workspace even when package.json declares them.
---

For an existing Expo artifact, declared packages may still be absent from that package's node_modules after a partial setup. A filtered pnpm install for the exact workspace package restores the links without adding dependencies to the monorepo root.

**Why:** Expo fails before Metro starts when a config plugin such as expo-notifications is declared but not resolvable from the artifact directory; the generic package installer targets the workspace root and is blocked by pnpm.

**How to apply:** Check the artifact's node_modules and use `pnpm install --filter <workspace-package>` when dependencies are already declared. Then restart the managed Expo workflow and inspect Metro logs.