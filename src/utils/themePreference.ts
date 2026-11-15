export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'recurry:theme-preference:v1';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function parseThemePreference(raw: string | null | undefined): ThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  return 'system';
}

export function isLandingPathname(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

export function resolveThemeForRoute(
  preference: ThemePreference,
  systemPrefersDark: boolean,
  pathname: string,
): ResolvedTheme {
  if (isLandingPathname(pathname)) {
    return 'light';
  }
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

export function loadThemePreference(
  storage: StorageLike | null = getDefaultStorage(),
): ThemePreference {
  if (!storage) return 'system';
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage write errors
  }
}
