export const CATEGORY_COLORS = [
  'hsl(210, 60%, 92%)',
  'hsl(150, 50%, 90%)',
  'hsl(30, 60%, 91%)',
  'hsl(330, 50%, 92%)',
  'hsl(270, 50%, 91%)',
  'hsl(60, 50%, 90%)',
  'hsl(0, 55%, 92%)',
  'hsl(180, 50%, 90%)',
] as const;

export const NEUTRAL_NOTE_COLOR = 'hsl(0, 0%, 95%)';

export const FONT_SIZE_THRESHOLDS = [
  { maxLength: 40, size: 28 },
  { maxLength: 80, size: 22 },
  { maxLength: 150, size: 18 },
  { maxLength: Infinity, size: 15 },
] as const;

export function getDynamicFontSize(length: number): number {
  for (const t of FONT_SIZE_THRESHOLDS) {
    if (length <= t.maxLength) return t.size;
  }
  return 15;
}
