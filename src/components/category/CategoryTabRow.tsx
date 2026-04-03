'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Palette } from 'lucide-react';
import { useNotesStore } from '@/store/useNotesStore';
import { AddCategoryPopover } from './AddCategoryPopover';
import { CategoryColorPicker } from './CategoryColorPicker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CategoryTabRowProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCategoryAdded?: (id: string) => void;
}

interface ContextMenuState {
  categoryId: string;
  x: number;
  y: number;
}

export function CategoryTabRow({
  selectedId,
  onSelect,
  onCategoryAdded,
}: CategoryTabRowProps) {
  const { categories, removeCategory, updateCategory } = useNotesStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [colorPickerOpenId, setColorPickerOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    setTimeout(() => {
      window.addEventListener('mousedown', handler);
      window.addEventListener('keydown', keyHandler);
    }, 0);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [contextMenu, closeContextMenu]);

  const handleContextMenu = (e: React.MouseEvent, categoryId: string) => {
    e.preventDefault();
    setContextMenu({ categoryId, x: e.clientX, y: e.clientY });
  };

  const handleEdit = () => {
    if (!contextMenu) return;
    setEditingId(contextMenu.categoryId);
    setEditOpen(true);
    closeContextMenu();
  };

  const handleRemove = () => {
    if (!contextMenu) return;
    const { categoryId } = contextMenu;
    closeContextMenu();
    removeCategory(categoryId);
    if (selectedId === categoryId) onSelect(null);
  };

  const editingCategory = categories.find((c) => c.id === editingId);
  const isSelected = (id: string) => selectedId === id;

  return (
    <>
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Note categories"
      >
        {categories.map((cat) => (
          <div key={cat.id} className="group/pill relative">
            {/* Main pill button — grows right on hover to reveal palette icon */}
            <button
              type="button"
              role="radio"
              aria-checked={isSelected(cat.id)}
              onClick={() => onSelect(isSelected(cat.id) ? null : cat.id)}
              onContextMenu={(e) => handleContextMenu(e, cat.id)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full pl-3 text-xs font-medium',
                'transition-[padding,background-color,color,box-shadow] duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                colorPickerOpenId === cat.id
                  ? 'pr-7'
                  : 'pr-3 group-hover/pill:pr-7',
                isSelected(cat.id)
                  ? 'shadow-sm bg-foreground text-background'
                  : 'bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground'
              )}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              {cat.name}
            </button>

            {/* Palette icon — appears on pill hover */}
            <Popover
              open={colorPickerOpenId === cat.id}
              onOpenChange={(v) => setColorPickerOpenId(v ? cat.id : null)}
            >
              <PopoverTrigger
                aria-label={`Change color for ${cat.name}`}
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  'absolute right-1.5 top-1/2 -translate-y-1/2',
                  'flex size-4 items-center justify-center rounded-full',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  colorPickerOpenId === cat.id
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-75 group-hover/pill:opacity-100 group-hover/pill:scale-100',
                  isSelected(cat.id)
                    ? 'text-background/60 hover:text-background'
                    : 'text-foreground/40 hover:text-foreground'
                )}
              >
                <Palette className="size-3" />
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-2"
                side="bottom"
                align="center"
                sideOffset={6}
              >
                <CategoryColorPicker
                  selected={cat.color}
                  onChange={(color) => {
                    updateCategory(cat.id, { color });
                    setColorPickerOpenId(null);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        ))}

        <AddCategoryPopover
          hasCategories={categories.length > 0}
          onCategoryAdded={(id) => {
            onSelect(id);
            onCategoryAdded?.(id);
          }}
        />
      </div>

      {/* Inline edit popover */}
      {editingCategory && (
        <AddCategoryPopover
          hasCategories={categories.length > 0}
          editId={editingCategory.id}
          editInitialName={editingCategory.name}
          editInitialColor={editingCategory.color}
          editOpen={editOpen}
          onEditOpenChange={(v) => {
            setEditOpen(v);
            if (!v) setEditingId(null);
          }}
        />
      )}

      {/* Context menu */}
      {contextMenu &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }}
            className="z-[100] min-w-[120px] rounded-lg bg-popover p-1 text-sm shadow-md ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={handleEdit}
              className="flex w-full items-center rounded-md px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Remove
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
