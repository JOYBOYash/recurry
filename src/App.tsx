import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppAuthProvider } from './context/AppAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CertificatesPage } from './pages/CertificatesPage';
import { CurriculumsPage } from './pages/CurriculumsPage';
import { GeneratingTrackView } from './pages/GeneratingTrackView';
import { LandingPage } from './pages/LandingPage';
import { LearnPage } from './pages/LearnPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingView } from './pages/OnboardingView';
import { ReferencePage } from './pages/ReferencePage';
import { SettingsPage } from './pages/SettingsPage';
import { SigningInView } from './pages/SigningInView';
import { StreaksPage } from './pages/StreaksPage';

export default function App() {
  return (
    <AppAuthProvider>
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
              <Route path="streaks" element={<StreaksPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="reference" element={<ReferencePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </AppAuthProvider>
  );
}
