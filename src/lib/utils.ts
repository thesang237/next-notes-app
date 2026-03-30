import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert plain text (with newlines) to HTML for Tiptap
export function plainTextToHtml(text: string): string {
  if (!text) return '<p></p>';
  if (text.trimStart().startsWith('<')) return text; // already HTML
  return text
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('') || '<p></p>';
}

// Strip HTML tags and decode basic entities to plain text, preserving newlines
export function htmlToText(html: string): string {
  if (!html.trimStart().startsWith('<')) return html;
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function isHtmlEmpty(html: string): boolean {
  return !html || htmlToText(html).trim() === '';
}

export function formatNoteTime(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = String(date.getFullYear()).slice(2);
  return `${hours}:${minutes}:${seconds}, ${day}.${month}.${year}`;
}
