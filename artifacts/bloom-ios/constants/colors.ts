/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#0a0a0a',
    tint: '#2f95dc',

    // Core surfaces
    background: '#fffdfb',
    foreground: '#3d2633',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#3d2633',

    // Primary action color (buttons, links, active states)
    primary: '#e9a8c2',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#f7dce6',
    secondaryForeground: '#8e536d',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#faeef2',
    mutedForeground: '#8f7b84',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#dbe8d5',
    accentForeground: '#3d593d',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#f1dce4',
    input: '#ecd6df',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 24,
};

export default colors;
