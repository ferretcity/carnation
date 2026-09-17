import { marked } from "marked";
import type { Handbook, Page } from "../types";
import { getDriveAccessToken } from "./googleAuth";
import { createOrUpdateDoc, findOrCreateFolder, getWebViewLink } from "./driveApi";
import { useHandbookStore } from "../store";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function stepsToHtml(page: Page): string {
  const items = (page.steps ?? [])
    .map((step) =>
      step.type === "decision"
        ? `<li>${escapeHtml(step.text)}<br>&emsp;Yes — ${escapeHtml(step.yes ?? "")}<br>&emsp;No — ${escapeHtml(step.no ?? "")}</li>`
        : `<li>${escapeHtml(step.text)}</li>`,
    )
    .join("");
  return `<ol>${items || "<li>Empty.</li>"}</ol>`;
}

export interface SaveProgress {
  sectionTitle: string;
  pageTitle: string;
  done: number;
  total: number;
}

/**
 * Saves the whole handbook into a "Handbook" folder (with one subfolder per
 * pillar) in the signed-in user's Drive, as native Google Docs. Re-running
 * this updates existing docs in place rather than duplicating them.
 */
export async function saveHandbookToDrive(
  handbook: Handbook,
  onProgress?: (progress: SaveProgress) => void,
): Promise<string> {
  const accessToken = await getDriveAccessToken();
  const { setDriveRootFolderId, setSectionDriveFolderId, setPageDriveFileId } =
    useHandbookStore.getState();

  const rootFolderId = await findOrCreateFolder(
    accessToken,
    "Handbook",
    undefined,
    handbook.driveRootFolderId,
  );
  if (rootFolderId !== handbook.driveRootFolderId) setDriveRootFolderId(rootFolderId);

  const total = handbook.sections.reduce((sum, s) => sum + s.pages.length, 0);
  let done = 0;

  for (const section of handbook.sections) {
    const sectionFolderId = await findOrCreateFolder(
      accessToken,
      section.title,
      rootFolderId,
      section.driveFolderId,
    );
    if (sectionFolderId !== section.driveFolderId) {
      setSectionDriveFolderId(section.id, sectionFolderId);
    }

    for (const p of section.pages) {
      onProgress?.({ sectionTitle: section.title, pageTitle: p.title, done, total });
      const html =
        p.kind === "procedure" || p.kind === "activity"
          ? stepsToHtml(p)
          : ((await marked.parse(p.body || "_Empty page._")) as string);
      const fileId = await createOrUpdateDoc(
        accessToken,
        p.title,
        html,
        sectionFolderId,
        p.driveFileId,
      );
      if (fileId !== p.driveFileId) setPageDriveFileId(p.id, fileId);
      done += 1;
    }
  }

  return getWebViewLink(accessToken, rootFolderId);
}
