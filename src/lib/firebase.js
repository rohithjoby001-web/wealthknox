// Firebase bootstrap. Reads its config from Vite env vars so no real
// project credentials ever need to live in source control — see
// .env.example for the exact variable names.
//
// If the env vars aren't set (fresh clone, nobody's run Firebase setup
// yet), `isFirebaseConfigured` is false and the rest of the app falls
// back to the original localStorage-only, single-device behavior. This
// file must stay import-safe in that case: it never throws just because
// Firebase isn't configured.
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The three fields every Firebase web app needs at minimum to actually
// reach a project. The others are optional for what this app uses.
export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(config);

  auth = getAuth(app);
  // Keep the person signed in across visits/reloads (same idea as any
  // normal app login), not just for the current tab session.
  setPersistence(auth, browserLocalPersistence).catch(() => {
    /* best-effort — auth still works without this, just doesn't persist as long */
  });

  // persistentLocalCache is what makes the app offline-first: reads and
  // writes go through an on-device cache (IndexedDB) first, work with no
  // connection at all, and sync to the server automatically once one is
  // available. persistentMultipleTabManager lets that cache be shared
  // safely if the person has the app open in more than one tab.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
}

export { app, auth, db };
