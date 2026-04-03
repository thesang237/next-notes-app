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
  const [googleFontsList, setGoogleFontsList] = useState<FontOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const originalFontRef = useRef<FontOption>(activeFont);

  // Static popular Google Fonts (fallback for realtime search to avoid CORS/fetch errors)
  const STATIC_GOOGLE_FONTS: FontOption[] = [
    { id: 'google-roboto', name: 'Roboto', value: "'Roboto', sans-serif", type: 'google' },
    { id: 'google-opensans', name: 'Open Sans', value: "'Open Sans', sans-serif", type: 'google' },
    { id: 'google-lato', name: 'Lato', value: "'Lato', sans-serif", type: 'google' },
    { id: 'google-montserrat', name: 'Montserrat', value: "'Montserrat', sans-serif", type: 'google' },
    { id: 'google-oswald', name: 'Oswald', value: "'Oswald', sans-serif", type: 'google' },
    { id: 'google-raleway', name: 'Raleway', value: "'Raleway', sans-serif", type: 'google' },
    { id: 'google-poppins', name: 'Poppins', value: "'Poppins', sans-serif", type: 'google' },
    { id: 'google-inter', name: 'Inter', value: "'Inter', sans-serif", type: 'google' },
    { id: 'google-robotoslab', name: 'Roboto Slab', value: "'Roboto Slab', serif", type: 'google' },
    { id: 'google-playfair', name: 'Playfair Display', value: "'Playfair Display', serif", type: 'google' },
    { id: 'google-merriweather', name: 'Merriweather', value: "'Merriweather', serif", type: 'google' },
    { id: 'google-lora', name: 'Lora', value: "'Lora', serif", type: 'google' },
    { id: 'google-ptserif', name: 'PT Serif', value: "'PT Serif', serif", type: 'google' },
    { id: 'google-crimson', name: 'Crimson Text', value: "'Crimson Text', serif", type: 'google' },
    { id: 'google-sourcecodepro', name: 'Source Code Pro', value: "'Source Code Pro', monospace", type: 'google' },
    { id: 'google-firasans', name: 'Fira Sans', value: "'Fira Sans', sans-serif", type: 'google' },
    { id: 'google-ubuntu', name: 'Ubuntu', value: "'Ubuntu', sans-serif", type: 'google' },
    { id: 'google-dmsans', name: 'DM Sans', value: "'DM Sans', sans-serif", type: 'google' },
    { id: 'google-work-sans', name: 'Work Sans', value: "'Work Sans', sans-serif", type: 'google' },
    { id: 'google-jost', name: 'Jost', value: "'Jost', sans-serif", type: 'google' },
    { id: 'google-manrope', name: 'Manrope', value: "'Manrope', sans-serif", type: 'google' },
    { id: 'google-figtree', name: 'Figtree', value: "'Figtree', sans-serif", type: 'google' },
    { id: 'google-spacegrotesk', name: 'Space Grotesk', value: "'Space Grotesk', sans-serif", type: 'google' },
    { id: 'google-geist', name: 'Geist', value: "'Geist', sans-serif", type: 'google' },
    { id: 'google-geistsans', name: 'Geist Sans', value: "'Geist Sans', sans-serif", type: 'google' },
    { id: 'google-geistmono', name: 'Geist Mono', value: "'Geist Mono', monospace", type: 'google' },
    { id: 'google-commissioner', name: 'Commissioner', value: "'Commissioner', sans-serif", type: 'google' },
    { id: 'google-instrument-sans', name: 'Instrument Sans', value: "'Instrument Sans', sans-serif", type: 'google' },
    { id: 'google-instrument-serif', name: 'Instrument Serif', value: "'Instrument Serif', serif", type: 'google' },
    { id: 'google-bebasneue', name: 'Bebas Neue', value: "'Bebas Neue', sans-serif", type: 'google' },
  ];

  // Build the full font list: defaults + active google font at end
  const fontList = useMemo<FontOption[]>(() => {
    if (activeFont.type === 'google') {
      return [...DEFAULT_FONTS, activeFont];
    }
    return DEFAULT_FONTS;
  }, [activeFont]);

  // Filtered google fonts for realtime search (limit to 20)
  const filteredGoogle = useMemo(() => {
    if (!query || !googleFontsList.length) return [];
    return googleFontsList
      .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20);
  }, [query, googleFontsList]);

  // Filtered list based on query: defaults + matching google
  const filteredFonts = useMemo(() => {
    const defFiltered = !query 
      ? fontList 
      : fontList.filter((f) =>
          f.name.toLowerCase().includes(query.toLowerCase())
        );
    return [...defFiltered, ...filteredGoogle];
  }, [fontList, query, filteredGoogle]);

  // Whether to show "Use as Google Font" option
  const queryIsDefault = DEFAULT_FONTS.some(
    (f) => f.name.toLowerCase() === query.toLowerCase()
  );
  const queryIsActiveGoogle =
    activeFont.type === 'google' &&
    activeFont.name.toLowerCase() === query.toLowerCase();
  const queryMatchesAnyGoogle = googleFontsList.some(
    (f) => f.name.toLowerCase() === query.toLowerCase()
  );
  const showGoogleOption =
    query.trim().length > 0 && !queryIsDefault && !queryIsActiveGoogle && !queryMatchesAnyGoogle;

  const totalItems = filteredFonts.length + (showGoogleOption ? 1 : 0);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setFocusedIndex(0);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
      originalFontRef.current = activeFont; // STEP 4: save original for revert on close
      setGoogleFontsList(STATIC_GOOGLE_FONTS); // STEP 3: use static list for realtime (avoids fetch/CORS error)
    } else if (originalFontRef.current) {
      // revert to original if not committed by final select
      document.documentElement.style.setProperty('--font-app', originalFontRef.current.value);
    }
  }, [open, activeFont]);

  // Keep focusedIndex in bounds when list changes
  useEffect(() => {
    setFocusedIndex((prev) => Math.min(prev, Math.max(0, totalItems - 1)));
  }, [totalItems]);

  // STEP 6: live preview on focus/hover - update font temporarily
  useEffect(() => {
    if (!open) return;
    let font: FontOption | null = null;
    if (focusedIndex < filteredFonts.length) {
      font = filteredFonts[focusedIndex];
    } else if (showGoogleOption && focusedIndex === filteredFonts.length) {
      const q = query.trim();
      if (q) {
        font = {
          id: `google-${q}`,
          name: q,
          value: `'${q}', sans-serif`,
          type: 'google',
        };
      }
    }
    if (font) {
      const applyPreview = async () => {
        if (font!.type === 'google') {
          try {
            await loadGoogleFont(font!.name);
          } catch {}
        }
        document.documentElement.style.setProperty('--font-app', font!.value);
      };
      applyPreview();
    }
  }, [focusedIndex, filteredFonts, showGoogleOption, query, open]);

  const handleSelectFont = useCallback(
    async (font: FontOption) => {
      setLoading(true);
      try {
        await onSelectFont(font);
        originalFontRef.current = font; // STEP 5: update original after commit so no revert on close
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
      originalFontRef.current = googleFont; // STEP 5: update original after commit
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
        <DialogPrimitive.Backdrop className="fixed inset-0 isolate z-50 bg-black/5 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
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
