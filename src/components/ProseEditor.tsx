import { useState } from "react";
import { Info } from "lucide-react";
import { useHandbookStore } from "../store";
import type { Page } from "../types";
import { slugify } from "../id";
import { Button } from "@/components/ui/button";
import { PageDetailsPanel } from "./PageDetailsPanel";
import { MarkdownEditor } from "./MarkdownEditor";

export function ProseEditor({ page }: { page: Page }) {
  const updatePage = useHandbookStore((s) => s.updatePage);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="max-w-[720px] px-5 py-5 font-serif">
      <div className="flex items-start justify-between gap-4">
        <input
          className="w-full border-none bg-transparent text-3xl font-normal text-foreground outline-none"
          value={page.title}
          onChange={(e) =>
            updatePage(page.id, { title: e.target.value, slug: slugify(e.target.value) })
          }
        />
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full"
          aria-label="Toggle page details"
          onClick={() => setShowDetails((v) => !v)}
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {showDetails && <PageDetailsPanel page={page} />}

      <div className="mt-6">
        <MarkdownEditor
          value={page.body}
          onChange={(value) => updatePage(page.id, { body: value })}
          placeholder={`Add ${page.title} content here.`}
        />
      </div>
    </div>
  );
}
