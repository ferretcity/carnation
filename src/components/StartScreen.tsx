import { useRef, useState } from "react";
import { useHandbookStore } from "../store";
import { getDriveAccessToken } from "../drive/googleAuth";
import { pickDriveFolder } from "../drive/picker";
import { connectDriveFolder } from "../drive/driveSync";
import type { Handbook } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CarnationMark } from "./CarnationMark";

export function StartScreen() {
  const storageMode = useHandbookStore((s) => s.storageMode);
  const startBlank = useHandbookStore((s) => s.startBlank);
  const startFromHandbook = useHandbookStore((s) => s.startFromHandbook);
  const startDriveConnection = useHandbookStore((s) => s.startDriveConnection);

  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function handleConnectDrive() {
    void withBusy(async () => {
      const accessToken = await getDriveAccessToken();
      const folder = await pickDriveFolder(accessToken);
      if (!folder) return;
      const conn = await connectDriveFolder(folder.id, folder.name);
      startDriveConnection(conn);
    });
  }

  function handleReconnect() {
    if (storageMode?.kind !== "drive") return;
    const { folderId, folderName } = storageMode;
    void withBusy(async () => {
      const conn = await connectDriveFolder(folderId, folderName);
      startDriveConnection(conn);
    });
  }

  function handleLoadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void withBusy(async () => {
      const text = await file.text();
      let parsed: Handbook;
      try {
        parsed = JSON.parse(text) as Handbook;
      } catch {
        throw new Error("Could not read that file — expected a Carnation handbook JSON export.");
      }
      startFromHandbook(parsed);
    });
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <CarnationMark className="h-7 w-7" />
            <CardTitle className="text-primary">Carnation</CardTitle>
          </div>
          <CardDescription>A handbook editor for small organizations.</CardDescription>
        </CardHeader>
        <CardContent>
          {storageMode?.kind === "drive" && (
            <Button disabled={busy} onClick={handleReconnect}>
              Reconnect to "{storageMode.folderName}"
            </Button>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="My Church"
              disabled={busy}
            />
            <Button disabled={busy || !orgName.trim()} onClick={() => startBlank(orgName.trim())}>
              Start a new handbook in this browser
            </Button>
          </div>

          <div className="text-center text-xs text-muted-foreground">or</div>

          <Button variant="outline" disabled={busy} onClick={handleLoadClick}>
            Load a handbook file…
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChosen} />

          <Button variant="outline" disabled={busy} onClick={handleConnectDrive}>
            Connect a Google Drive folder…
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
