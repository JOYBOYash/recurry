import type {
  CertificateRecord,
  CurriculumTrack,
  ReferenceEntry,
  UserProfile,
} from '../types/curriculum';

export const OFFLINE_WORKSPACE_STORAGE_KEY = 'recurry:offline-workspace:v1';

export interface OfflineWorkspaceSnapshot {
  version: 1;
  uid: string;
  savedAt: string;
  profile: UserProfile | null;
  tracks: CurriculumTrack[];
  certificates: CertificateRecord[];
  referenceEntries: ReferenceEntry[];
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function resolveDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return null;
}

export function buildOfflineWorkspaceSnapshot(params: {
  uid: string;
  profile: UserProfile | null;
  tracks: CurriculumTrack[];
  certificates: CertificateRecord[];
  referenceEntries: ReferenceEntry[];
  now?: Date;
}): OfflineWorkspaceSnapshot {
  return {
    version: 1,
    uid: params.uid,
    savedAt: (params.now ?? new Date()).toISOString(),
    profile: params.profile,
    tracks: params.tracks,
    certificates: params.certificates,
    referenceEntries: params.referenceEntries,
  };
}

export function hasStartedActiveCurriculum(
  snapshot: Pick<OfflineWorkspaceSnapshot, 'profile' | 'tracks'> | null,
): boolean {
  if (!snapshot || snapshot.tracks.length === 0) return false;
  const activeId = snapshot.profile?.activeTrackId;
  if (activeId && snapshot.tracks.some((t) => t.id === activeId)) {
    return true;
  }
  return snapshot.tracks.some((t) => t.modules.length > 0);
}

export function saveOfflineWorkspaceSnapshot(
  snapshot: OfflineWorkspaceSnapshot,
  storage: StorageLike | null = resolveDefaultStorage(),
): boolean {
  if (!storage || !snapshot.uid) return false;
  try {
    storage.setItem(OFFLINE_WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function loadOfflineWorkspaceSnapshot(
  uid: string,
  storage: StorageLike | null = resolveDefaultStorage(),
): OfflineWorkspaceSnapshot | null {
  if (!storage || !uid) return null;
  try {
    const raw = storage.getItem(OFFLINE_WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OfflineWorkspaceSnapshot>;
    if (parsed.version !== 1 || parsed.uid !== uid) return null;
    return {
      version: 1,
      uid,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
      profile: parsed.profile ?? null,
      tracks: Array.isArray(parsed.tracks) ? parsed.tracks : [],
      certificates: Array.isArray(parsed.certificates) ? parsed.certificates : [],
      referenceEntries: Array.isArray(parsed.referenceEntries)
        ? parsed.referenceEntries
        : [],
    };
  } catch {
    return null;
  }
}

export function clearOfflineWorkspaceSnapshot(
  storage: StorageLike | null = resolveDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(OFFLINE_WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage removal errors
  }
}
