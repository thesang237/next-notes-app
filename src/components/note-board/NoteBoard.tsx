'use client';

import { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useNotesStore } from '@/store/useNotesStore';
import { NoteCard } from './NoteCard';
import { CategoryFilterBar } from './CategoryFilterBar';
import { ViewNoteDialog } from '@/components/dialogs/ViewNoteDialog';
import type { Note } from '@/lib/types';

export function NoteBoard() {
  const { notes, activeBoardFilter, hideResolved, timeFilter } = useNotesStore();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const filteredNotes = (() => {
    let result =
      activeBoardFilter === null
        ? notes
        : notes.filter((n) => n.categoryId === activeBoardFilter);

    if (hideResolved) {
      result = result.filter((n) => !n.isSolved);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      let start: Date;

      if (timeFilter === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeFilter === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday as start of week
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      } else {
        // 'month'
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const startTime = start.getTime();
      result = result.filter((n) => new Date(n.createdAt).getTime() >= startTime);
    }

    return result;
  })();

  // Determine the right empty-state message
  const timeLabels = { all: '', today: 'today', week: 'this week', month: 'this month' };
  const timeContext = timeFilter !== 'all' ? ` ${timeLabels[timeFilter]}` : '';

  const emptyMessage = (() => {
    if (notes.length === 0) return 'No notes yet. Press Enter to create one.';
    if (hideResolved && activeBoardFilter !== null)
      return `No unresolved notes in this category${timeContext}.`;
    if (hideResolved) return timeContext
      ? `No unresolved notes${timeContext}.`
      : 'All notes are resolved. 🎉';
    if (activeBoardFilter !== null)
      return `No notes in this category${timeContext}.`;
    if (timeContext) return `No notes${timeContext}.`;
    return 'No notes yet. Press Enter to create one.';
  })();

  // GSAP for initial board header entrance (once)
  useGSAP(() => {
    if (hasInitialized.current || !headerRef.current) return;
    hasInitialized.current = true;
    gsap.from(headerRef.current, {
      opacity: 0,
      y: -8,
      duration: 0.5,
      ease: 'power2.out',
      clearProps: 'all',
    });
  }, { scope: headerRef });

  const handleCardClick = useCallback((note: Note) => {
    setSelectedNote(note);
    setViewOpen(true);
  }, []);

  const handleViewClose = useCallback((v: boolean) => {
    setViewOpen(v);
    if (!v) {
      setTimeout(() => setSelectedNote(null), 200);
    }
  }, []);

  return (
    <>
      <div className="space-y-6">
        <div ref={headerRef}>
          <CategoryFilterBar />
        </div>

        {filteredNotes.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
          >
            <div className="text-4xl opacity-20 select-none">✦</div>
            <p className="text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filteredNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.3,
                      delay: index * 0.04,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                >
                  <NoteCard
                    note={note}
                    onClick={() => handleCardClick(note)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ViewNoteDialog
        note={selectedNote}
        open={viewOpen}
        onOpenChange={handleViewClose}
      />
    </>
  );
}
