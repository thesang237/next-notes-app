import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Note, Category } from '@/lib/types';

interface NotesState {
  notes: Note[];
  categories: Category[];
  activeBoardFilter: string | null;

  addNote: (content: string, categoryId: string | null) => void;
  updateNote: (id: string, updates: Partial<Pick<Note, 'content' | 'categoryId' | 'isSolved'>>) => void;
  deleteNote: (id: string) => void;
  addCategory: (name: string, color: string) => string;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => void;
  removeCategory: (id: string) => void;
  setActiveBoardFilter: (categoryId: string | null) => void;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      categories: [],
      activeBoardFilter: null,

      addNote: (content, categoryId) =>
        set((state) => ({
          notes: [
            {
              id: nanoid(),
              content,
              categoryId,
              isSolved: false,
              history: [{ type: 'created', timestamp: new Date().toISOString() }],
              createdAt: new Date().toISOString(),
            },
            ...state.notes,
          ],
        })),

      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((note) => {
            if (note.id !== id) return note;
            const newHistory = [...note.history];

            const hasContentChange =
              updates.content !== undefined && updates.content !== note.content;
            const hasCategoryChange =
              updates.categoryId !== undefined && updates.categoryId !== note.categoryId;

            // "edited" is only recorded for explicit content/category edits,
            // never when the update is part of a "mark as solved" action.
            if ((hasContentChange || hasCategoryChange) && updates.isSolved === undefined) {
              newHistory.unshift({ type: 'edited', timestamp: new Date().toISOString() });
            }

            if (updates.isSolved !== undefined) {
              if (updates.isSolved && !note.isSolved) {
                newHistory.unshift({ type: 'solved', timestamp: new Date().toISOString() });
              } else if (!updates.isSolved && note.isSolved) {
                const solvedIdx = newHistory.findIndex((h) => h.type === 'solved');
                if (solvedIdx !== -1) newHistory.splice(solvedIdx, 1);
              }
            }

            return { ...note, ...updates, history: newHistory };
          }),
        })),

      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      addCategory: (name, color) => {
        const id = nanoid();
        set((state) => ({
          categories: [...state.categories, { id, name, color }],
        }));
        return id;
      },

      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      removeCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          notes: state.notes.map((n) =>
            n.categoryId === id ? { ...n, categoryId: null } : n
          ),
          activeBoardFilter:
            state.activeBoardFilter === id ? null : state.activeBoardFilter,
        })),

      setActiveBoardFilter: (categoryId) =>
        set({ activeBoardFilter: categoryId }),
    }),
    {
      name: 'notes-storage',
    }
  )
);
