import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Note, Category } from '@/lib/types';

export interface CloudData {
  notes: Note[];
  categories: Category[];
}

function userRef(uid: string) {
  return doc(db, 'users', uid);
}

/** Read the user's cloud data once. Returns null if no document exists yet. */
export async function getUserData(uid: string): Promise<CloudData | null> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    notes: Array.isArray(data.notes) ? data.notes : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}

/** Overwrite the user's cloud data entirely. */
export async function setUserData(uid: string, data: CloudData): Promise<void> {
  await setDoc(userRef(uid), {
    notes: data.notes,
    categories: data.categories,
    updatedAt: serverTimestamp(),
  });
}

/** Merge local data into cloud data (dedup by id). Writes result back. */
export async function mergeUserData(uid: string, localData: CloudData): Promise<CloudData> {
  const cloudData = await getUserData(uid);
  if (!cloudData) {
    await setUserData(uid, localData);
    return localData;
  }
  const cloudNoteIds = new Set(cloudData.notes.map((n) => n.id));
  const cloudCatIds = new Set(cloudData.categories.map((c) => c.id));
  const merged: CloudData = {
    notes: [...cloudData.notes, ...localData.notes.filter((n) => !cloudNoteIds.has(n.id))],
    categories: [
      ...cloudData.categories,
      ...localData.categories.filter((c) => !cloudCatIds.has(c.id)),
    ],
  };
  await setUserData(uid, merged);
  return merged;
}

/**
 * Subscribe to real-time Firestore changes for this user.
 * Calls `callback` with the latest CloudData whenever it changes.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  uid: string,
  callback: (data: CloudData) => void
): Unsubscribe {
  return onSnapshot(userRef(uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    callback({
      notes: Array.isArray(data.notes) ? data.notes : [],
      categories: Array.isArray(data.categories) ? data.categories : [],
    });
  });
}
