// Wraps Google's Picker JS API so the user can choose (or create) a real
// Drive folder — under the `drive.file` scope, this explicit pick is what
// grants Carnation access to a folder it did not create itself.

const GAPI_SRC = "https://apis.google.com/js/api.js";

interface PickerDoc {
  id: string;
  name: string;
}

interface PickerResponse {
  action: string;
  docs?: PickerDoc[];
}

interface PickerDocsView {
  setSelectFolderEnabled: (v: boolean) => PickerDocsView;
  setIncludeFolders: (v: boolean) => PickerDocsView;
}

interface PickerBuilder {
  addView: (view: PickerDocsView) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  setCallback: (cb: (response: PickerResponse) => void) => PickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
}

interface PickerNamespace {
  DocsView: new (viewId: unknown) => PickerDocsView;
  ViewId: { FOLDERS: unknown };
  Action: { PICKED: string; CANCEL: string };
  PickerBuilder: new () => PickerBuilder;
}

interface GapiGlobal {
  load: (name: string, options: { callback: () => void; onerror: (err: unknown) => void }) => void;
}

function getGapi(): GapiGlobal | undefined {
  return (window as unknown as { gapi?: GapiGlobal }).gapi;
}

function getPicker(): PickerNamespace | undefined {
  return (window as unknown as { google?: { picker?: PickerNamespace } }).google?.picker;
}

let gapiLoadPromise: Promise<void> | null = null;

function loadGapi(): Promise<void> {
  if (getGapi()?.load) return Promise.resolve();
  if (gapiLoadPromise) return gapiLoadPromise;
  gapiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GAPI_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Google API loader"));
    document.head.appendChild(script);
  });
  return gapiLoadPromise;
}

let pickerLoadPromise: Promise<void> | null = null;

function loadPickerLibrary(): Promise<void> {
  if (getPicker()) return Promise.resolve();
  if (pickerLoadPromise) return pickerLoadPromise;
  pickerLoadPromise = new Promise((resolve, reject) => {
    getGapi()!.load("picker", { callback: resolve, onerror: reject });
  });
  return pickerLoadPromise;
}

export function getGoogleApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "Missing VITE_GOOGLE_API_KEY. Enable the Google Picker API and create an API key in " +
        "Google Cloud Console, then set it in .env.local before connecting a Drive folder.",
    );
  }
  return key;
}

export interface PickedFolder {
  id: string;
  name: string;
}

/** Opens Google's folder picker. Resolves to null if the user cancels. */
export async function pickDriveFolder(accessToken: string): Promise<PickedFolder | null> {
  const apiKey = getGoogleApiKey();
  await loadGapi();
  await loadPickerLibrary();

  const picker = getPicker();
  if (!picker) throw new Error("Google Picker failed to load.");

  return new Promise((resolve, reject) => {
    try {
      const view = new picker.DocsView(picker.ViewId.FOLDERS).setSelectFolderEnabled(true).setIncludeFolders(true);

      const builder = new picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setTitle("Choose a folder for this handbook")
        .setCallback((response: PickerResponse) => {
          if (response.action === picker.Action.PICKED && response.docs?.[0]) {
            resolve({ id: response.docs[0].id, name: response.docs[0].name });
          } else if (response.action === picker.Action.CANCEL) {
            resolve(null);
          }
        });
      builder.build().setVisible(true);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
