import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

export const db = app ? getFirestore(app, firebaseConfigData.firestoreDatabaseId) : (null as any);
export const auth = app ? getAuth(app) : (null as any);
