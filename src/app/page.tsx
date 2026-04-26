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
  subscribeToUserData,
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
  const importInputRef = useRef<HTMLInputElement>(null);

  const { notes, categories, importData, setSyncedData, clearData } = useNotesStore();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { activeFont, setFont } = useFont();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  // ── Firestore real-time listener ──────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      firestoreUnsubRef.current?.();
      firestoreUnsubRef.current = null;
      return;
    }

    // Skip the very first snapshot so we don't overwrite data we just wrote
    let initialSkip = true;
    const unsub = subscribeToUserData(user.uid, (data) => {
      if (initialSkip) {
        initialSkip = false;
        return;
      }
      setSyncedData(data.notes, data.categories);
    });

    firestoreUnsubRef.current = unsub;
    return () => {
      unsub();
      firestoreUnsubRef.current = null;
    };
  }, [user, setSyncedData]);

  // ── Write-through: push to Firestore on every store mutation (debounced) ──
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setUserData(user.uid, { notes, categories }).catch(() => {
        // Silently fail — next mutation will retry
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [user, notes, categories]);

  // ── Sign-in flow ──────────────────────────────────────────────────────────
  const handleSignIn = useCallback(async () => {
    try {
      setIsSyncing(true);
      const firebaseUser = await signInWithGoogle();
      const cloudData = await getUserData(firebaseUser.uid);
      const hasLocal = notes.length > 0;
      const hasCloud = cloudData !== null && cloudData.notes.length > 0;

      if (hasCloud && hasLocal) {
        // Conflict — ask user
        pendingSignInRef.current = {
          uid: firebaseUser.uid,
          cloudNotes: cloudData.notes,
          cloudCategories: cloudData.categories,
        };
        setConflictCloudCount(cloudData.notes.length);
        setConflictOpen(true);
        setIsSyncing(false);
        return;
      }

      if (hasCloud && !hasLocal) {
        // Pull cloud data down
        setSyncedData(cloudData.notes, cloudData.categories);
        toast.success(`Synced ${cloudData.notes.length} note${cloudData.notes.length === 1 ? '' : 's'} from cloud.`);
      } else {
        // Push local data up (covers hasLocal && !hasCloud, and empty both)
        await setUserData(firebaseUser.uid, { notes, categories });
        if (hasLocal) {
          toast.success(`Uploaded ${notes.length} note${notes.length === 1 ? '' : 's'} to cloud.`);
        } else {
          toast.success(`Signed in as ${firebaseUser.displayName ?? firebaseUser.email}.`);
        }
      }

      setIsSyncing(false);
    } catch (err: unknown) {
      setIsSyncing(false);
      const msg = err instanceof Error ? err.message : String(err);
      // Popup closed by user — not a real error
      if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
        toast.error('Sign-in failed. Please try again.');
      }
    }
  }, [signInWithGoogle, notes, categories, setSyncedData]);

  // ── Conflict resolution ───────────────────────────────────────────────────
  const handleConflictMerge = useCallback(async () => {
    const pending = pendingSignInRef.current;
    if (!pending) return;
    setConflictOpen(false);
    setIsSyncing(true);
    try {
      const merged = await mergeUserData(pending.uid, { notes, categories });
      setSyncedData(merged.notes, merged.categories);
      toast.success(`Merged — ${merged.notes.length} notes total.`);
    } catch {
      toast.error('Merge failed. Please try again.');
    }
    pendingSignInRef.current = null;
    setIsSyncing(false);
  }, [notes, categories, setSyncedData]);

  const handleConflictUseCloud = useCallback(async () => {
    const pending = pendingSignInRef.current;
    if (!pending) return;
    setConflictOpen(false);
    setSyncedData(pending.cloudNotes, pending.cloudCategories);
    toast.success(`Loaded ${pending.cloudNotes.length} note${pending.cloudNotes.length === 1 ? '' : 's'} from cloud.`);
    pendingSignInRef.current = null;
  }, [setSyncedData]);

  const handleConflictCancel = useCallback(async () => {
    setConflictOpen(false);
    pendingSignInRef.current = null;
    // Sign the user back out — they cancelled
    await signOut();
  }, [signOut]);

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const handleSignOut = useCallback(async () => {
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
