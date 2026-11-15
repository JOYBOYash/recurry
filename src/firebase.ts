import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import {
  resolveFirebaseClientConfig,
  type FirebaseFallbackConfig,
} from './utils/firebaseConfig';

const fallbackModules = import.meta.glob<{ default?: FirebaseFallbackConfig }>(
  '../firebase-applet-config.json',
  { eager: true },
);
const fallbackEntry = Object.values(fallbackModules)[0];
const fallbackConfig = fallbackEntry?.default ?? (fallbackEntry as FirebaseFallbackConfig | undefined) ?? null;

const resolved = resolveFirebaseClientConfig(import.meta.env, fallbackConfig);

export const isFirebaseConfigured = resolved.source !== 'unconfigured';

if (!isFirebaseConfigured) {
  console.error(
    'Firebase is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID in your environment.',
  );
}

const app: FirebaseApp = initializeApp(resolved.firebaseConfig);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      resolved.databaseId || undefined,
    );
  } catch {
    return resolved.databaseId
      ? getFirestore(app, resolved.databaseId)
      : getFirestore(app);
  }
}

export const db: Firestore = createFirestoreInstance();
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
