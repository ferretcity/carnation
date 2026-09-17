import { useRef, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useHandbookStore } from "../store";
import { downloadHandbookAsZip } from "../exportMarkdown";
import { saveHandbookToDrive, type SaveProgress } from "../drive/saveToDrive";
import { buildPublishedHtml } from "../publish";
import { slugify } from "../id";
import type { Handbook } from "../types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

export function Toolbar() {
  const handbook = useHandbookStore((s) => s.handbook);
  const storageMode = useHandbookStore((s) => s.storageMode);
  const replaceHandbook = useHandbookStore((s) => s.replaceHandbook);
  const disconnect = useHandbookStore((s) => s.disconnect);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!handbook) return null;

  async function handleExport() {
    setBusy(true);
    setStatus(null);
    try {
      await downloadHandbookAsZip(handbook as Handbook);
      setStatus("Downloaded.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportDocs() {
    setBusy(true);
    setStatus("Signing in…");
    try {
      const link = await saveHandbookToDrive(handbook as Handbook, (progress: SaveProgress) => {
        setStatus(`Saving ${progress.sectionTitle} / ${progress.pageTitle} (${progress.done + 1}/${progress.total})…`);
      });
      setStatus("Exported as Google Docs.");
      window.open(link, "_blank", "noopener,noreferrer");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  function handlePublish() {
    setBusy(true);
    setStatus(null);
    try {
      const html = buildPublishedHtml(handbook as Handbook);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify((handbook as Handbook).orgName)}-handbook.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setStatus("Published — opened in a new tab and downloaded.");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleLoadClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Handbook;
      replaceHandbook(parsed);
      setStatus("Handbook loaded.");
    } catch {
      setStatus("Could not read that file — expected a Carnation handbook JSON export.");
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-xs text-muted-foreground">Updated {new Date(handbook.updatedAt).toLocaleString()}</span>
        <Badge variant="outline">
          {storageMode?.kind === "drive" ? `Synced to Drive: ${storageMode.folderName}` : "Local only"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {status && <span className="text-xs text-primary">{status}</span>}

        <Button size="sm" disabled={busy} onClick={handlePublish}>
          <Globe className="h-3.5 w-3.5" /> Publish
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={busy}>
              Handbook <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleLoadClick}>Load handbook…</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExport}>Export to Markdown</DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportDocs}>Export as Google Docs</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setConfirmSwitch(true)} className="text-destructive">
              Switch handbook…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChosen} />
      </div>

      <AlertDialog open={confirmSwitch} onOpenChange={setConfirmSwitch}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to a different handbook?</AlertDialogTitle>
            <AlertDialogDescription>
              This one stays exactly as saved in its current storage — you can always come back to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={disconnect}>Switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
