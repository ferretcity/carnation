import { useHandbookStore } from "../store";
import type { EditorialNotes, Page, PageKind } from "../types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const KIND_OPTIONS: { value: PageKind; label: string }[] = [
  { value: "mission", label: "Mission" },
  { value: "value", label: "Value" },
  { value: "policy", label: "Policy" },
  { value: "procedure", label: "Procedure" },
  { value: "activity", label: "Activity" },
  { value: "generic", label: "Generic" },
];

export function PageDetailsPanel({ page }: { page: Page }) {
  const handbook = useHandbookStore((s) => s.handbook);
  const updatePage = useHandbookStore((s) => s.updatePage);

  const allPages = handbook?.sections.flatMap((s) => s.pages) ?? [];
  const servesOptions = allPages.filter(
    (p) => (p.kind === "mission" || p.kind === "value") && p.id !== page.id,
  );
  const orgChart = handbook?.orgChart ?? [];

  function updateNotes(patch: Partial<EditorialNotes>) {
    updatePage(page.id, { editorialNotes: { ...page.editorialNotes, ...patch } });
  }

  function toggleLinkedNode(nodeId: string, checked: boolean) {
    const current = page.linkedOrgNodeIds ?? [];
    const next = checked ? [...current, nodeId] : current.filter((id) => id !== nodeId);
    updatePage(page.id, { linkedOrgNodeIds: next });
  }

  return (
    <div className="my-4 flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-4 font-sans">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Kind</Label>
          <Select value={page.kind} onValueChange={(value) => updatePage(page.id, { kind: value as PageKind })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KIND_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner-email">Owner email</Label>
          <Input
            id="owner-email"
            type="email"
            value={page.ownerEmail ?? ""}
            placeholder="owner@example.org"
            onChange={(e) => updatePage(page.id, { ownerEmail: e.target.value || undefined })}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last-reviewed">Last reviewed</Label>
          <Input
            id="last-reviewed"
            type="date"
            value={page.lastReviewedAt?.slice(0, 10) ?? ""}
            onChange={(e) =>
              updatePage(page.id, {
                lastReviewedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Serves</Label>
          <Select
            value={page.servesPageId ?? "none"}
            onValueChange={(value) => updatePage(page.id, { servesPageId: value === "none" ? undefined : value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {servesOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {page.kind === "activity" && (
        <div className="border-t border-border pt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Schedule &amp; ownership
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activity-schedule">Schedule</Label>
              <Input
                id="activity-schedule"
                value={page.schedule ?? ""}
                placeholder="e.g. Annually, every January"
                onChange={(e) => updatePage(page.id, { schedule: e.target.value || undefined })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Run by</Label>
              {orgChart.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add roles or groups to the Organization Chart first.</p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-2">
                  {orgChart.map((node) => (
                    <label key={node.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={page.linkedOrgNodeIds?.includes(node.id) ?? false}
                        onChange={(e) => toggleLinkedNode(node.id, e.target.checked)}
                      />
                      {node.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Editorial notes
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          For whoever maintains this page — not shown to readers or in the published handbook.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes-purpose">Why this page exists</Label>
            <Textarea
              id="notes-purpose"
              rows={2}
              value={page.editorialNotes?.purpose ?? ""}
              onChange={(e) => updateNotes({ purpose: e.target.value || undefined })}
              placeholder="e.g. So new members understand how we're organized."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes-editing">How it should be edited</Label>
            <Textarea
              id="notes-editing"
              rows={2}
              value={page.editorialNotes?.editingGuidance ?? ""}
              onChange={(e) => updateNotes({ editingGuidance: e.target.value || undefined })}
              placeholder="e.g. Update whenever the elder board changes; keep it under 200 words."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes-audience">Who it's for</Label>
            <Textarea
              id="notes-audience"
              rows={2}
              value={page.editorialNotes?.audience ?? ""}
              onChange={(e) => updateNotes({ audience: e.target.value || undefined })}
              placeholder="e.g. New members, all staff, leadership only."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
