'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { CategoryTabRow } from '@/components/category/CategoryTabRow';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useNotesStore } from '@/store/useNotesStore';
import { toast } from 'sonner';
import { getDynamicFontSize, NEUTRAL_NOTE_COLOR } from '@/lib/constants';
import { formatNoteTime, plainTextToHtml, htmlToText, isHtmlEmpty } from '@/lib/utils';
import type { Note } from '@/lib/types';

interface ViewNoteDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewNoteDialog({ note, open, onOpenChange }: ViewNoteDialogProps) {
  const [htmlContent, setHtmlContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { notes, categories, updateNote, deleteNote, restoreNote } = useNotesStore();

  // Live store note — used for up-to-date comparison in handleClose
  const liveNote = notes.find((n) => n.id === note?.id) ?? note;

  // Sync local state when the dialog opens for a note
  useEffect(() => {
    if (note && open) {
      setHtmlContent(plainTextToHtml(note.content));
      setCategoryId(note.categoryId);
      setIsSolved(note.isSolved);
    }
  }, [note, open]);

  const handleClose = useCallback(() => {
    if (!note || !liveNote) return;
    const liveHtml = plainTextToHtml(liveNote.content);
    const hasChanges =
      htmlContent !== liveHtml ||
      categoryId !== liveNote.categoryId;

    if (hasChanges && !isHtmlEmpty(htmlContent)) {
      updateNote(note.id, { content: htmlContent, categoryId });
    }
    onOpenChange(false);
  }, [note, liveNote, htmlContent, categoryId, updateNote, onOpenChange]);

  const handleSolvedChange = useCallback(
    (checked: boolean) => {
      if (!note) return;
      setIsSolved(checked);
      updateNote(note.id, {
        isSolved: checked,
        content: isHtmlEmpty(htmlContent) ? note.content : htmlContent,
        categoryId,
      });
    },
    [note, htmlContent, categoryId, updateNote]
  );

  const handleDelete = useCallback(() => {
    if (!note) return;
    const index = notes.findIndex((n) => n.id === note.id);
    const snapshot = { ...note };
    deleteNote(note.id);
    setDeleteOpen(false);
    onOpenChange(false);
    toast('Note deleted.', {
      action: {
        label: 'Undo',
        onClick: () => restoreNote(snapshot, index === -1 ? 0 : index),
      },
      duration: 5000,
    });
  }, [note, notes, deleteNote, restoreNote, onOpenChange]);

  // Global Cmd/Ctrl + Enter to save/close, even when focus is on other elements
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleClose]);

  if (!note) return null;

  const textLength = htmlToText(htmlContent).length;
  const fontSize = getDynamicFontSize(textLength);
  const category = categories.find((c) => c.id === categoryId);
  const bgColor = category?.color ?? NEUTRAL_NOTE_COLOR;

  // Only show the last (most recent by timestamp) action for history label
  const latestHistory = [...(liveNote?.history ?? note.history)]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

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

            {/* Rich text editor */}
            <div className="px-6 py-5">
              <RichTextEditor
                content={htmlContent}
                onChange={setHtmlContent}
                placeholder="Note content..."
                minHeight="120px"
                maxHeight="40vh"
                fontSize={fontSize}
                bgColor={bgColor}
                onEscape={handleClose}
                onSave={handleClose}
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

            {/* History log - only last action */}
            {latestHistory && (
              <div className="px-6 pb-4">
                <div className="text-xs text-muted-foreground/60">
                  {historyLabel[latestHistory.type]} at {formatNoteTime(latestHistory.timestamp)}
                </div>
              </div>
            )}

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
