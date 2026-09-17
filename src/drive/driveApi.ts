// Thin wrapper around the Drive REST API v3, called directly with `fetch` since
// Carnation is a static, client-only app (no server to run the googleapis Node SDK).

const FILES_URL = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

async function driveFetch(url: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(accessToken), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Drive API ${res.status} ${res.statusText}: ${body}`);
  }
  return res;
}

/** Checks a cached file/folder id still exists and isn't trashed. */
async function fileStillExists(id: string, accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${FILES_URL}/${id}?fields=id,trashed`, {
      headers: authHeaders(accessToken),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { trashed?: boolean };
    return !data.trashed;
  } catch {
    return false;
  }
}

export async function findOrCreateFolder(
  accessToken: string,
  name: string,
  parentId: string | undefined,
  cachedId: string | undefined,
): Promise<string> {
  if (cachedId && (await fileStillExists(cachedId, accessToken))) {
    return cachedId;
  }

  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `mimeType='${FOLDER_MIME}' and name='${name.replace(/'/g, "\\'")}' and trashed=false${parentClause}`;
  const searchUrl = `${FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const searchRes = await driveFetch(searchUrl, accessToken);
  const searchData = (await searchRes.json()) as { files?: { id: string }[] };
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await driveFetch(FILES_URL, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    }),
  });
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

function buildMultipartBody(metadata: Record<string, unknown>, htmlContent: string, boundary: string): string {
  return (
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: text/html; charset=UTF-8\r\n\r\n" +
    `${htmlContent}\r\n` +
    `--${boundary}--`
  );
}

/**
 * Creates (or updates, if `existingFileId` is given and still valid) a native
 * Google Doc from HTML content — Drive converts text/html uploads into a Doc
 * automatically when mimeType is set to the Google Docs type.
 */
export async function createOrUpdateDoc(
  accessToken: string,
  title: string,
  htmlContent: string,
  folderId: string,
  existingFileId: string | undefined,
): Promise<string> {
  const boundary = `carnation-${Math.random().toString(36).slice(2)}`;
  const body = buildMultipartBody({ name: title, mimeType: DOC_MIME }, htmlContent, boundary);
  const headers = { "Content-Type": `multipart/related; boundary=${boundary}` };

  if (existingFileId && (await fileStillExists(existingFileId, accessToken))) {
    const res = await driveFetch(`${UPLOAD_URL}/${existingFileId}?uploadType=multipart`, accessToken, {
      method: "PATCH",
      headers,
      body,
    });
    const data = (await res.json()) as { id: string };
    return data.id;
  }

  const createBody = buildMultipartBody(
    { name: title, mimeType: DOC_MIME, parents: [folderId] },
    htmlContent,
    boundary,
  );
  const res = await driveFetch(`${UPLOAD_URL}?uploadType=multipart`, accessToken, {
    method: "POST",
    headers,
    body: createBody,
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function getWebViewLink(accessToken: string, fileId: string): Promise<string> {
  const res = await driveFetch(`${FILES_URL}/${fileId}?fields=webViewLink`, accessToken);
  const data = (await res.json()) as { webViewLink: string };
  return data.webViewLink;
}

/** Finds a (non-folder) file by exact name directly inside a folder, or null. */
export async function findFileInFolder(
  accessToken: string,
  folderId: string,
  name: string,
): Promise<string | null> {
  const q = `'${folderId}' in parents and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
  const url = `${FILES_URL}?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const res = await driveFetch(url, accessToken);
  const data = (await res.json()) as { files?: { id: string }[] };
  return data.files?.[0]?.id ?? null;
}

export async function readJsonFile<T>(accessToken: string, fileId: string): Promise<T> {
  const res = await driveFetch(`${FILES_URL}/${fileId}?alt=media`, accessToken);
  return res.json() as Promise<T>;
}

/**
 * Creates (or updates) a plain JSON file — unlike `createOrUpdateDoc`, the
 * content is stored byte-for-byte, not converted into a Google Doc.
 */
export async function createOrUpdateJsonFile(
  accessToken: string,
  folderId: string,
  existingFileId: string | undefined,
  name: string,
  data: unknown,
): Promise<string> {
  const boundary = `carnation-${Math.random().toString(36).slice(2)}`;
  const metadata = existingFileId ? { name } : { name, mimeType: "application/json", parents: [folderId] };
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(data)}\r\n` +
    `--${boundary}--`;
  const headers = { "Content-Type": `multipart/related; boundary=${boundary}` };

  const url = existingFileId
    ? `${UPLOAD_URL}/${existingFileId}?uploadType=multipart`
    : `${UPLOAD_URL}?uploadType=multipart`;
  const res = await driveFetch(url, accessToken, { method: existingFileId ? "PATCH" : "POST", headers, body });
  const json = (await res.json()) as { id: string };
  return json.id;
}
