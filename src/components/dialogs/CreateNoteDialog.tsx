'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CategoryTabRow } from '@/components/category/CategoryTabRow';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { DiscardConfirmDialog } from './DiscardConfirmDialog';
import { useNotesStore } from '@/store/useNotesStore';
import { getDynamicFontSize, NEUTRAL_NOTE_COLOR } from '@/lib/constants';
import { htmlToText, isHtmlEmpty } from '@/lib/utils';

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNoteDialog({ open, onOpenChange }: CreateNoteDialogProps) {
  const [htmlContent, setHtmlContent] = useState('<p></p>');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const { addNote, categories } = useNotesStore();

  const handleSave = useCallback(() => {
    if (isHtmlEmpty(htmlContent)) return;
    addNote(htmlContent, categoryId);
    onOpenChange(false);
  }, [htmlContent, categoryId, addNote, onOpenChange]);

  const handleClose = useCallback(() => {
    if (!isHtmlEmpty(htmlContent)) {
      setDiscardOpen(true);
    } else {
      onOpenChange(false);
    }
  }, [htmlContent, onOpenChange]);

  const handleDiscard = useCallback(() => {
    setHtmlContent('<p></p>');
    setCategoryId(null);
    setDiscardOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const textLength = htmlToText(htmlContent).length;
  const fontSize = getDynamicFontSize(textLength);
  const category = categories.find((c) => c.id === categoryId);
  const bgColor = category?.color ?? NEUTRAL_NOTE_COLOR;

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

            {/* Rich text editor */}
            <div className="px-6 py-5">
              <RichTextEditor
                content={htmlContent}
                onChange={setHtmlContent}
                placeholder="Write your note..."
                minHeight="120px"
                maxHeight="40vh"
                fontSize={fontSize}
                bgColor={bgColor}
                autoFocus={open}
                onEscape={handleClose}
                onSave={handleSave}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground/60">
                {textLength > 0 && `${textLength} chars`}
              </p>
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-xs text-muted-foreground/50">
                  ⌘↵ to save
                </span>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isHtmlEmpty(htmlContent)}
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
        onConfirm={handleDiscard}
      />
    </>
  );
}
