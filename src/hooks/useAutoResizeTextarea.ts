'use client';

import { useCallback, RefObject } from 'react';

export function useAutoResizeTextarea(ref: RefObject<HTMLTextAreaElement | null>) {
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref]);

  return resize;
}
