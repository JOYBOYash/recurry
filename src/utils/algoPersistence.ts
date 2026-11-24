import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type {
  AlgoAdaptResponse,
  AlgoConceptId,
  AlgoDecomposeResponse,
  AlgoLanguageAdapter,
  AlgoProblemBlueprint,
  AlgoUserProgress,
} from '../types/algo';
import type { LanguageId } from '../types/curriculum';
import { mergeAlgoProblemLibraries } from './algoLogic';

const LOCAL_PROGRESS_PREFIX = 'recurry:algo-progress:v1:';
const LOCAL_DRAFT_PREFIX = 'recurry:algo-drafts:v1:';

function getLocalProgressKey(uid: string): string {
  return `${LOCAL_PROGRESS_PREFIX}${uid}`;
}

function getLocalDraftKey(uid: string): string {
  return `${LOCAL_DRAFT_PREFIX}${uid}`;
}

export function loadAlgoCodeDraft(
  uid: string,
  problemId: string,
  language: LanguageId,
): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(getLocalDraftKey(uid));
    if (!raw) return '';
    const parsed = JSON.parse(raw) as Record<string, string>;
    const val = parsed?.[`${problemId}:${language}`];
    return typeof val === 'string' ? val : '';
  } catch {
    return '';
  }
}

export function saveAlgoCodeDraft(
  uid: string,
  problemId: string,
  language: LanguageId,
  code: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(getLocalDraftKey(uid));
    const current = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    current[`${problemId}:${language}`] = code.slice(0, 16_000);
    window.localStorage.setItem(getLocalDraftKey(uid), JSON.stringify(current));
  } catch {
    // Ignore storage quota or private-browsing errors.
  }
}

export function clearAlgoCodeDraft(
  uid: string,
  problemId: string,
  language: LanguageId,
): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(getLocalDraftKey(uid));
    if (!raw) return;
    const current = JSON.parse(raw) as Record<string, string>;
    delete current[`${problemId}:${language}`];
    window.localStorage.setItem(getLocalDraftKey(uid), JSON.stringify(current));
  } catch {
    // Ignore storage access restrictions.
  }
}

export function loadLocalAlgoProgressMap(
  uid: string,
): Record<string, AlgoUserProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getLocalProgressKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AlgoUserProgress>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveLocalAlgoProgress(
  uid: string,
  progress: AlgoUserProgress,
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadLocalAlgoProgressMap(uid);
    current[progress.problemId] = progress;
    window.localStorage.setItem(
      getLocalProgressKey(uid),
      JSON.stringify(current),
    );
  } catch {
    // Ignore storage quota or private-browsing errors.
  }
}

export function clearLocalAlgoProgress(uid?: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      window.localStorage.removeItem(getLocalProgressKey(uid));
      window.localStorage.removeItem(getLocalDraftKey(uid));
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith(LOCAL_PROGRESS_PREFIX) ||
          key.startsWith(LOCAL_DRAFT_PREFIX))
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access restrictions.
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const raw = await res.text();
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
  const trimmed = raw.trim();

  if (
    contentType.includes('text/html') ||
    trimmed.startsWith('<!') ||
    trimmed.startsWith('<html')
  ) {
    throw new Error(
      `Algo endpoint returned HTML instead of JSON (HTTP ${res.status}). Check that the API server is running.`,
    );
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = trimmed ? (JSON.parse(trimmed) as Record<string, unknown>) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed.error === 'string' && parsed.error) ||
      `Request failed (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  if (!parsed) {
    throw new Error('Server returned an empty response. Please try again.');
  }
  return parsed as unknown as T;
}

export async function fetchSharedAlgoLibrary(
  token: string,
): Promise<AlgoProblemBlueprint[]> {
  const [serverProblems, firestoreProblems] = await Promise.all([
    fetch('/api/algo/problems', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => parseJsonResponse<{ problems: AlgoProblemBlueprint[] }>(res))
      .then((data) => (Array.isArray(data.problems) ? data.problems : []))
      .catch(() => [] as AlgoProblemBlueprint[]),
    isFirebaseConfigured
      ? getDocs(
          query(
            collection(db, 'algoProblems'),
            orderBy('createdAt', 'desc'),
            limit(60),
          ),
        )
          .then((snap) =>
            snap.docs.map((d) => d.data() as AlgoProblemBlueprint),
          )
          .catch(() => [] as AlgoProblemBlueprint[])
      : Promise.resolve([] as AlgoProblemBlueprint[]),
  ]);

  return mergeAlgoProblemLibraries(firestoreProblems, serverProblems);
}

export async function fetchAlgoProblemDetail(
  token: string,
  problemId: string,
  language: LanguageId,
): Promise<{
  blueprint: AlgoProblemBlueprint | null;
  adapter: AlgoLanguageAdapter | null;
}> {
  let blueprint: AlgoProblemBlueprint | null = null;
  let adapter: AlgoLanguageAdapter | null = null;

  // 1. Check Firestore shared library first if configured.
  if (isFirebaseConfigured) {
    try {
      const [bpSnap, adSnap] = await Promise.all([
        getDoc(doc(db, 'algoProblems', problemId)),
        getDoc(doc(db, 'algoProblems', problemId, 'adapters', language)),
      ]);
      if (bpSnap.exists()) {
        blueprint = bpSnap.data() as AlgoProblemBlueprint;
      }
      if (adSnap.exists()) {
        adapter = adSnap.data() as AlgoLanguageAdapter;
      }
    } catch {
      // Quiet fallback to API server cache if Firestore rules aren't deployed yet.
    }
  }

  // 2. Fall back to or enrich from server cache store.
  if (!blueprint || !adapter) {
    try {
      const res = await fetch(
        `/api/algo/problems/${encodeURIComponent(problemId)}?language=${encodeURIComponent(language)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await parseJsonResponse<{
          blueprint: AlgoProblemBlueprint;
          adapter: AlgoLanguageAdapter | null;
        }>(res);
        if (!blueprint && data.blueprint) {
          blueprint = data.blueprint;
        }
        if (!adapter && data.adapter) {
          adapter = data.adapter;
        }
      }
    } catch {
      // Return whatever we resolved so far.
    }
  }

  return { blueprint, adapter };
}

export async function syncAlgoBlueprintToFirestore(
  blueprint: AlgoProblemBlueprint,
  adapter: AlgoLanguageAdapter,
  currentUid: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const bpRef = doc(db, 'algoProblems', blueprint.id);
    const existing = await getDoc(bpRef);
    if (!existing.exists()) {
      await setDoc(bpRef, {
        ...blueprint,
        createdByUid: currentUid,
        availableLanguages: Array.from(
          new Set([...blueprint.availableLanguages, adapter.language]),
        ),
      });
    } else {
      await updateDoc(bpRef, {
        availableLanguages: arrayUnion(adapter.language),
      });
    }

    const adRef = doc(
      db,
      'algoProblems',
      blueprint.id,
      'adapters',
      adapter.language,
    );
    const existingAd = await getDoc(adRef);
    if (!existingAd.exists()) {
      await setDoc(adRef, adapter);
    }
  } catch {
    // Non-fatal: server store already persisted the blueprint + adapter.
  }
}

export async function syncAlgoAdapterToFirestore(
  problemId: string,
  adapter: AlgoLanguageAdapter,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const adRef = doc(db, 'algoProblems', problemId, 'adapters', adapter.language);
    const existingAd = await getDoc(adRef);
    if (!existingAd.exists()) {
      await setDoc(adRef, adapter);
    }
    const bpRef = doc(db, 'algoProblems', problemId);
    const existingBp = await getDoc(bpRef);
    if (existingBp.exists()) {
      await updateDoc(bpRef, {
        availableLanguages: arrayUnion(adapter.language),
      });
    }
  } catch {
    // Non-fatal: server store already persisted the adapter.
  }
}

export async function requestAlgoDecompose(params: {
  token: string;
  uid: string;
  language: LanguageId;
  concept: AlgoConceptId;
  problemText?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AlgoDecomposeResponse> {
  const res = await fetch('/api/algo/decompose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      language: params.language,
      concept: params.concept,
      problemText: params.problemText,
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType,
    }),
  });

  const data = await parseJsonResponse<AlgoDecomposeResponse>(res);
  void syncAlgoBlueprintToFirestore(data.blueprint, data.adapter, params.uid);
  return data;
}

export async function requestAlgoLanguageAdapter(params: {
  token: string;
  problemId: string;
  language: LanguageId;
  blueprint?: AlgoProblemBlueprint;
}): Promise<AlgoAdaptResponse> {
  // 1. Check Firestore cache first before calling the API.
  if (isFirebaseConfigured) {
    try {
      const adSnap = await getDoc(
        doc(db, 'algoProblems', params.problemId, 'adapters', params.language),
      );
      if (adSnap.exists()) {
        return {
          adapter: adSnap.data() as AlgoLanguageAdapter,
          cacheHit: true,
        };
      }
    } catch {
      // Continue to server endpoint.
    }
  }

  const res = await fetch('/api/algo/adapt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      problemId: params.problemId,
      language: params.language,
      blueprint: params.blueprint,
    }),
  });

  const data = await parseJsonResponse<AlgoAdaptResponse>(res);
  void syncAlgoAdapterToFirestore(params.problemId, data.adapter);
  return data;
}

export async function fetchUserAlgoProgressMap(
  uid: string,
): Promise<Record<string, AlgoUserProgress>> {
  const localMap = loadLocalAlgoProgressMap(uid);
  if (!isFirebaseConfigured) return localMap;

  try {
    const snap = await getDocs(collection(db, 'users', uid, 'algoProgress'));
    const merged: Record<string, AlgoUserProgress> = { ...localMap };
    for (const d of snap.docs) {
      const remote = d.data() as AlgoUserProgress;
      const existing = merged[remote.problemId];
      if (!existing || (remote.updatedAt ?? '') >= (existing.updatedAt ?? '')) {
        merged[remote.problemId] = remote;
      }
    }
    return merged;
  } catch {
    return localMap;
  }
}

export async function saveUserAlgoProgress(
  uid: string,
  progress: AlgoUserProgress,
): Promise<void> {
  saveLocalAlgoProgress(uid, progress);
  if (!isFirebaseConfigured) return;

  try {
    await setDoc(
      doc(db, 'users', uid, 'algoProgress', progress.problemId),
      progress,
    );
  } catch {
    // Non-fatal: local uid-scoped progress already saved.
  }
}
