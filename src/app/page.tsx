'use client';

import { useState, useCallback } from 'react';
import { NoteBoard } from '@/components/note-board/NoteBoard';
import { CreateNoteDialog } from '@/components/dialogs/CreateNoteDialog';
import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';

export default function Home() {
  const [createOpen, setCreateOpen] = useState(false);

  const openCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

  useGlobalKeyboard(openCreate);

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
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-ui"
          >
            <span className="text-base leading-none">+</span>
            New note
          </button>
        </header>

        <NoteBoard />
      </div>

      <CreateNoteDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
