// Minimal wrapper around Google Identity Services' OAuth token client.
// Loaded lazily so the rest of the app has no hard dependency on Google's script.

const GIS_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function getGoogleClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new Error(
      "Missing VITE_GOOGLE_CLIENT_ID. Create an OAuth Client ID (Web application) in " +
        "Google Cloud Console and set it in a .env.local file before using any Google Drive feature.",
    );
  }
  return clientId;
}

/** Returns a valid Drive access token, prompting the user to sign in if needed. */
export async function getDriveAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  await loadGisScript();
  const clientId = getGoogleClientId();

  return new Promise<string>((resolve, reject) => {
    // A fresh token client per call, so each request's callback settles its own promise.
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_FILE_SCOPE,
      callback: (response: TokenResponse) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "Google sign-in failed"));
          return;
        }
        cachedToken = {
          value: response.access_token,
          // Access tokens last ~1 hour; refresh a little early.
          expiresAt: Date.now() + 55 * 60 * 1000,
        };
        resolve(response.access_token);
      },
      error_callback: (error: unknown) => reject(error instanceof Error ? error : new Error(String(error))),
    });
    client.requestAccessToken();
  });
}
