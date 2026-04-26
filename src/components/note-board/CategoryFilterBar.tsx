'use client';

import { ListFilter } from 'lucide-react';
import { useNotesStore } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { TimeFilter } from '@/lib/types';

export function CategoryFilterBar() {
  const {
    categories,
    notes,
    activeBoardFilter,
    setActiveBoardFilter,
    hideResolved,
    toggleHideResolved,
    timeFilter,
    setTimeFilter,
  } = useNotesStore();

  // Only show categories that have at least one note
  const activeCategories = categories.filter((cat) =>
    notes.some((n) => n.categoryId === cat.id)
  );

  const solvedCount = notes.filter((n) => n.isSolved).length;
  const hasCategories = activeCategories.length > 0;

  // Count how many filters are active
  const activeFilterCount =
    (hideResolved ? 1 : 0) + (timeFilter !== 'all' ? 1 : 0);

  const timeLabels: Record<TimeFilter, string> = {
    all: 'All time',
    today: 'Today',
    week: 'This week',
    month: 'This month',
  };

  return (
    <nav
      className="flex flex-wrap items-center gap-2"
      aria-label="Filter notes by category"
    >
      {/* Category filter pills */}
      {hasCategories && (
        <>
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
        </>
      )}

      {/* Divider between category pills and filter dropdown */}
      {hasCategories && (
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      )}

      {/* Filter dropdown button */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeFilterCount > 0
              ? 'bg-foreground text-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          )}
          aria-label="Filter options"
        >
          <ListFilter className="size-3.5" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="flex size-4.5 items-center justify-center rounded-full bg-background/20 text-[10px] font-semibold leading-none">
              {activeFilterCount}
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" sideOffset={6} className="w-48">
          {/* Time filter — radio group */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Time</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={timeFilter}
              onValueChange={(v) => setTimeFilter(v as TimeFilter)}
            >
              {(Object.keys(timeLabels) as TimeFilter[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {timeLabels[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Status filter — checkbox */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={hideResolved}
              onCheckedChange={() => toggleHideResolved()}
            >
              Hide resolved
              {solvedCount > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {solvedCount}
                </span>
              )}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
