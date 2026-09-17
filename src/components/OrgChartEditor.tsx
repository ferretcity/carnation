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
        "min-w-[140px] cursor-pointer rounded-lg border border-border bg-card px-3.5 py-2 text-center hover:border-primary",
        selected && "border-primary bg-accent",
        node.kind === "group" && "border-dashed",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
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
  const topLevel = nodes.filter((n) => n.parentId === null);
  const [path, setPath] = useState<string[]>(() => (topLevel[0] ? [topLevel[0].id] : []));
  const [confirmRemove, setConfirmRemove] = useState(false);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const validPath = path.filter((id) => byId.has(id));
  const focusId = validPath[validPath.length - 1];
  const focus = focusId ? byId.get(focusId) : undefined;

  function selectAt(rowIndex: number, id: string) {
    setPath([...validPath.slice(0, rowIndex), id]);
  }

  function updateFocus(patch: Partial<OrgNode>) {
    if (!focus) return;
    setOrgChart(nodes.map((n) => (n.id === focus.id ? { ...n, ...patch } : n)));
  }

  function addNode(kind: OrgNode["kind"], parentId: string | null) {
    const id = makeId();
    const label = kind === "group" ? "New group" : "New role";
    setOrgChart([...nodes, { id, parentId, kind, title: label, description: "Describe this" }]);
    setPath(parentId === null ? [id] : [...validPath, id]);
  }

  function removeFocus() {
    if (!focus) return;
    const toRemove = new Set([focus.id, ...descendantIds(nodes, focus.id)]);
    setOrgChart(nodes.filter((n) => !toRemove.has(n.id)));
    setPath(validPath.slice(0, -1));
  }

  // Row 0 is the top level (every node with parentId === null — an org can
  // have several independent roles/groups here, not just one root). Each
  // subsequent row shows the children of whatever was picked in the row above.
  const rows = [{ parentId: null as string | null, nodes: topLevel, highlightedId: validPath[0] }];
  validPath.forEach((selectedId, i) => {
    rows.push({
      parentId: selectedId,
      nodes: nodes.filter((n) => n.parentId === selectedId),
      highlightedId: validPath[i + 1],
    });
  });

  const breadcrumb = validPath.map((id) => byId.get(id)?.title ?? "").join("  ›  ");

  return (
    <div className="max-w-[780px] px-5 py-5">
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">{breadcrumb || "No selection"}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addNode("role", null)}>
            <Plus className="h-3.5 w-3.5" /> Add top-level role
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode("group", null)}>
            <Plus className="h-3.5 w-3.5" /> Add top-level group
          </Button>
        </div>
      </div>

      {topLevel.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No roles or groups yet — add one above to start the chart.
        </p>
      ) : (
        <div className="flex flex-col items-center">
          {rows.map((row, rowIndex) =>
            row.nodes.length === 0 ? null : (
              <div key={row.parentId ?? "top"} className="flex w-full flex-col items-center">
                {rowIndex > 0 && <div className="h-4 w-0.5 bg-border" />}
                <div className="flex flex-wrap justify-center gap-4">
                  {row.nodes.map((n) => (
                    <OrgBox
                      key={n.id}
                      node={n}
                      selected={n.id === row.highlightedId}
                      onClick={() => selectAt(rowIndex, n.id)}
                    />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {focus && (
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
            <Button variant="outline" size="sm" onClick={() => addNode("role", focus.id)}>
              <Plus className="h-3.5 w-3.5" /> Add role
            </Button>
            <Button variant="outline" size="sm" onClick={() => addNode("group", focus.id)}>
              <Plus className="h-3.5 w-3.5" /> Add group
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmRemove(true)}
            >
              Remove {focus.title}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove "{focus?.title}"?</AlertDialogTitle>
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
