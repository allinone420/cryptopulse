import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  measurementId: firebaseConfigData.measurementId
};

// Initialize Firebase safely
let app;
try {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('TODO')) {
    throw new Error('Firebase Config is incomplete');
  }
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error('Firebase Initialization Error:', e);
}

let dbInstance: any = null;
if (app) {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    }, firebaseConfigData.firestoreDatabaseId);
  } catch (e) {
    try {
      dbInstance = getFirestore(app, firebaseConfigData.firestoreDatabaseId);
    } catch (err) {
      console.error('Firestore fallback init error:', err);
    }
  }
}

export const db = dbInstance;
export const auth = app ? getAuth(app) : (null as any);

