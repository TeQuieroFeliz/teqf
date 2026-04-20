import admin, { ServiceAccount } from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

let firestore: Firestore | undefined;
let auth: Auth | undefined;

const hasCredentials =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL;

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
  }
}

export { firestore, auth };
