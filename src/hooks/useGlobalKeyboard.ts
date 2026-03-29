'use client';

import { useEffect } from 'react';

export function useGlobalKeyboard(onEnter: () => void) {
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      const isInteractiveFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.getAttribute('role') === 'tab' ||
        target.getAttribute('role') === 'menuitem' ||
        target.getAttribute('role') === 'option' ||
        target.getAttribute('role') === 'button' ||
        (target.tabIndex >= 0 && target !== document.body);
      const isDialogOpen =
        document.querySelector('[data-slot="dialog-content"]') !== null ||
        document.querySelector('[data-slot="alert-dialog-content"]') !== null;
      if (isInteractiveFocused || isDialogOpen) return;
      onEnter();
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onEnter]);
}
