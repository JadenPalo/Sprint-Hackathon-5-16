import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  enableIndexedDbPersistence,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: FirebaseServices | null = null;
let persistenceAttempted = false;

function hasFirebaseEnv(): boolean {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID
  );
}

export function isFirebaseEnabled(): boolean {
  return import.meta.env.VITE_USE_FIREBASE === "true" && hasFirebaseEnv();
}

export function getFirebaseServices(): FirebaseServices | null {
  if (!isFirebaseEnabled()) {
    return null;
  }

  if (services) {
    return services;
  }

  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  if (!persistenceAttempted) {
    persistenceAttempted = true;
    void enableIndexedDbPersistence(db).catch(() => {
      // Persistence may fail in private mode or multi-tab scenarios.
      // Firestore still works without local IndexedDB persistence.
    });
  }

  services = { app, auth, db };
  return services;
}