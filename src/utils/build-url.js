// Shareable build URLs — encode/decode full build state to/from the URL fragment.
// Option A: plain btoa/atob (no compression). Upgrade to CompressionStream if needed.

import { BuildSchemaV1 } from '../schemas/build.js';
import { THEMES } from '../styles/themes/index.js';

// Reverse-lookup: find the THEMES registry key for a given theme object,
// or undefined if it's the default (unregistered) theme.
function findThemeId(themeObj) {
  for (const [id, theme] of Object.entries(THEMES)) {
    if (theme === themeObj) return id;
  }
  return undefined;
}

/**
 * Encode the current build state into a URL-safe base64 string.
 * Returns the fragment (without the leading '#').
 */
export function encodeBuild({ selectedClass, weapon, religion, selectedPerks, selectedSkills, selectedSpells, activeBuffs, selectedTransformations, activeForm, target, gear, currentTheme }) {
  const payload = {
    v: 1,
    class: selectedClass,
    weapon,
    religion,
    perks: selectedPerks,
    skills: selectedSkills,
    spells: selectedSpells,
    buffs: Object.keys(activeBuffs).filter(k => activeBuffs[k]),
    transformations: selectedTransformations,
    activeForm,
    target,
    gear,
    theme: findThemeId(currentTheme),
  };
  // btoa only handles Latin-1; use TextEncoder for safety with any unicode in item names
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Decode a URL fragment string back into validated build state.
 * Returns null if the fragment is empty, malformed, or fails validation.
 */
export function decodeBuild(fragment) {
  if (!fragment) return null;
  try {
    const binary = atob(fragment);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const raw = JSON.parse(json);
    switch (raw?.v) {
      case 1: {
        const result = BuildSchemaV1.safeParse(raw);
        if (!result.success) return null;
        return result.data;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Resolve the theme object from a decoded build's theme ID string.
 * Returns the matched theme or null if not found / not specified.
 */
export function resolveTheme(themeId) {
  if (!themeId) return null;
  return THEMES[themeId] || null;
}
