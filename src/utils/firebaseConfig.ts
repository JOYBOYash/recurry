export interface FirebaseEnvInput {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_MEASUREMENT_ID?: string;
  VITE_FIREBASE_DATABASE_ID?: string;
}

export interface FirebaseFallbackConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

export interface ResolvedFirebaseClientConfig {
  firebaseConfig: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId: string;
    measurementId?: string;
  };
  databaseId?: string;
  source: 'env' | 'fallback' | 'unconfigured';
}

function clean(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveFirebaseClientConfig(
  env: FirebaseEnvInput,
  fallback?: FirebaseFallbackConfig | null,
): ResolvedFirebaseClientConfig {
  const envApiKey = clean(env.VITE_FIREBASE_API_KEY);
  const envProjectId = clean(env.VITE_FIREBASE_PROJECT_ID);
  const envAppId = clean(env.VITE_FIREBASE_APP_ID);
  const envAuthDomain = clean(env.VITE_FIREBASE_AUTH_DOMAIN);
  const envDbId = clean(env.VITE_FIREBASE_DATABASE_ID);

  const useEnv = Boolean(envApiKey || envProjectId || envAppId);

  if (useEnv) {
    const projectId = envProjectId || clean(fallback?.projectId);
    const databaseId =
      envDbId && envDbId !== '(default)' ? envDbId : undefined;

    const firebaseConfig: ResolvedFirebaseClientConfig['firebaseConfig'] = {
      apiKey: envApiKey || clean(fallback?.apiKey),
      authDomain:
        envAuthDomain ||
        (projectId ? `${projectId}.firebaseapp.com` : clean(fallback?.authDomain)),
      projectId,
      appId: envAppId || clean(fallback?.appId),
    };

    const storageBucket = clean(env.VITE_FIREBASE_STORAGE_BUCKET);
    if (storageBucket) {
      firebaseConfig.storageBucket = storageBucket;
    } else if (projectId) {
      firebaseConfig.storageBucket = `${projectId}.firebasestorage.app`;
    }

    const messagingSenderId = clean(env.VITE_FIREBASE_MESSAGING_SENDER_ID);
    if (messagingSenderId) {
      firebaseConfig.messagingSenderId = messagingSenderId;
    }

    const measurementId = clean(env.VITE_FIREBASE_MEASUREMENT_ID);
    if (measurementId) {
      firebaseConfig.measurementId = measurementId;
    }

    const configured = Boolean(
      firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
    );

    return {
      firebaseConfig,
      databaseId,
      source: configured ? 'env' : 'unconfigured',
    };
  }

  const fbApiKey = clean(fallback?.apiKey);
  const fbProjectId = clean(fallback?.projectId);
  const fbAppId = clean(fallback?.appId);

  if (fbApiKey && fbProjectId && fbAppId) {
    const fbDbId = clean(fallback?.firestoreDatabaseId);
    const firebaseConfig: ResolvedFirebaseClientConfig['firebaseConfig'] = {
      apiKey: fbApiKey,
      authDomain:
        clean(fallback?.authDomain) || `${fbProjectId}.firebaseapp.com`,
      projectId: fbProjectId,
      appId: fbAppId,
    };

    const storageBucket = clean(fallback?.storageBucket);
    if (storageBucket) firebaseConfig.storageBucket = storageBucket;

    const messagingSenderId = clean(fallback?.messagingSenderId);
    if (messagingSenderId) firebaseConfig.messagingSenderId = messagingSenderId;

    const measurementId = clean(fallback?.measurementId);
    if (measurementId) firebaseConfig.measurementId = measurementId;

    return {
      firebaseConfig,
      databaseId: fbDbId && fbDbId !== '(default)' ? fbDbId : undefined,
      source: 'fallback',
    };
  }

  return {
    firebaseConfig: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      appId: '',
    },
    databaseId: undefined,
    source: 'unconfigured',
  };
}
