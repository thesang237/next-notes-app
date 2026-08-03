import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  runTransaction,
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

/**
 * Merge local data into cloud data (dedup by id) atomically.
 *
 * Runs inside a Firestore transaction so a concurrent write from another
 * device can't clobber the merge result (read-modify-write is otherwise racy).
 * When an id exists in both places the cloud copy wins.
 */
export async function mergeUserData(uid: string, localData: CloudData): Promise<CloudData> {
  const ref = userRef(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cloud: CloudData = snap.exists()
      ? {
          notes: Array.isArray(snap.data().notes) ? snap.data().notes : [],
          categories: Array.isArray(snap.data().categories) ? snap.data().categories : [],
        }
      : { notes: [], categories: [] };

    const cloudNoteIds = new Set(cloud.notes.map((n) => n.id));
    const cloudCatIds = new Set(cloud.categories.map((c) => c.id));
    const merged: CloudData = {
      notes: [...cloud.notes, ...localData.notes.filter((n) => !cloudNoteIds.has(n.id))],
      categories: [
        ...cloud.categories,
        ...localData.categories.filter((c) => !cloudCatIds.has(c.id)),
      ],
    };

    tx.set(ref, {
      notes: merged.notes,
      categories: merged.categories,
      updatedAt: serverTimestamp(),
    });
    return merged;
  });
}

/**
 * Three-way merge by id: applies whatever this client added/edited/removed
 * between `base` (the last cloud state it knows it's in sync with) and
 * `local` (its current state) on top of `remote` (the freshest cloud state,
 * read inside the same transaction). This means a note added, edited, or
 * deleted by a *different* device since our last sync is preserved instead
 * of being clobbered by a blind overwrite.
 */
function mergeById<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const baseIds = new Set(base.map((x) => x.id));
  const localIds = new Set(local.map((x) => x.id));
  const localById = new Map(local.map((x) => [x.id, x]));
  const remoteIds = new Set(remote.map((x) => x.id));

  // Present in the last known sync point but gone locally now -> we deleted it.
  const removedIds = new Set([...baseIds].filter((id) => !localIds.has(id)));

  const merged = remote
    .filter((r) => !removedIds.has(r.id))
    // Apply this client's edits on top of whatever is currently in the cloud.
    .map((r) => localById.get(r.id) ?? r);

  // Items this client added that the cloud doesn't know about yet.
  for (const item of local) {
    if (!remoteIds.has(item.id)) merged.push(item);
  }

  return merged;
}

/**
 * Push local changes to Firestore, safely merging with any concurrent
 * changes from other devices instead of blindly overwriting the cloud copy.
 * Returns the merged data that now lives in the cloud so the caller can
 * update its own "last synced" baseline and local store.
 */
export async function pushUserData(
  uid: string,
  base: CloudData,
  local: CloudData
): Promise<CloudData> {
  const ref = userRef(uid);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const remote: CloudData = snap.exists()
      ? {
          notes: Array.isArray(snap.data().notes) ? snap.data().notes : [],
          categories: Array.isArray(snap.data().categories) ? snap.data().categories : [],
        }
      : { notes: [], categories: [] };

    const merged: CloudData = {
      notes: mergeById(base.notes, local.notes, remote.notes),
      categories: mergeById(base.categories, local.categories, remote.categories),
    };

    tx.set(ref, {
      notes: merged.notes,
      categories: merged.categories,
      updatedAt: serverTimestamp(),
    });
    return merged;
  });
}

/**
 * Subscribe to real-time Firestore changes for this user.
 * Calls `callback` with the latest CloudData whenever it changes.
 * `hasPendingWrites` is true for the local latency-compensation echo of our
 * own writes — callers should ignore those to avoid write/read loops.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  uid: string,
  callback: (data: CloudData, hasPendingWrites: boolean) => void
): Unsubscribe {
  return onSnapshot(userRef(uid), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    callback(
      {
        notes: Array.isArray(data.notes) ? data.notes : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
      },
      snap.metadata.hasPendingWrites
    );
  });
}
