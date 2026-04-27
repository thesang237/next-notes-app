'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Strikethrough, List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  fontSize?: number;
  onEscape?: () => void;
  onSave?: () => void;
  autoFocus?: boolean;
  bgColor?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  minHeight = '120px',
  maxHeight,
  fontSize = 15,
  onEscape,
  onSave,
  autoFocus = false,
  bgColor,
}: RichTextEditorProps) {
  const onEscapeRef = useRef(onEscape);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onEscapeRef.current = onEscape;
    onSaveRef.current = onSave;
  }, [onEscape, onSave]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: { class: 'outline-none break-words w-full max-w-full' },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onEscapeRef.current?.();
          return true;
        }
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault();
          onSaveRef.current?.();
          return true;
        }
        return false;
      },
    },
  });

  const toolbarBtn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    isActive: boolean,
  ) => (
    <button
      key={label}
      type="button"
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      aria-label={label}
      className={cn(
        'flex size-7 items-center justify-center rounded-md transition-colors',
        'text-[#1a1a1a]/40 hover:text-[#1a1a1a]/70 hover:bg-black/[0.06]',
        isActive && 'text-[#1a1a1a] bg-black/[0.08]',
      )}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="rounded-2xl p-5 shadow-sm ring-1 ring-black/[0.04]"
      style={{ backgroundColor: bgColor }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 mb-3 pb-2.5 border-b border-black/[0.08]">
        {toolbarBtn('Bold', <Bold className="size-3.5" />, () => editor?.chain().focus().toggleBold().run(), !!editor?.isActive('bold'))}
        {toolbarBtn('Italic', <Italic className="size-3.5" />, () => editor?.chain().focus().toggleItalic().run(), !!editor?.isActive('italic'))}
        {toolbarBtn('Strikethrough', <Strikethrough className="size-3.5" />, () => editor?.chain().focus().toggleStrike().run(), !!editor?.isActive('strike'))}
        <div className="mx-1 h-4 w-px bg-black/[0.10]" />
        {toolbarBtn('Bullet list', <List className="size-3.5" />, () => editor?.chain().focus().toggleBulletList().run(), !!editor?.isActive('bulletList'))}
        {toolbarBtn('Ordered list', <ListOrdered className="size-3.5" />, () => editor?.chain().focus().toggleOrderedList().run(), !!editor?.isActive('orderedList'))}
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="rich-text font-content text-[#1a1a1a] overflow-y-auto"
        style={{ fontSize: `${fontSize}px`, minHeight, maxHeight }}
      />

    </div>
  );
}
