'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CategoryColorPicker } from './CategoryColorPicker';
import { CATEGORY_COLORS } from '@/lib/constants';
import { useNotesStore } from '@/store/useNotesStore';
import { cn } from '@/lib/utils';

interface AddCategoryPopoverProps {
  onCategoryAdded?: (id: string) => void;
  hasCategories: boolean;
  // Edit mode
  editId?: string;
  editInitialName?: string;
  editInitialColor?: string;
  editOpen?: boolean;
  onEditOpenChange?: (open: boolean) => void;
}

export function AddCategoryPopover({
  onCategoryAdded,
  hasCategories,
  editId,
  editInitialName,
  editInitialColor,
  editOpen,
  onEditOpenChange,
}: AddCategoryPopoverProps) {
  const isEditMode = !!editId;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(editInitialName ?? '');
  const [color, setColor] = useState(editInitialColor ?? CATEGORY_COLORS[0]);
  const [showColors, setShowColors] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { categories, addCategory, updateCategory } = useNotesStore();

  const isOpen = isEditMode ? (editOpen ?? false) : open;
  const setIsOpen = isEditMode
    ? (v: boolean) => onEditOpenChange?.(v)
    : setOpen;

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setName(editInitialName ?? '');
      setColor(editInitialColor ?? CATEGORY_COLORS[0]);
      setShowColors(false);
      setError('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, editInitialName, editInitialColor]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase() && c.id !== editId
    );
    if (duplicate) {
      setError('Category already exists');
      return;
    }

    if (isEditMode && editId) {
      updateCategory(editId, { name: trimmed, color });
      setIsOpen(false);
    } else {
      const id = addCategory(trimmed, color);
      setIsOpen(false);
      onCategoryAdded?.(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      {!isEditMode && (
        <PopoverTrigger
          aria-label="Add category"
          className={cn(
            'group flex h-7 shrink-0 items-center rounded-full',
            'transition-all duration-200',
            'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            hasCategories
              ? 'gap-0 pl-2 pr-2 hover:gap-1.5 hover:pl-3 hover:pr-3'
              : 'gap-1.5 px-3 text-xs font-medium'
          )}
        >
          <Plus className="size-3.5 shrink-0" />
          {hasCategories ? (
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium transition-[max-width] duration-200 group-hover:max-w-[100px]">
              New Group
            </span>
          ) : (
            <span>Add category</span>
          )}
        </PopoverTrigger>
      )}
      <PopoverContent
        className="w-64 p-3"
        side="bottom"
        align="start"
        sideOffset={6}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowColors((v) => !v)}
              aria-label="Pick color"
              className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ backgroundColor: color }}
            >
              <Palette className="size-3.5 text-[#1a1a1a]/60" />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Category name"
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 placeholder:text-muted-foreground"
            />
          </div>
          {showColors && (
            <CategoryColorPicker
              selected={color}
              onChange={(c) => {
                setColor(c);
                setShowColors(false);
              }}
            />
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background hover:opacity-90 transition-opacity"
            >
              {isEditMode ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
