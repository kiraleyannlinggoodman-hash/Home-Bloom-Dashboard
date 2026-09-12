---
name: Expo SDK 57 upgrade
description: Workspace-specific constraints and environment behavior when moving the native app to Expo SDK 57.
---

Expo SDK 57 in this workspace requires the shared React catalog and root overrides to resolve React 19.2.3, because the native app uses catalog dependencies. TypeScript 6 also rejects the deprecated `baseUrl` compiler option, so path aliases must work without it.

**Why:** Expo’s automatic dependency alignment cannot override workspace-level catalog and pnpm override constraints, and SDK 57’s toolchain surfaces the TypeScript deprecation as a build error.

**How to apply:** When upgrading or reinstalling the native artifact, check the workspace catalog and root overrides before adding exclusions. Keep native tab metadata on `NativeTabs.Trigger.*` static components and configure splash assets through the `expo-splash-screen` plugin.

The Replit Linux preview may log an optional React Native DevTools startup error when `libglib-2.0.so.0` is unavailable. Metro still starts and serves the Expo Go QR/web bundle; treat this as an environment warning unless the app bundle fails.

**Why:** The DevTools binary is not required for Metro or Expo Go, and adding system packages is outside the managed Expo app’s dependency scope.

**How to apply:** Verify the workflow reaches the Metro QR/web output and confirm the resolved Expo manifest reports SDK 57.