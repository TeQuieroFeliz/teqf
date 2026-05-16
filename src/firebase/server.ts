import admin, { ServiceAccount } from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

function createFirebaseStub() {
  const createProxy = (): any =>
    new Proxy(() => Promise.reject(new Error(
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.'
    )), {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) return 'FirebaseStub';
        if (prop === 'then') return undefined;
        return createProxy();
      },
      apply() {
        return Promise.reject(new Error(
          'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.'
        ));
      },
    });

  return createProxy();
}

function createAuthStub() {
  const createProxy = (): any =>
    new Proxy(() => Promise.reject(new Error(
      'Firebase Admin Auth is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.'
    )), {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) return 'FirebaseAuthStub';
        if (prop === 'then') return undefined;
        return createProxy();
      },
      apply() {
        return Promise.reject(new Error(
          'Firebase Admin Auth is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.'
        ));
      },
    });

  return createProxy();
}

const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL;

let firestore: Firestore = createFirebaseStub() as unknown as Firestore;
let auth: Auth = createAuthStub() as unknown as Auth;

if (hasCredentials) {
  try {
    const serviceAccount = {
      type: 'service_account',
      universe_domain: 'googleapis.com',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    };

    const currentApps = getApps();
    const app = currentApps.length
      ? currentApps[0]
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount as ServiceAccount) });

    firestore = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('[Firebase Admin] Initialization failed:', error);
    firestore = createFirebaseStub();
    auth = createAuthStub();
  }
} else {
  console.warn('[Firebase Admin] Missing service account credentials, using stubbed Firebase Admin.');
}

export { firestore, auth };
