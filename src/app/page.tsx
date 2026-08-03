'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Download,
  Upload,
  Moon,
  Sun,
  Type,
  LogIn,
  LogOut,
  CloudOff,
  Cloud,
} from 'lucide-react';
import { NoteBoard } from '@/components/note-board/NoteBoard';
import { CreateNoteDialog } from '@/components/dialogs/CreateNoteDialog';
import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useNotesStore } from '@/store/useNotesStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ImportConfirmDialog } from '@/components/dialogs/ImportConfirmDialog';
import { SyncConflictDialog } from '@/components/dialogs/SyncConflictDialog';
import { FontCommandDialog } from '@/components/font-command-dialog';
import { useFont } from '@/hooks/useFont';
import { useAuth } from '@/components/AuthProvider';
import {
  getUserData,
  setUserData,
  mergeUserData,
  pushUserData,
  subscribeToUserData,
  type CloudData,
} from '@/lib/firestore-sync';
import type { Note, Category } from '@/lib/types';
import { toast } from 'sonner';
import type { Unsubscribe } from 'firebase/firestore';

export default function Home() {
  const [createOpen, setCreateOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [fontCommandOpen, setFontCommandOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ notes: Note[]; categories: Category[] } | null>(null);

  // Sync conflict state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictCloudCount, setConflictCloudCount] = useState(0);
  const pendingSignInRef = useRef<{ uid: string; cloudNotes: Note[]; cloudCategories: Category[] } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const firestoreUnsubRef = useRef<Unsubscribe | null>(null);
  /**
   * Gates the write-through effect. It stays false while a sign-in is being
   * reconciled (or an unresolved conflict is pending) so the debounced push
   * can never overwrite cloud data before the user has made a choice.
   */
  const syncReadyRef = useRef(false);
  /**
   * The last cloud state this client is known to be in sync with — either
   * from the live listener or from a push it made itself. Every debounced
   * push diffs the current local state against this baseline so only *this
   * client's* actual changes are applied on top of the freshest cloud data,
   * instead of blindly overwriting whatever another device may have written.
   */
  const lastSyncedRef = useRef<CloudData>({ notes: [], categories: [] });
  const importInputRef = useRef<HTMLInputElement>(null);

  const { notes, categories, importData, setSyncedData, clearData } = useNotesStore();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { activeFont, setFont } = useFont();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  // ── Real-time listener (ignores our own local write echoes) ───────────────
  const startListener = useCallback(
    (uid: string) => {
      firestoreUnsubRef.current?.();
      firestoreUnsubRef.current = subscribeToUserData(uid, (data, hasPendingWrites) => {
        if (hasPendingWrites) return;
        lastSyncedRef.current = data;
        setSyncedData(data.notes, data.categories);
      });
    },
    [setSyncedData]
  );

  // ── Reconcile local ⇄ cloud on login, then attach the live listener ───────
  // Runs for BOTH fresh popup sign-in and sessions restored on reload, so a
  // stale local copy can never overwrite newer cloud data.
  useEffect(() => {
    if (!user) {
      firestoreUnsubRef.current?.();
      firestoreUnsubRef.current = null;
      syncReadyRef.current = false;
      lastSyncedRef.current = { notes: [], categories: [] };
      return;
    }

    const uid = user.uid;
    let cancelled = false;
    syncReadyRef.current = false;
    setIsSyncing(true);

    (async () => {
      try {
        const cloudData = await getUserData(uid);
        if (cancelled) return;

        // Read the freshest store values (avoids stale-closure bugs).
        const { notes: localNotes, categories: localCategories } = useNotesStore.getState();
        const hasLocal = localNotes.length > 0 || localCategories.length > 0;
        const hasCloud =
          cloudData !== null &&
          (cloudData.notes.length > 0 || cloudData.categories.length > 0);

        if (hasCloud && hasLocal) {
          const identical =
            JSON.stringify(cloudData!.notes) === JSON.stringify(localNotes) &&
            JSON.stringify(cloudData!.categories) === JSON.stringify(localCategories);

          if (!identical) {
            // Genuine conflict — pause syncing and ask the user what to do.
            pendingSignInRef.current = {
              uid,
              cloudNotes: cloudData!.notes,
              cloudCategories: cloudData!.categories,
            };
            setConflictCloudCount(cloudData!.notes.length);
            setConflictOpen(true);
            setIsSyncing(false);
            return; // syncReadyRef stays false until resolved
          }
          // Identical — nothing to reconcile, but record the baseline.
          lastSyncedRef.current = cloudData!;
        } else if (hasCloud && !hasLocal) {
          setSyncedData(cloudData!.notes, cloudData!.categories);
          lastSyncedRef.current = cloudData!;
        } else if (!hasCloud && hasLocal) {
          await setUserData(uid, { notes: localNotes, categories: localCategories });
          lastSyncedRef.current = { notes: localNotes, categories: localCategories };
        } else {
          // Both empty, or cloud was identical to local — nothing to reconcile.
          lastSyncedRef.current = cloudData ?? { notes: [], categories: [] };
        }
        if (cancelled) return;

        syncReadyRef.current = true;
        startListener(uid);
        setIsSyncing(false);
      } catch {
        if (cancelled) return;
        setIsSyncing(false);
        toast.error('Sync failed. Changes are saved locally.');
      }
    })();

    return () => {
      cancelled = true;
      firestoreUnsubRef.current?.();
      firestoreUnsubRef.current = null;
    };
  }, [user, setSyncedData, startListener]);

  // ── Write-through: push to Firestore on every store mutation (debounced) ──
  // Suspended until reconciliation has completed for the current user. Uses a
  // 3-way merge (diffing against the last known cloud baseline) rather than a
  // blind overwrite, so concurrent edits from another device/tab survive.
  useEffect(() => {
    if (!user || !syncReadyRef.current) return;
    const timer = setTimeout(() => {
      const uid = user.uid;
      const base = lastSyncedRef.current;
      const local: CloudData = { notes, categories };
      setIsSyncing(true);
      pushUserData(uid, base, local)
        .then((merged) => {
          lastSyncedRef.current = merged;
          // Pick up anything another device contributed concurrently.
          setSyncedData(merged.notes, merged.categories);
        })
        .catch(() => {
          // Silently fail — the next mutation (or reconnect) retries against
          // the same baseline, so no changes are lost.
        })
        .finally(() => setIsSyncing(false));
    }, 800);
    return () => clearTimeout(timer);
  }, [user, notes, categories, setSyncedData]);

  // ── Sign-in flow ──────────────────────────────────────────────────────────
  // Reconciliation is handled by the effect above (which fires once the auth
  // state updates), so this just triggers the popup and surfaces errors.
  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Popup closed by user — not a real error
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
        toast.error('Sign-in failed. Please try again.');
      }
    }
  }, [signInWithGoogle]);

  // ── Conflict resolution ───────────────────────────────────────────────────
  const handleConflictMerge = useCallback(async () => {
    const pending = pendingSignInRef.current;
    if (!pending) return;
    setConflictOpen(false);
    setIsSyncing(true);
    try {
      const { notes: localNotes, categories: localCategories } = useNotesStore.getState();
      const merged = await mergeUserData(pending.uid, {
        notes: localNotes,
        categories: localCategories,
      });
      lastSyncedRef.current = merged;
      setSyncedData(merged.notes, merged.categories);
      syncReadyRef.current = true;
      startListener(pending.uid);
      toast.success(`Merged — ${merged.notes.length} notes total.`);
    } catch {
      toast.error('Merge failed. Please try again.');
    }
    pendingSignInRef.current = null;
    setIsSyncing(false);
  }, [setSyncedData, startListener]);

  const handleConflictUseCloud = useCallback(async () => {
    const pending = pendingSignInRef.current;
    if (!pending) return;
    setConflictOpen(false);
    lastSyncedRef.current = { notes: pending.cloudNotes, categories: pending.cloudCategories };
    setSyncedData(pending.cloudNotes, pending.cloudCategories);
    syncReadyRef.current = true;
    startListener(pending.uid);
    toast.success(`Loaded ${pending.cloudNotes.length} note${pending.cloudNotes.length === 1 ? '' : 's'} from cloud.`);
    pendingSignInRef.current = null;
  }, [setSyncedData, startListener]);

  const handleConflictCancel = useCallback(async () => {
    setConflictOpen(false);
    pendingSignInRef.current = null;
    // Sign the user back out — they cancelled. syncReadyRef stays false, so
    // nothing is pushed to the cloud.
    await signOut();
  }, [signOut]);

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    // Disable write-through first so clearing the local store can't push an
    // empty snapshot up and wipe the cloud copy.
    syncReadyRef.current = false;
    await signOut();
    clearData();
    toast.success('Signed out.');
  }, [signOut, clearData]);

  // ── Export / Import ───────────────────────────────────────────────────────
  const openCreate = useCallback(() => setCreateOpen(true), []);
  useGlobalKeyboard(openCreate);

  const handleExport = useCallback(() => {
    const data = JSON.stringify({ notes, categories }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notes-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes, categories]);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed.notes) && Array.isArray(parsed.categories)) {
          if (notes.length > 0) {
            setPendingImport(parsed);
            setImportConfirmOpen(true);
          } else {
            importData(parsed, 'replace');
            toast.success(`Imported ${parsed.notes.length} note${parsed.notes.length === 1 ? '' : 's'}.`);
          }
        } else {
          alert('Invalid file format.');
        }
      } catch {
        alert('Failed to parse file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [notes.length, importData]);

  const handleReplace = useCallback(() => {
    if (pendingImport) {
      importData(pendingImport, 'replace');
      toast.success(`Replaced with ${pendingImport.notes.length} imported note${pendingImport.notes.length === 1 ? '' : 's'}.`);
    }
    setPendingImport(null);
    setImportConfirmOpen(false);
  }, [pendingImport, importData]);

  const handleMerge = useCallback(() => {
    if (pendingImport) {
      const existingIds = new Set(notes.map((n) => n.id));
      const added = pendingImport.notes.filter((n) => !existingIds.has(n.id)).length;
      importData(pendingImport, 'merge');
      toast.success(`Merged — ${added} new note${added === 1 ? '' : 's'} added.`);;
    }
    setPendingImport(null);
    setImportConfirmOpen(false);
  }, [pendingImport, importData, notes]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-8 md:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight font-ui">
              Notes
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground font-ui">
              Press Enter to create a note
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sync status indicator */}
            {!loading && (
              <span
                className="text-muted-foreground transition-opacity duration-300"
                title={user ? `Synced as ${user.displayName ?? user.email}` : 'Local only'}
              >
                {user ? (
                  isSyncing ? (
                    <Cloud className="size-3.5 animate-pulse" />
                  ) : (
                    <Cloud className="size-3.5 opacity-40" />
                  )
                ) : (
                  <CloudOff className="size-3.5 opacity-20" />
                )}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="More options"
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">

                {/* ── User profile section (signed in) ── */}
                {!loading && user && (
                  <>
                    <div className="flex items-center gap-2.5 px-1.5 py-2">
                      {user.photoURL ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={user.photoURL}
                          alt={user.displayName ?? 'User avatar'}
                          className="size-7 rounded-full ring-1 ring-border shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                          {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        {user.displayName && (
                          <span className="text-xs font-medium text-foreground truncate leading-tight">
                            {user.displayName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground truncate leading-tight">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* ── Appearance ── */}
                <DropdownMenuItem onClick={toggleDark}>
                  {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFontCommandOpen(true)}>
                  <Type className="size-4" />
                  Change font
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* ── Data ── */}
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="size-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                  <Upload className="size-4" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuSeparator />

                {/* ── Auth ── */}
                {!loading && (
                  user ? (
                    <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                      <LogOut className="size-4" />
                      Sign out
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleSignIn}>
                      <LogIn className="size-4" />
                      Sign in with Google
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-ui"
            >
              <span className="text-base leading-none">+</span>
              New note
            </button>
          </div>
        </header>

        <NoteBoard />
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />
      <CreateNoteDialog open={createOpen} onOpenChange={setCreateOpen} />
      <FontCommandDialog
        open={fontCommandOpen}
        onOpenChange={setFontCommandOpen}
        activeFont={activeFont}
        onSelectFont={setFont}
      />
      <ImportConfirmDialog
        open={importConfirmOpen}
        onOpenChange={setImportConfirmOpen}
        onReplace={handleReplace}
        onMerge={handleMerge}
      />
      <SyncConflictDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        localCount={notes.length}
        cloudCount={conflictCloudCount}
        onMerge={handleConflictMerge}
        onUseCloud={handleConflictUseCloud}
        onCancel={handleConflictCancel}
      />
    </main>
  );
}
