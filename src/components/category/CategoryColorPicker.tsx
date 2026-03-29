'use client';

import { Check } from 'lucide-react';
import { CATEGORY_COLORS } from '@/lib/constants';

interface CategoryColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

export function CategoryColorPicker({ selected, onChange }: CategoryColorPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2 p-1">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Select color ${color}`}
          onClick={() => onChange(color)}
          className="relative size-7 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={{ backgroundColor: color, boxShadow: selected === color ? `0 0 0 2px white, 0 0 0 3.5px #1a1a1a` : undefined }}
        >
          {selected === color && (
            <Check className="absolute inset-0 m-auto size-3.5 text-[#1a1a1a]" strokeWidth={3} />
          )}
        </button>
      ))}
    </div>
  );
}
