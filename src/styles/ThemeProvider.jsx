import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { flattenTokens } from "./theme.js";

const ThemeContext = createContext(null);

// Write every flattened token as a CSS custom property on :root. On theme
// swap the previous theme's vars are cleared first so stale tokens from a
// larger theme don't leak into a smaller one.
function applyTokens(flatMap, prevKeysRef) {
  const root = document.documentElement.style;
  // Clear vars written by the previous theme
  if (prevKeysRef.current) {
    for (const key of prevKeysRef.current) root.removeProperty(key);
  }
  const keys = Object.keys(flatMap);
  for (const key of keys) root.setProperty(key, flatMap[key]);
  prevKeysRef.current = keys;
}

export function ThemeProvider({ theme, children }) {
  const prevKeysRef = useRef(null);

  // useLayoutEffect so vars are on :root before the first paint.
  useLayoutEffect(() => {
    applyTokens(flattenTokens(theme), prevKeysRef);
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

// For the rare case where a component needs the raw JS object (e.g.,
// computing a dynamic value that can't be expressed as a CSS var).
export function useTheme() {
  return useContext(ThemeContext);
}
