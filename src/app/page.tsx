'use client';

import { useState, useCallback, useRef } from 'react';
import { MoreVertical, Download, Upload, Moon, Sun } from 'lucide-react';
import { NoteBoard } from '@/components/note-board/NoteBoard';
import { CreateNoteDialog } from '@/components/dialogs/CreateNoteDialog';
import { useGlobalKeyboard } from '@/hooks/useGlobalKeyboard';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useNotesStore } from '@/store/useNotesStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ImportConfirmDialog } from '@/components/dialogs/ImportConfirmDialog';
import type { Note, Category } from '@/lib/types';
import { toast } from 'sonner';

export default function Home() {
  const [createOpen, setCreateOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ notes: Note[]; categories: Category[] } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { notes, categories, importData } = useNotesStore();
  const { dark, toggle: toggleDark } = useDarkMode();

  const openCreate = useCallback(() => {
    setCreateOpen(true);
  }, []);

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
      toast.success(`Merged — ${added} new note${added === 1 ? '' : 's'} added.`);
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
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="More options"
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={toggleDark}>
                  {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="size-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                  <Upload className="size-4" />
                  Import
                </DropdownMenuItem>
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
      <ImportConfirmDialog
        open={importConfirmOpen}
        onOpenChange={setImportConfirmOpen}
        onReplace={handleReplace}
        onMerge={handleMerge}
      />
    </main>
  );
}
