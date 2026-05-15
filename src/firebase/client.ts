import { getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let db: Firestore | undefined;

const currentApps = getApps();
const isBrowser = typeof window !== 'undefined';
const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
const hasStorageBucket = Boolean(firebaseConfig.storageBucket);

if (isBrowser && hasFirebaseConfig) {
  if (!currentApps.length) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    if (hasStorageBucket) {
      storage = getStorage(app);
    } else {
      console.warn(
        '[Firebase Client] Firebase Storage non inizializzato: manca NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.'
      );
    }
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch (error) {
      console.warn(
        '[Firebase Client] IndexedDB cache è indisponibile, uso memoria locale.',
        error
      );
      db = initializeFirestore(app, { localCache: memoryLocalCache() });
    }
  } else {
    const app = currentApps[0];
    auth = getAuth(app);
    if (hasStorageBucket) {
      storage = getStorage(app);
    } else {
      console.warn(
        '[Firebase Client] Firebase Storage non inizializzato: manca NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.'
      );
    }
    db = getFirestore(app);
  }
} else if (!isBrowser && !hasFirebaseConfig) {
  console.warn('[Firebase Client] Skipping browser Firebase initialization because public config is missing or unavailable.');
}

export { auth, storage, db };
