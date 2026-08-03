import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAywUvlAE8Ror5n-6aA_2SPma5tknsVUC0',
  authDomain: 'next-level-note.firebaseapp.com',
  projectId: 'next-level-note',
  storageBucket: 'next-level-note.firebasestorage.app',
  messagingSenderId: '703396311340',
  appId: '1:703396311340:web:6b57af403fe3687ed57c89',
  measurementId: 'G-Z95EYHCGNS',
};

// Guard against re-initialisation in Next.js dev hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

/**
 * Firestore with durable offline persistence: local edits made while offline
 * (or mid-reload) are queued in IndexedDB and flushed automatically once the
 * client reconnects, and stay in sync across multiple tabs of the same
 * browser. IndexedDB doesn't exist during SSR/prerendering (this module is
 * imported by 'use client' components but still executed in Node for the
 * server render pass), so fall back to the plain client there. Wrapped in a
 * try/catch because `initializeFirestore` throws if called twice for the
 * same app, which can happen during Next.js dev hot-reload.
 */
function createDb() {
  if (typeof window === 'undefined') return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}

export const db = createDb();
