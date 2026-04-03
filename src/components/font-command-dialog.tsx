'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { CheckIcon, SearchIcon, LoaderCircleIcon, TypeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_FONTS, loadGoogleFont } from '@/hooks/useFont';
import type { FontOption } from '@/hooks/useFont';
import { toast } from 'sonner';

interface FontCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFont: FontOption;
  onSelectFont: (font: FontOption) => Promise<void>;
}

const PREVIEW_TEXT = 'The quick brown fox';

const FONT_PREVIEW_STYLES: Record<string, React.CSSProperties> = {
  sans: { fontFamily: 'var(--font-jakarta), system-ui, sans-serif' },
  serif: { fontFamily: "Georgia, 'Times New Roman', serif" },
  mono: { fontFamily: "'Courier New', Consolas, monospace" },
};

function getFontStyle(font: FontOption): React.CSSProperties {
  if (font.type === 'google') {
    return { fontFamily: `'${font.name}', sans-serif` };
  }
  return FONT_PREVIEW_STYLES[font.type] ?? {};
}

export function FontCommandDialog({
  open,
  onOpenChange,
  activeFont,
  onSelectFont,
}: FontCommandDialogProps) {
  const [query, setQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the full font list: defaults + active google font at end
  const fontList = useMemo<FontOption[]>(() => {
    if (activeFont.type === 'google') {
      return [...DEFAULT_FONTS, activeFont];
    }
    return DEFAULT_FONTS;
  }, [activeFont]);

  // Filtered list based on query
  const filteredFonts = useMemo(() => {
    if (!query) return fontList;
    return fontList.filter((f) =>
      f.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [fontList, query]);

  // Whether to show "Use as Google Font" option
  const queryIsDefault = DEFAULT_FONTS.some(
    (f) => f.name.toLowerCase() === query.toLowerCase()
  );
  const queryIsActiveGoogle =
    activeFont.type === 'google' &&
    activeFont.name.toLowerCase() === query.toLowerCase();
  const showGoogleOption =
    query.trim().length > 0 && !queryIsDefault && !queryIsActiveGoogle;

  const totalItems = filteredFonts.length + (showGoogleOption ? 1 : 0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setFocusedIndex(0);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep focusedIndex in bounds when list changes
  useEffect(() => {
    setFocusedIndex((prev) => Math.min(prev, Math.max(0, totalItems - 1)));
  }, [totalItems]);

  const handleSelectFont = useCallback(
    async (font: FontOption) => {
      setLoading(true);
      try {
        await onSelectFont(font);
        onOpenChange(false);
      } catch {
        toast.error(`Could not apply font "${font.name}".`);
      } finally {
        setLoading(false);
      }
    },
    [onSelectFont, onOpenChange]
  );

  const handleGoogleSearch = useCallback(async () => {
    const name = query.trim();
    if (!name) return;
    setLoading(true);
    try {
      await loadGoogleFont(name);
      const googleFont: FontOption = {
        id: `google-${name}`,
        name,
        value: `'${name}', sans-serif`,
        type: 'google',
      };
      await onSelectFont(googleFont);
      onOpenChange(false);
    } catch {
      toast.error(`Could not load Google Font "${name}". Check the spelling.`);
    } finally {
      setLoading(false);
    }
  }, [query, onSelectFont, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const googleOptionIndex = filteredFonts.length;
        if (showGoogleOption && focusedIndex === googleOptionIndex) {
          handleGoogleSearch();
        } else if (focusedIndex < filteredFonts.length) {
          handleSelectFont(filteredFonts[focusedIndex]);
        }
      }
    },
    [
      totalItems,
      filteredFonts,
      focusedIndex,
      showGoogleOption,
      handleGoogleSearch,
      handleSelectFont,
    ]
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-[20%] left-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-hidden rounded-xl bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-xl duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            {loading ? (
              <LoaderCircleIcon className="size-4 shrink-0 text-muted-foreground animate-spin" />
            ) : (
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Pick a font or search Google Fonts..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Font list */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredFonts.length === 0 && !showGoogleOption && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No fonts found.
              </div>
            )}

            {filteredFonts.map((font, i) => {
              const isActive = font.id === activeFont.id;
              const isFocused = i === focusedIndex;
              return (
                <button
                  key={font.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectFont(font)}
                  onMouseEnter={() => setFocusedIndex(i)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                    isFocused && 'bg-accent',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {/* Font name + preview */}
                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <span
                      className={cn(
                        'text-sm leading-tight truncate',
                        isActive ? 'font-semibold text-foreground' : 'font-medium'
                      )}
                      style={getFontStyle(font)}
                    >
                      {font.name}
                    </span>
                    <span
                      className="text-xs text-muted-foreground truncate"
                      style={getFontStyle(font)}
                    >
                      {PREVIEW_TEXT}
                    </span>
                  </div>

                  {/* Google badge */}
                  {font.type === 'google' && (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
                      Google
                    </span>
                  )}

                  {/* Active check */}
                  {isActive && (
                    <CheckIcon className="size-4 shrink-0 text-foreground" />
                  )}
                </button>
              );
            })}

            {/* Use as Google Font option */}
            {showGoogleOption && (
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSearch}
                onMouseEnter={() => setFocusedIndex(filteredFonts.length)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors text-muted-foreground hover:text-foreground',
                  focusedIndex === filteredFonts.length && 'bg-accent text-foreground'
                )}
              >
                <TypeIcon className="size-4 shrink-0" />
                <span className="text-sm">
                  Use{' '}
                  <span className="font-medium text-foreground">
                    &ldquo;{query}&rdquo;
                  </span>{' '}
                  as Google Font
                </span>
              </button>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
