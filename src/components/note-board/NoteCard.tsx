'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useNotesStore } from '@/store/useNotesStore';
import { formatNoteTime } from '@/lib/utils';
import { NEUTRAL_NOTE_COLOR } from '@/lib/constants';
import type { Note } from '@/lib/types';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const { categories } = useNotesStore();
  const category = categories.find((c) => c.id === note.categoryId);
  const bgColor = category?.color ?? NEUTRAL_NOTE_COLOR;

  const createdEntry = note.history.find((h) => h.type === 'created');
  const footerTime = createdEntry ? formatNoteTime(createdEntry.timestamp) : '';

  return (
    <motion.article
      onClick={onClick}
      whileHover={{ y: -3, transition: { type: 'spring', damping: 20, stiffness: 400 } }}
      className="note-card flex cursor-pointer flex-col rounded-2xl p-5 shadow-sm ring-1 ring-black/[0.04] transition-shadow hover:shadow-md h-full"
      style={{ backgroundColor: bgColor }}
      role="button"
      tabIndex={0}
      aria-label={`Note: ${note.content.slice(0, 60)}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
    >
      <p className="flex-1 text-sm leading-relaxed text-[#1a1a1a] line-clamp-6 font-content">
        {note.content}
      </p>

      <div className="mt-3 pt-2.5 border-t border-black/[0.06]">
        {note.isSolved ? (
          <p className="flex items-center gap-1 text-xs text-[#1a1a1a]/50 font-ui">
            <Check className="size-3" />
            Solved · {footerTime}
          </p>
        ) : (
          <p className="text-xs text-[#1a1a1a]/50 font-ui">{footerTime}</p>
        )}
      </div>
    </motion.article>
  );
}
