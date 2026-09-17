import type { Handbook } from "../types";
import { getDriveAccessToken } from "./googleAuth";
import { createOrUpdateJsonFile, findFileInFolder, readJsonFile } from "./driveApi";
import { createBlankHandbook, migrateHandbook } from "../seed";

const HANDBOOK_FILE_NAME = "carnation.json";

export interface DriveConnection {
  handbook: Handbook;
  folderId: string;
  folderName: string;
  fileId: string;
}

/**
 * Connects to a Drive folder: loads its `carnation.json` if one exists, or
 * creates a fresh blank handbook (named after the folder) and writes it.
 */
export async function connectDriveFolder(folderId: string, folderName: string): Promise<DriveConnection> {
  const accessToken = await getDriveAccessToken();
  const existingFileId = await findFileInFolder(accessToken, folderId, HANDBOOK_FILE_NAME);

  if (existingFileId) {
    const raw = await readJsonFile<Handbook>(accessToken, existingFileId);
    return { handbook: migrateHandbook(raw), folderId, folderName, fileId: existingFileId };
  }

  const handbook = createBlankHandbook(folderName);
  const fileId = await createOrUpdateJsonFile(accessToken, folderId, undefined, HANDBOOK_FILE_NAME, handbook);
  return { handbook, folderId, folderName, fileId };
}

export async function saveHandbookToDriveFolder(
  folderId: string,
  fileId: string,
  handbook: Handbook,
): Promise<void> {
  const accessToken = await getDriveAccessToken();
  await createOrUpdateJsonFile(accessToken, folderId, fileId, HANDBOOK_FILE_NAME, handbook);
}
