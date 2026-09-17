import { create } from "zustand";
import type { Handbook, OrgNode, Page, PageKind } from "./types";
import { createBlankHandbook, migrateHandbook } from "./seed";
import { loadHandbook, saveHandbook } from "./persistence";
import { saveHandbookToDriveFolder, type DriveConnection } from "./drive/driveSync";
import { debounce } from "./debounce";
import { makeId, slugify } from "./id";

export type StorageMode =
  | { kind: "local" }
  | { kind: "drive"; folderId: string; folderName: string; fileId: string };

const STORAGE_MODE_KEY = "carnation:storage-mode";

function loadStorageMode(): StorageMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_MODE_KEY);
    return raw ? (JSON.parse(raw) as StorageMode) : null;
  } catch {
    return null;
  }
}

function saveStorageMode(mode: StorageMode | null): void {
  try {
    if (mode) localStorage.setItem(STORAGE_MODE_KEY, JSON.stringify(mode));
    else localStorage.removeItem(STORAGE_MODE_KEY);
  } catch {
    /* best-effort — a lost pointer just means "reconnect" next time */
  }
}

const persistLocalSoon = debounce((handbook: Handbook) => {
  void saveHandbook(handbook);
}, 400);

const persistDriveSoon = debounce((handbook: Handbook, folderId: string, fileId: string) => {
  void saveHandbookToDriveFolder(folderId, fileId, handbook).catch((err: unknown) => {
    console.error("Carnation: Drive save failed", err);
  });
}, 800);

function schedulePersist(handbook: Handbook, mode: StorageMode | null): void {
  if (mode?.kind === "drive") {
    persistDriveSoon(handbook, mode.folderId, mode.fileId);
  } else {
    persistLocalSoon(handbook);
  }
}

export type ViewMode = "editor" | "map";

interface HandbookState {
  handbook: Handbook | null;
  selectedPageId: string | null;
  ready: boolean;
  storageMode: StorageMode | null;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  init: () => Promise<void>;
  startBlank: (orgName: string) => void;
  startFromHandbook: (handbook: Handbook) => void;
  startDriveConnection: (conn: DriveConnection) => void;
  disconnect: () => void;
  replaceHandbook: (handbook: Handbook) => void;
  selectPage: (pageId: string) => void;
  updatePage: (pageId: string, patch: Partial<Page>) => void;
  addPage: (sectionId: string, title: string, kind?: PageKind) => void;
  deletePage: (sectionId: string, pageId: string) => void;
  movePage: (sectionId: string, pageId: string, direction: -1 | 1) => void;
  setDriveRootFolderId: (folderId: string) => void;
  setSectionDriveFolderId: (sectionId: string, folderId: string) => void;
  setPageDriveFileId: (pageId: string, fileId: string) => void;
  setOrgChart: (nodes: OrgNode[]) => void;
}

function touch(handbook: Handbook): Handbook {
  return { ...handbook, updatedAt: new Date().toISOString() };
}

function firstPageIdOf(handbook: Handbook): string | null {
  return handbook.sections[0]?.pages[0]?.id ?? null;
}

export const useHandbookStore = create<HandbookState>((set, get) => ({
  handbook: null,
  selectedPageId: null,
  ready: false,
  storageMode: null,
  view: "editor",
  setView: (view) => set({ view }),

  init: async () => {
    const mode = loadStorageMode();

    if (!mode || mode.kind === "local") {
      const existing = await loadHandbook();
      if (existing) {
        const handbook = migrateHandbook(existing);
        set({ handbook, selectedPageId: firstPageIdOf(handbook), ready: true, storageMode: { kind: "local" } });
        schedulePersist(handbook, { kind: "local" });
        return;
      }
      set({ handbook: null, ready: true, storageMode: null });
      return;
    }

    // A Drive connection was remembered, but reacquiring an OAuth token needs
    // a user gesture — surface it as a "reconnect" option instead of a silent retry.
    set({ handbook: null, ready: true, storageMode: mode });
  },

  startBlank: (orgName) => {
    const handbook = createBlankHandbook(orgName);
    set({ handbook, selectedPageId: firstPageIdOf(handbook), storageMode: { kind: "local" } });
    saveStorageMode({ kind: "local" });
    schedulePersist(handbook, { kind: "local" });
  },

  startFromHandbook: (handbook) => {
    const migrated = migrateHandbook(handbook);
    set({ handbook: migrated, selectedPageId: firstPageIdOf(migrated), storageMode: { kind: "local" } });
    saveStorageMode({ kind: "local" });
    schedulePersist(migrated, { kind: "local" });
  },

  startDriveConnection: (conn) => {
    const mode: StorageMode = { kind: "drive", folderId: conn.folderId, folderName: conn.folderName, fileId: conn.fileId };
    set({ handbook: conn.handbook, selectedPageId: firstPageIdOf(conn.handbook), storageMode: mode });
    saveStorageMode(mode);
  },

  disconnect: () => {
    saveStorageMode(null);
    set({ handbook: null, selectedPageId: null, storageMode: null });
  },

  replaceHandbook: (handbook) => {
    const { storageMode } = get();
    set({ handbook, selectedPageId: firstPageIdOf(handbook) });
    schedulePersist(handbook, storageMode);
  },

  selectPage: (pageId) => set({ selectedPageId: pageId }),

  updatePage: (pageId, patch) => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const next = touch({
      ...handbook,
      sections: handbook.sections.map((section) => ({
        ...section,
        pages: section.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
      })),
    });
    set({ handbook: next });
    schedulePersist(next, storageMode);
  },

  addPage: (sectionId, title, kind = "generic") => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const newPage: Page = {
      id: makeId(),
      title,
      slug: slugify(title),
      kind,
      body: "",
      steps: kind === "procedure" || kind === "activity" ? [] : undefined,
    };
    const next = touch({
      ...handbook,
      sections: handbook.sections.map((section) =>
        section.id === sectionId
          ? { ...section, pages: [...section.pages, newPage] }
          : section,
      ),
    });
    set({ handbook: next, selectedPageId: newPage.id });
    schedulePersist(next, storageMode);
  },

  deletePage: (sectionId, pageId) => {
    const { handbook, selectedPageId, storageMode } = get();
    if (!handbook) return;
    const next = touch({
      ...handbook,
      sections: handbook.sections.map((section) =>
        section.id === sectionId
          ? { ...section, pages: section.pages.filter((p) => p.id !== pageId) }
          : section,
      ),
    });
    const stillSelected = selectedPageId !== pageId;
    set({
      handbook: next,
      selectedPageId: stillSelected
        ? selectedPageId
        : (next.sections.flatMap((s) => s.pages)[0]?.id ?? null),
    });
    schedulePersist(next, storageMode);
  },

  movePage: (sectionId, pageId, direction) => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const next = touch({
      ...handbook,
      sections: handbook.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const index = section.pages.findIndex((p) => p.id === pageId);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= section.pages.length) {
          return section;
        }
        const pages = [...section.pages];
        [pages[index], pages[targetIndex]] = [pages[targetIndex], pages[index]];
        return { ...section, pages };
      }),
    });
    set({ handbook: next });
    schedulePersist(next, storageMode);
  },

  setDriveRootFolderId: (folderId) => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const next = { ...handbook, driveRootFolderId: folderId };
    set({ handbook: next });
    schedulePersist(next, storageMode);
  },

  setSectionDriveFolderId: (sectionId, folderId) => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const next = {
      ...handbook,
      sections: handbook.sections.map((s) =>
        s.id === sectionId ? { ...s, driveFolderId: folderId } : s,
      ),
    };
    set({ handbook: next });
    schedulePersist(next, storageMode);
  },

  setPageDriveFileId: (pageId, fileId) => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const next = {
      ...handbook,
      sections: handbook.sections.map((s) => ({
        ...s,
        pages: s.pages.map((p) => (p.id === pageId ? { ...p, driveFileId: fileId } : p)),
      })),
    };
    set({ handbook: next });
    schedulePersist(next, storageMode);
  },

  setOrgChart: (nodes) => {
    const { handbook, storageMode } = get();
    if (!handbook) return;
    const next = touch({ ...handbook, orgChart: nodes });
    set({ handbook: next });
    schedulePersist(next, storageMode);
  },
}));
