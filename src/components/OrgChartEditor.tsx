import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useHandbookStore } from "../store";
import type { OrgNode } from "../types";
import { makeId } from "../id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function descendantIds(nodes: OrgNode[], id: string): string[] {
  const kids = nodes.filter((n) => n.parentId === id).map((n) => n.id);
  return kids.reduce<string[]>((acc, kid) => [...acc, kid, ...descendantIds(nodes, kid)], []);
}

function OrgBox({ node, selected, onClick }: { node: OrgNode; selected?: boolean; onClick?: () => void }) {
  return (
    <div
      className={cn(
        "min-w-[140px] rounded-lg border border-border bg-card px-3.5 py-2 text-center",
        onClick && "cursor-pointer hover:border-primary",
        selected && "border-primary bg-accent",
        node.kind === "group" && "border-dashed",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {node.kind === "group" && (
        <div className="mb-0.5 text-[9px] tracking-wide text-amber-600 dark:text-amber-400">GROUP</div>
      )}
      <div className="text-[13px] font-semibold text-foreground">{node.title}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{node.description}</div>
    </div>
  );
}

export function OrgChartEditor() {
  const nodes = useHandbookStore((s) => s.handbook?.orgChart ?? []);
  const setOrgChart = useHandbookStore((s) => s.setOrgChart);
  const root = nodes.find((n) => n.parentId === null);
  const [path, setPath] = useState<string[]>(root ? [root.id] : []);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  if (!root) return null;

  const validPath = path.filter((id) => byId.has(id));
  if (validPath.length === 0) validPath.push(root.id);
  const focusId = validPath[validPath.length - 1];
  const focus = byId.get(focusId)!;

  function selectAt(rowIndex: number, id: string) {
    setPath([...validPath.slice(0, rowIndex + 1), id]);
  }

  function updateFocus(patch: Partial<OrgNode>) {
    setOrgChart(nodes.map((n) => (n.id === focus.id ? { ...n, ...patch } : n)));
  }

  function addChild(kind: OrgNode["kind"]) {
    const id = makeId();
    setOrgChart([
      ...nodes,
      { id, parentId: focus.id, kind, title: kind === "group" ? "New group" : "New role", description: "Describe this" },
    ]);
  }

  function removeFocus() {
    if (validPath.length <= 1) return;
    const toRemove = new Set([focus.id, ...descendantIds(nodes, focus.id)]);
    setOrgChart(nodes.filter((n) => !toRemove.has(n.id)));
    setPath(validPath.slice(0, -1));
  }

  const rows = validPath.map((parentId, rowIndex) => {
    const highlightedId = validPath[rowIndex + 1];
    return {
      parentId,
      children: nodes.filter((n) => n.parentId === parentId).map((n) => ({ ...n, rowIndex, highlighted: n.id === highlightedId })),
    };
  });

  const breadcrumb = validPath.map((id) => byId.get(id)?.title ?? "").join("  ›  ");

  return (
    <div className="max-w-[780px] px-5 py-5">
      <div className="mb-3.5 text-xs text-muted-foreground">{breadcrumb}</div>

      <div className="flex flex-col items-center">
        <div className="flex justify-center">
          <OrgBox node={root} selected />
        </div>

        {rows.map((row) => (
          <div key={row.parentId} className="flex w-full flex-col items-center">
            <div className="h-4 w-0.5 bg-border" />
            <div className="flex flex-wrap justify-center gap-4">
              {row.children.map((n) => (
                <OrgBox key={n.id} node={n} selected={n.highlighted} onClick={() => selectAt(n.rowIndex, n.id)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-end gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="org-title">Title</Label>
            <Input id="org-title" value={focus.title} onChange={(e) => updateFocus({ title: e.target.value })} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="org-desc">One-line description</Label>
            <Input
              id="org-desc"
              value={focus.description}
              onChange={(e) => updateFocus({ description: e.target.value })}
            />
          </div>
          <div className="flex gap-1.5">
            <Button
              variant={focus.kind === "role" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => updateFocus({ kind: "role" })}
            >
              Role
            </Button>
            <Button
              variant={focus.kind === "group" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => updateFocus({ kind: "group" })}
            >
              Group
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addChild("role")}>
            <Plus className="h-3.5 w-3.5" /> Add role
          </Button>
          <Button variant="outline" size="sm" onClick={() => addChild("group")}>
            <Plus className="h-3.5 w-3.5" /> Add group
          </Button>
          {validPath.length > 1 && (
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmRemove(true)}>
              Remove {focus.title}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{focus.title}"?</AlertDialogTitle>
            <AlertDialogDescription>This also removes everything nested under it. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeFocus();
                setConfirmRemove(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
