import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  parseFocusModeValue,
  serializeFocusModeValue,
} from '../utils/uxFlowLogic';

const FOCUS_MODE_STORAGE_KEY = 'recurry:focus-mode:v1';

interface FocusModeContextValue {
  focusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
}

const FocusModeContext = createContext<FocusModeContextValue | null>(null);

function readInitialFocusMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return parseFocusModeValue(window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusModeState] = useState<boolean>(readInitialFocusMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FOCUS_MODE_STORAGE_KEY,
        serializeFocusModeValue(focusMode),
      );
    } catch {
      // Ignore private-mode storage restrictions.
    }
  }, [focusMode]);

  const setFocusMode = useCallback((enabled: boolean) => {
    setFocusModeState(enabled);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusModeState((prev) => !prev);
  }, []);

  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode(): FocusModeContextValue {
  const ctx = useContext(FocusModeContext);
  if (!ctx) {
    throw new Error('useFocusMode must be used inside FocusModeProvider');
  }
  return ctx;
}
