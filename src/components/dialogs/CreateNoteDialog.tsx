'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CategoryTabRow } from '@/components/category/CategoryTabRow';
import { DiscardConfirmDialog } from './DiscardConfirmDialog';
import { useNotesStore } from '@/store/useNotesStore';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { getDynamicFontSize } from '@/lib/constants';

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resize = useAutoResizeTextarea(textareaRef);

  const { addNote } = useNotesStore();

  // Focus textarea when dialog opens
  useEffect(() => {
    if (open) {
      setContent('');
      setCategoryId(null);
      setTimeout(() => {
        textareaRef.current?.focus();
        resize();
      }, 80);
    }
  }, [open, resize]);

  const handleSave = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    addNote(trimmed, categoryId);
    onOpenChange(false);
  }, [content, categoryId, addNote, onOpenChange]);

  const handleClose = useCallback(() => {
    if (content.trim()) {
      setDiscardOpen(true);
    } else {
      onOpenChange(false);
    }
  }, [content, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [handleClose, handleSave]
  );

  const fontSize = getDynamicFontSize(content.length);

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
            {/* Header with category tabs + close */}
            <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-border/50">
              <div className="flex-1 min-w-0">
                <CategoryTabRow
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                  onCategoryAdded={setCategoryId}
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
                placeholder="Write your note..."
                rows={1}
                className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground/50 leading-relaxed font-content"
                style={{
                  fontSize: `${fontSize}px`,
                  transition: 'font-size 0.2s ease',
                  minHeight: '120px',
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground/60">
                {content.length > 0 && `${content.length} chars`}
              </p>
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-xs text-muted-foreground/50">
                  ⌘↵ to save
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!content.trim()}
                  className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <DiscardConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        onConfirm={() => {
          setDiscardOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
