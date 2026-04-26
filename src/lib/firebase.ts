import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
export const db = getFirestore(app);
