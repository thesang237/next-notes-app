'use client';

import { useNotesStore } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

export function CategoryFilterBar() {
  const { categories, notes, activeBoardFilter, setActiveBoardFilter } =
    useNotesStore();

  // Only show categories that have at least one note
  const activeCategories = categories.filter((cat) =>
    notes.some((n) => n.categoryId === cat.id)
  );

  if (activeCategories.length === 0) return null;

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="Filter notes by category"
    >
      <button
        type="button"
        onClick={() => setActiveBoardFilter(null)}
        className={cn(
          'flex h-8 items-center rounded-full px-4 text-sm font-medium transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          activeBoardFilter === null
            ? 'bg-foreground text-background shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )}
      >
        All
      </button>
      {activeCategories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => setActiveBoardFilter(cat.id)}
          className={cn(
            'flex h-8 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeBoardFilter === cat.id
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
        >
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: cat.color }}
          />
          {cat.name}
        </button>
      ))}
    </nav>
  );
}
