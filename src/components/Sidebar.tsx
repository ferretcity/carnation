import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useHandbookStore } from "../store";
import { ORG_CHART_ID, type PageKind } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { CarnationMark } from "./CarnationMark";

export function Sidebar() {
  const handbook = useHandbookStore((s) => s.handbook);
  const selectedPageId = useHandbookStore((s) => s.selectedPageId);
  const selectPage = useHandbookStore((s) => s.selectPage);
  const setView = useHandbookStore((s) => s.setView);
  const addPage = useHandbookStore((s) => s.addPage);
  const deletePage = useHandbookStore((s) => s.deletePage);
  const movePage = useHandbookStore((s) => s.movePage);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ sectionId: string; pageId: string; title: string } | null>(
    null,
  );

  if (!handbook) return null;

  function open(pageId: string) {
    selectPage(pageId);
    setView("editor");
  }

  const DEFAULT_KIND_BY_SECTION: Record<string, PageKind> = {
    mission: "mission",
    values: "value",
    "policies-and-procedures": "procedure",
    "activities-and-schedules": "activity",
  };

  function commitAdd(sectionId: string) {
    const title = newTitle.trim();
    if (title) addPage(sectionId, title, DEFAULT_KIND_BY_SECTION[sectionId]);
    setAddingTo(null);
    setNewTitle("");
  }

  return (
    <nav className="overflow-y-auto border-r border-border bg-muted/40 p-4">
      <div className="mb-1 flex items-center gap-1.5 text-primary">
        <CarnationMark className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wider">Carnation</span>
      </div>
      <h1 className="mb-4 text-lg font-semibold">{handbook.orgName}</h1>
      {handbook.sections.map((section) => (
        <div key={section.id} className="mb-5">
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h2>
          {section.id === "organization" ? (
            <ul>
              <li
                className={cn(
                  "rounded-md",
                  selectedPageId === ORG_CHART_ID && "bg-accent",
                )}
              >
                <button
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent"
                  onClick={() => open(ORG_CHART_ID)}
                >
                  Organization Chart
                </button>
              </li>
            </ul>
          ) : (
            <>
              <ul>
                {section.pages.map((p, index) => (
                  <li
                    key={p.id}
                    className={cn(
                      "group flex items-center rounded-md",
                      p.id === selectedPageId && "bg-accent",
                    )}
                  >
                    <button
                      className="flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent"
                      onClick={() => open(p.id)}
                    >
                      {p.title}
                    </button>
                    <span className="hidden items-center gap-0.5 pr-1 group-hover:flex">
                      <button
                        aria-label="Move up"
                        disabled={index === 0}
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => movePage(section.id, p.id, -1)}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        aria-label="Move down"
                        disabled={index === section.pages.length - 1}
                        className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => movePage(section.id, p.id, 1)}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        aria-label={`Delete ${p.title}`}
                        className="rounded p-1 text-muted-foreground hover:text-destructive"
                        onClick={() => setPendingDelete({ sectionId: section.id, pageId: p.id, title: p.title })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {addingTo === section.id ? (
                <Input
                  autoFocus
                  className="mt-1 h-8 text-sm"
                  value={newTitle}
                  placeholder="Page title"
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitAdd(section.id);
                    if (e.key === "Escape") setAddingTo(null);
                  }}
                  onBlur={() => commitAdd(section.id)}
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 w-full justify-start text-muted-foreground"
                  onClick={() => setAddingTo(section.id)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add page
                </Button>
              )}
            </>
          )}
        </div>
      ))}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deletePage(pendingDelete.sectionId, pendingDelete.pageId);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}
