import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import type {
  CertificateRecord,
  CurriculumTrack,
  DeepDiveExpansion,
  LanguageId,
  LearningFocus,
  ModuleAccuracyEntry,
  ReferenceEntry,
  SkillLevel,
  UserProfile,
} from '../types/curriculum';
import {
  canGenerateCurriculumToday,
  computeAttemptAccuracy,
  computeTrackAccuracyAndStars,
  toLocalDateKey,
  type DailyQuotaStatus,
} from '../utils/curriculumLogic';

interface OnboardingPayload {
  username: string;
  preferredLanguage: LanguageId;
  skillLevel: SkillLevel;
  learningFocus: LearningFocus;
  dailyModuleGoal: number;
}

interface AppAuthContextValue {
  user: User | null;
  authReady: boolean;
  dataLoading: boolean;
  profile: UserProfile | null;
  tracks: CurriculumTrack[];
  certificates: CertificateRecord[];
  referenceEntries: ReferenceEntry[];
  quota: DailyQuotaStatus;
  activeTrack: CurriculumTrack | null;
  activeModuleId: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string>;
  saveOnboardingProfile: (payload: OnboardingPayload) => Promise<void>;
  updateSettingsProfile: (payload: OnboardingPayload) => Promise<void>;
  saveGeneratedTrack: (track: CurriculumTrack, todayKey: string) => Promise<void>;
  redoTrack: (trackId: string) => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  selectTrackAndModule: (trackId: string | null, moduleId: string | null) => Promise<void>;
  toggleModuleComplete: (moduleId: string, forceValue?: boolean) => Promise<void>;
  recordChallengeAttempt: (moduleId: string, passed: boolean) => Promise<void>;
  saveModuleDeepDive: (
    trackId: string,
    moduleId: string,
    deepDive: DeepDiveExpansion,
  ) => Promise<void>;
  issueTrackCertificate: (track: CurriculumTrack) => Promise<CertificateRecord>;
  saveReferenceEntry: (entry: ReferenceEntry) => Promise<void>;
  deleteReferenceEntry: (entryId: string) => Promise<void>;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [tracksLoaded, setTracksLoaded] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tracks, setTracks] = useState<CurriculumTrack[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [referenceEntries, setReferenceEntries] = useState<ReferenceEntry[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setProfile(null);
        setTracks([]);
        setCertificates([]);
        setReferenceEntries([]);
        setProfileLoaded(true);
        setTracksLoaded(true);
      } else {
        setProfileLoaded(false);
        setTracksLoaded(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const uid = user.uid;
    const profilePath = `users/${uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfile>;
          setProfile({
            uid,
            username: data.username ?? user.displayName ?? 'Learner',
            dailyModuleGoal: Number(data.dailyModuleGoal) || 2,
            onboardingCompleted: Boolean(data.onboardingCompleted),
            preferredLanguage: data.preferredLanguage ?? 'python',
            skillLevel: data.skillLevel ?? 'intern',
            learningFocus: data.learningFocus ?? 'syntax',
            lastGeneratedDate: data.lastGeneratedDate ?? '',
            dailyGenerationCount: Number(data.dailyGenerationCount) || 0,
            activeTrackId: data.activeTrackId ?? null,
            activeModuleId: data.activeModuleId ?? null,
            completedModuleIds: Array.isArray(data.completedModuleIds)
              ? data.completedModuleIds
              : [],
            moduleCompletedAt:
              data.moduleCompletedAt && typeof data.moduleCompletedAt === 'object'
                ? data.moduleCompletedAt
                : {},
            moduleAccuracy:
              data.moduleAccuracy && typeof data.moduleAccuracy === 'object'
                ? data.moduleAccuracy
                : {},
          });
        } else {
          setProfile(null);
        }
        setProfileLoaded(true);
      },
      (error) => {
        setProfileLoaded(true);
        handleFirestoreError(error, OperationType.GET, profilePath);
      },
    );

    const tracksPath = `users/${uid}/tracks`;
    const unsubTracks = onSnapshot(
      query(collection(db, 'users', uid, 'tracks'), orderBy('createdAt', 'desc')),
      (snap) => {
        setTracks(snap.docs.map((d) => d.data() as CurriculumTrack));
        setTracksLoaded(true);
      },
      (error) => {
        setTracksLoaded(true);
        handleFirestoreError(error, OperationType.LIST, tracksPath);
      },
    );

    const certsPath = `users/${uid}/certificates`;
    const unsubCerts = onSnapshot(
      query(
        collection(db, 'users', uid, 'certificates'),
        orderBy('issuedAt', 'desc'),
      ),
      (snap) => {
        setCertificates(snap.docs.map((d) => d.data() as CertificateRecord));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, certsPath);
      },
    );

    const refsPath = `users/${uid}/references`;
    const unsubRefs = onSnapshot(
      query(
        collection(db, 'users', uid, 'references'),
        orderBy('createdAt', 'desc'),
      ),
      (snap) => {
        setReferenceEntries(snap.docs.map((d) => d.data() as ReferenceEntry));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, refsPath);
      },
    );

    return () => {
      unsubProfile();
      unsubTracks();
      unsubCerts();
      unsubRefs();
    };
  }, [authReady, user]);

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signUpWithEmail(email: string, password: string) {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signOutUser() {
    await signOut(auth);
  }

  async function getIdToken(): Promise<string> {
    if (!auth.currentUser) {
      throw new Error('Authentication required.');
    }
    return auth.currentUser.getIdToken();
  }

  async function saveOnboardingProfile(payload: OnboardingPayload) {
    if (!user) throw new Error('Sign in required.');
    const uid = user.uid;
    const path = `users/${uid}`;
    const safeUsername = payload.username.trim().slice(0, 40) || 'Learner';
    const safeGoal = Math.max(1, Math.min(10, Math.round(payload.dailyModuleGoal) || 2));

    try {
      if (!profile) {
        await setDoc(doc(db, 'users', uid), {
          uid,
          username: safeUsername,
          dailyModuleGoal: safeGoal,
          onboardingCompleted: true,
          preferredLanguage: payload.preferredLanguage,
          skillLevel: payload.skillLevel,
          learningFocus: payload.learningFocus,
          lastGeneratedDate: '',
          dailyGenerationCount: 0,
          activeTrackId: null,
          activeModuleId: null,
          completedModuleIds: [],
          moduleCompletedAt: {},
          moduleAccuracy: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, 'users', uid), {
          username: safeUsername,
          dailyModuleGoal: safeGoal,
          onboardingCompleted: true,
          preferredLanguage: payload.preferredLanguage,
          skillLevel: payload.skillLevel,
          learningFocus: payload.learningFocus,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async function updateSettingsProfile(payload: OnboardingPayload) {
    return saveOnboardingProfile(payload);
  }

  async function saveGeneratedTrack(track: CurriculumTrack, todayKey: string) {
    if (!user) throw new Error('Sign in required.');
    const uid = user.uid;
    const trackPath = `users/${uid}/tracks/${track.id}`;
    const userPath = `users/${uid}`;

    const sanitizedTrack: Record<string, unknown> = {
      id: track.id,
      uid,
      language: track.language,
      title: track.title.slice(0, 160),
      subtitle: (track.subtitle ?? '').slice(0, 280),
      skillLevel: track.skillLevel,
      learningFocus: track.learningFocus,
      paceDepth: track.paceDepth,
      priorBackground: (track.priorBackground ?? '').slice(0, 320),
      bridgingStrategy: (track.bridgingStrategy ?? '').slice(0, 400),
      createdAt: track.createdAt,
      redoCount: 0,
      modules: track.modules.slice(0, 16),
    };

    try {
      await setDoc(doc(db, 'users', uid, 'tracks', track.id), sanitizedTrack);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, trackPath);
    }

    try {
      await updateDoc(doc(db, 'users', uid), {
        lastGeneratedDate: todayKey.slice(0, 10),
        dailyGenerationCount: 1,
        activeTrackId: track.id,
        activeModuleId: track.modules[0]?.id ?? null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  async function redoTrack(trackId: string) {
    if (!user || !profile) return;
    const target = tracks.find((t) => t.id === trackId);
    if (!target) return;

    const uid = user.uid;
    const moduleIds = new Set(target.modules.map((m) => m.id));
    const nextCompleted = profile.completedModuleIds.filter((id) => !moduleIds.has(id));
    const nextCompletedAt = { ...profile.moduleCompletedAt };
    const nextAccuracy = { ...profile.moduleAccuracy };
    for (const id of moduleIds) {
      delete nextCompletedAt[id];
      delete nextAccuracy[id];
    }

    const trackPath = `users/${uid}/tracks/${trackId}`;
    try {
      await updateDoc(doc(db, 'users', uid, 'tracks', trackId), {
        redoCount: (target.redoCount ?? 0) + 1,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, trackPath);
    }

    const userPath = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        activeTrackId: trackId,
        activeModuleId: target.modules[0]?.id ?? null,
        completedModuleIds: nextCompleted,
        moduleCompletedAt: nextCompletedAt,
        moduleAccuracy: nextAccuracy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  async function deleteTrack(trackId: string) {
    if (!user || !profile) return;
    const uid = user.uid;
    const target = tracks.find((t) => t.id === trackId);
    const trackPath = `users/${uid}/tracks/${trackId}`;

    try {
      await deleteDoc(doc(db, 'users', uid, 'tracks', trackId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, trackPath);
    }

    const removedIds = new Set(target?.modules.map((m) => m.id) ?? []);
    const nextCompleted = profile.completedModuleIds.filter((id) => !removedIds.has(id));
    const nextCompletedAt = { ...profile.moduleCompletedAt };
    const nextAccuracy = { ...profile.moduleAccuracy };
    for (const id of removedIds) {
      delete nextCompletedAt[id];
      delete nextAccuracy[id];
    }

    const remainingTracks = tracks.filter((t) => t.id !== trackId);
    const nextActiveTrack =
      profile.activeTrackId === trackId
        ? remainingTracks[0] ?? null
        : remainingTracks.find((t) => t.id === profile.activeTrackId) ??
          remainingTracks[0] ??
          null;

    const userPath = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        activeTrackId: nextActiveTrack ? nextActiveTrack.id : null,
        activeModuleId: nextActiveTrack?.modules[0]?.id ?? null,
        completedModuleIds: nextCompleted,
        moduleCompletedAt: nextCompletedAt,
        moduleAccuracy: nextAccuracy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  async function selectTrackAndModule(
    trackId: string | null,
    moduleId: string | null,
  ) {
    if (!user || !profile) return;
    const uid = user.uid;
    const userPath = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        activeTrackId: trackId,
        activeModuleId: moduleId,
        completedModuleIds: profile.completedModuleIds,
        moduleCompletedAt: profile.moduleCompletedAt,
        moduleAccuracy: profile.moduleAccuracy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  async function toggleModuleComplete(moduleId: string, forceValue?: boolean) {
    if (!user || !profile) return;
    const uid = user.uid;
    const exists = profile.completedModuleIds.includes(moduleId);
    const shouldComplete = forceValue !== undefined ? forceValue : !exists;

    const nextCompleted = shouldComplete
      ? exists
        ? profile.completedModuleIds
        : [...profile.completedModuleIds, moduleId]
      : profile.completedModuleIds.filter((id) => id !== moduleId);

    const nextCompletedAt = { ...profile.moduleCompletedAt };
    if (shouldComplete) {
      if (!nextCompletedAt[moduleId]) {
        nextCompletedAt[moduleId] = new Date().toISOString();
      }
    } else {
      delete nextCompletedAt[moduleId];
    }

    const userPath = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        activeTrackId: profile.activeTrackId,
        activeModuleId: profile.activeModuleId,
        completedModuleIds: nextCompleted,
        moduleCompletedAt: nextCompletedAt,
        moduleAccuracy: profile.moduleAccuracy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  async function recordChallengeAttempt(moduleId: string, passed: boolean) {
    if (!user || !profile) return;
    const uid = user.uid;
    const prev = profile.moduleAccuracy[moduleId] ?? {
      attempts: 0,
      passed: false,
      bestAccuracy: 0,
    };
    const nextAttempts = prev.attempts + 1;
    const attemptScore = computeAttemptAccuracy(nextAttempts, passed);
    const nextBest = Math.max(prev.bestAccuracy, attemptScore);

    const nextAccuracy: Record<string, ModuleAccuracyEntry> = {
      ...profile.moduleAccuracy,
      [moduleId]: {
        attempts: nextAttempts,
        passed: prev.passed || passed,
        bestAccuracy: nextBest,
      },
    };

    let nextCompleted = profile.completedModuleIds;
    const nextCompletedAt = { ...profile.moduleCompletedAt };
    if (passed && !nextCompleted.includes(moduleId)) {
      nextCompleted = [...nextCompleted, moduleId];
      nextCompletedAt[moduleId] = new Date().toISOString();
    }

    const userPath = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), {
        activeTrackId: profile.activeTrackId,
        activeModuleId: profile.activeModuleId,
        completedModuleIds: nextCompleted,
        moduleCompletedAt: nextCompletedAt,
        moduleAccuracy: nextAccuracy,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }

  async function saveModuleDeepDive(
    trackId: string,
    moduleId: string,
    deepDive: DeepDiveExpansion,
  ) {
    if (!user) return;
    const target = tracks.find((t) => t.id === trackId);
    if (!target) return;
    const uid = user.uid;
    const nextModules = target.modules.map((m) =>
      m.id === moduleId ? { ...m, deepDive } : m,
    );
    const trackPath = `users/${uid}/tracks/${trackId}`;
    try {
      await updateDoc(doc(db, 'users', uid, 'tracks', trackId), {
        modules: nextModules,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, trackPath);
    }
  }

  async function issueTrackCertificate(
    track: CurriculumTrack,
  ): Promise<CertificateRecord> {
    if (!user || !profile) {
      throw new Error('Sign in required.');
    }
    const uid = user.uid;
    const existingCert = certificates.find((c) => c.trackId === track.id);
    if (existingCert) {
      return existingCert;
    }

    const summary = computeTrackAccuracyAndStars(
      track,
      profile.moduleAccuracy,
      profile.completedModuleIds,
    );

    const now = Date.now();
    const certId = `cert-${track.id}-${now}`.slice(0, 120);
    const codeSuffix = now.toString(36).toUpperCase().slice(-6);
    const record: CertificateRecord = {
      id: certId,
      uid,
      trackId: track.id,
      trackTitle: track.title.slice(0, 160),
      language: track.language,
      username: profile.username.slice(0, 40),
      accuracyPercent: summary.accuracyPercent,
      stars: summary.stars,
      completedModulesCount: track.modules.length,
      certificateCode: `RC-${track.language.toUpperCase()}-${codeSuffix}`,
      issuedAt: new Date(now).toISOString(),
    };

    const certPath = `users/${uid}/certificates/${certId}`;
    try {
      await setDoc(doc(db, 'users', uid, 'certificates', certId), record);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, certPath);
    }
    return record;
  }

  async function saveReferenceEntry(entry: ReferenceEntry) {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/references/${entry.id}`;
    try {
      await setDoc(doc(db, 'users', uid, 'references', entry.id), {
        id: entry.id,
        uid,
        category: entry.category,
        concept: entry.concept.slice(0, 140),
        description: entry.description.slice(0, 400),
        createdAt: entry.createdAt,
        snippets: entry.snippets,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async function deleteReferenceEntry(entryId: string) {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/references/${entryId}`;
    try {
      await deleteDoc(doc(db, 'users', uid, 'references', entryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  const activeTrack = useMemo(
    () =>
      tracks.find((t) => t.id === profile?.activeTrackId) ?? tracks[0] ?? null,
    [tracks, profile?.activeTrackId],
  );

  const activeModuleId =
    profile?.activeModuleId ?? activeTrack?.modules[0]?.id ?? null;

  const quota = useMemo(
    () =>
      canGenerateCurriculumToday(
        profile?.lastGeneratedDate ?? '',
        profile?.dailyGenerationCount ?? 0,
        new Date(),
      ),
    [profile?.lastGeneratedDate, profile?.dailyGenerationCount],
  );

  const dataLoading = Boolean(user) && (!profileLoaded || !tracksLoaded);

  const value: AppAuthContextValue = {
    user,
    authReady,
    dataLoading,
    profile,
    tracks,
    certificates,
    referenceEntries,
    quota,
    activeTrack,
    activeModuleId,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
    getIdToken,
    saveOnboardingProfile,
    updateSettingsProfile,
    saveGeneratedTrack,
    redoTrack,
    deleteTrack,
    selectTrackAndModule,
    toggleModuleComplete,
    recordChallengeAttempt,
    saveModuleDeepDive,
    issueTrackCertificate,
    saveReferenceEntry,
    deleteReferenceEntry,
  };

  return (
    <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>
  );
}

export function useAppAuth(): AppAuthContextValue {
  const ctx = useContext(AppAuthContext);
  if (!ctx) {
    throw new Error('useAppAuth must be used inside AppAuthProvider.');
  }
  return ctx;
}

export { toLocalDateKey };
