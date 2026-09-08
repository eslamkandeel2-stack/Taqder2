import { initializeApp, getApps, getApp, setLogLevel as setAppLogLevel } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence,
  browserPopupRedirectResolver,
  setPersistence,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache,
  Firestore,
  setLogLevel as setFirestoreLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose Firebase and Firestore logs when running offline or in preview containers
try {
  setAppLogLevel('silent');
} catch (e) {
  // Ignore if unsupported
}

try {
  setFirestoreLogLevel('silent');
} catch (e) {
  // Ignore if unsupported
}

// Initialize Firebase App instance singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;
try {
  // Use browserLocalPersistence to guarantee user session survives across redirects and refreshes
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch (e) {
  authInstance = getAuth(app);
}

// Explicitly enforce browser local persistence for Vercel and standard web browsers
try {
  setPersistence(authInstance, browserLocalPersistence).catch((err) => {
    // Harmless persistence fallback note in restricted iframe environments
  });
} catch (err) {
  // Ignore persistence init note
}

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
} catch (e) {
  dbInstance = getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;
export default app;


