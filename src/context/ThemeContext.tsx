import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  loadThemePreference,
  resolveThemeForRoute,
  saveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../utils/themePreference';

interface ThemeContextValue {
  preference: ThemePreference;
  systemPrefersDark: boolean;
  resolvedTheme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    loadThemePreference(),
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = useMemo(
    () => resolveThemeForRoute(preference, systemPrefersDark, pathname),
    [preference, systemPrefersDark, pathname],
  );

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    root.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
  }, [resolvedTheme]);

  function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    saveThemePreference(next);
  }

  return (
    <ThemeContext.Provider
      value={{
        preference,
        systemPrefersDark,
        resolvedTheme,
        setPreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider.');
  }
  return ctx;
}
