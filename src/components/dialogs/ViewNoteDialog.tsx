'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryTabRow } from '@/components/category/CategoryTabRow';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { useNotesStore } from '@/store/useNotesStore';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { getDynamicFontSize } from '@/lib/constants';
import { formatNoteTime } from '@/lib/utils';
import type { Note } from '@/lib/types';

interface ViewNoteDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewNoteDialog({ note, open, onOpenChange }: ViewNoteDialogProps) {
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resize = useAutoResizeTextarea(textareaRef);

  const { notes, updateNote, deleteNote } = useNotesStore();

  // Live store note — used for up-to-date comparison in handleClose
  const liveNote = notes.find((n) => n.id === note?.id) ?? note;

  // Sync local state when the dialog opens for a note
  useEffect(() => {
    if (note && open) {
      setContent(note.content);
      setCategoryId(note.categoryId);
      setIsSolved(note.isSolved);
      setTimeout(() => {
        resize();
      }, 80);
    }
  }, [note, open, resize]);

  const handleClose = useCallback(() => {
    if (!note || !liveNote) return;
    const trimmed = content.trim();
    // Compare against the live store note so that changes already saved by
    // handleSolvedChange (which persists content + categoryId together with
    // isSolved) are not double-written and don't create a spurious "edited" entry.
    const hasChanges =
      trimmed !== liveNote.content ||
      categoryId !== liveNote.categoryId;

    if (hasChanges && trimmed) {
      updateNote(note.id, {
        content: trimmed,
        categoryId,
      });
    }
    onOpenChange(false);
  }, [note, liveNote, content, categoryId, updateNote, onOpenChange]);

  const handleSolvedChange = useCallback(
    (checked: boolean) => {
      if (!note) return;
      setIsSolved(checked);
      // Save content + categoryId alongside isSolved so they land in the store
      // atomically. The store skips "edited" whenever isSolved is present in the
      // update, so this never creates a spurious "edited" entry.
      const trimmed = content.trim();
      updateNote(note.id, {
        isSolved: checked,
        content: trimmed || note.content,
        categoryId,
      });
    },
    [note, content, categoryId, updateNote]
  );

  const handleDelete = useCallback(() => {
    if (!note) return;
    deleteNote(note.id);
    setDeleteOpen(false);
    onOpenChange(false);
  }, [note, deleteNote, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleClose();
      }
    },
    [handleClose]
  );

  if (!note) return null;

  const fontSize = getDynamicFontSize(content.length);

  const historyByType = [...(liveNote?.history ?? note.history)].sort((a, b) => {
    const order = { solved: 0, edited: 1, created: 2 };
    return order[a.type] - order[b.type];
  });

  const historyLabel: Record<string, string> = {
    created: 'Created',
    edited: 'Edited',
    solved: 'Solved',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl w-full p-0 overflow-hidden gap-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="flex flex-col"
          >
            {/* Category tabs + close */}
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <CategoryTabRow
                  selectedId={categoryId}
                  onSelect={(id) => {
                    setCategoryId(id);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close dialog"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Textarea */}
            <div className="px-6 py-5">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  resize();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Note content..."
                rows={1}
                className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/50 leading-relaxed font-content"
                style={{
                  fontSize: `${fontSize}px`,
                  transition: 'font-size 0.2s ease',
                  minHeight: '120px',
                }}
              />
            </div>

            {/* Solved checkbox */}
            <div className="px-6 pb-4">
              <label className="flex cursor-pointer items-center gap-2.5">
                <Checkbox
                  checked={isSolved}
                  onCheckedChange={(v) => handleSolvedChange(v === true)}
                />
                <span className="text-sm text-muted-foreground select-none">
                  Mark as solved
                </span>
              </label>
            </div>

            {/* History log */}
            <div className="px-6 pb-4">
              <ul className="space-y-0.5">
                {historyByType.map((entry, i) => (
                  <li key={i} className="text-xs text-muted-foreground/60">
                    {historyLabel[entry.type]} at {formatNoteTime(entry.timestamp)}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete note"
                className="flex items-center justify-center rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Close
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </>
  );
}
