import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { marked } from "marked";
import TurndownService from "turndown";
import { Bold, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });

function markdownToHtml(markdownText: string): string {
  return marked.parse(markdownText, { async: false }) as string;
}

function htmlToMarkdown(html: string): string {
  return turndown.turndown(html).trim();
}

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, className }: MarkdownEditorProps) {
  // Tracks the markdown we last emitted ourselves, so the sync effect below
  // doesn't fight the user's typing by re-parsing on every keystroke.
  const lastEmitted = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Start writing…" }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
          "prose-headings:font-serif prose-p:font-serif prose-blockquote:font-serif prose-li:font-serif",
          "min-h-[45vh]",
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const markdownText = htmlToMarkdown(editor.getHTML());
      lastEmitted.current = markdownText;
      onChange(markdownText);
    },
  });

  // Keep the editor's document in sync when `value` changes from outside
  // (switching to a different page), without fighting the user's own typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current) {
      lastEmitted.current = value;
      editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border border-input bg-card", className)}>
      <div className="flex flex-wrap gap-1 border-b border-border p-1.5">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Heading"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="Quote"
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="Bullet list"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("link")}
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          label="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "ghost"}
      size="icon"
      className="h-7 w-7"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
