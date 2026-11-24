import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppAuthProvider } from './context/AppAuthContext';
import { FocusModeProvider } from './context/FocusModeContext';
import { ThemeProvider } from './context/ThemeContext';
import { AlgoModePage } from './pages/AlgoModePage';
import { CurriculumsPage } from './pages/CurriculumsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { GeneratingTrackView } from './pages/GeneratingTrackView';
import { LandingPage } from './pages/LandingPage';
import { LearnPage } from './pages/LearnPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingView } from './pages/OnboardingView';
import { ProfilePage } from './pages/ProfilePage';
import { ReferencePage } from './pages/ReferencePage';
import { SettingsPage } from './pages/SettingsPage';
import { SigningInView } from './pages/SigningInView';

export default function App() {
  return (
    <AppAuthProvider>
      <FocusModeProvider>
        <BrowserRouter>
          <ThemeProvider>
            <OfflineIndicator />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/signing-in" element={<SigningInView />} />
              <Route path="/onboarding" element={<OnboardingView />} />
              <Route path="/onboarding/:step" element={<OnboardingView />} />
              <Route path="/generate" element={<GeneratingTrackView />} />

              <Route path="/app" element={<AppShell />}>
                <Route index element={<Navigate to="/app/curriculums" replace />} />
                <Route path="curriculums" element={<CurriculumsPage />} />
                <Route path="learn" element={<LearnPage />} />
                <Route path="learn/:trackId" element={<LearnPage />} />
                <Route path="algo" element={<AlgoModePage />} />
                <Route path="algo/:problemId" element={<AlgoModePage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route
                  path="streaks"
                  element={<Navigate to="/app/profile?tab=streaks" replace />}
                />
                <Route
                  path="certificates"
                  element={<Navigate to="/app/profile?tab=certificates" replace />}
                />
                <Route path="reference" element={<ReferencePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="diagnostics" element={<DiagnosticsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ThemeProvider>
        </BrowserRouter>
      </FocusModeProvider>
    </AppAuthProvider>
  );
}
