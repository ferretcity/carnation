export type PageKind =
  | "mission"
  | "value"
  | "policy"
  | "procedure"
  | "activity"
  | "generic";

export interface Step {
  id: string;
  type: "step" | "decision";
  text: string;
  /** Only for type "decision". */
  yes?: string;
  no?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  kind: PageKind;
  /** Markdown body. Used for every kind except "procedure"/"activity", which use `steps`. */
  body: string;
  /** Ordered steps for a "procedure"/"activity" page — doubles as a guide and a flowchart. */
  steps?: Step[];
  /** Free-text schedule/recurrence, e.g. "Annually, every January". Only for "activity". */
  schedule?: string;
  /** OrgNode ids (roles/groups) responsible for this activity. Only for "activity". */
  linkedOrgNodeIds?: string[];
  ownerEmail?: string;
  /** ISO date string. */
  lastReviewedAt?: string;
  /** Id of a Mission/Values page this page exists to serve (traceability). */
  servesPageId?: string;
  /** Editorial notes for whoever maintains this page — not shown to readers. */
  editorialNotes?: EditorialNotes;
  /** Drive file id from a previous "Save to Drive", so re-saves update in place. */
  driveFileId?: string;
}

/** Guidance for the people who maintain a page, not its readers. */
export interface EditorialNotes {
  /** Why this page exists. */
  purpose?: string;
  /** How it should be kept up to date (cadence, tone, level of detail, etc.). */
  editingGuidance?: string;
  /** Who it's written for (a role, a ministry, "new members", etc.). */
  audience?: string;
}

export interface Section {
  id: string;
  title: string;
  slug: string;
  pages: Page[];
  /** Optional nesting, e.g. a pillar with sub-topics. Not used by the seed data. */
  subsections?: Section[];
  /** Drive folder id from a previous "Save to Drive", so re-saves reuse the folder. */
  driveFolderId?: string;
}

/** A node in the Organization pillar's chart — either a reporting role or a group/collective. */
export interface OrgNode {
  id: string;
  parentId: string | null;
  kind: "role" | "group";
  title: string;
  description: string;
}

export interface Handbook {
  id: string;
  orgName: string;
  /** The fixed pillars, in display order. */
  sections: Section[];
  /** The Organization pillar's role/group tree (not stored as pages). */
  orgChart: OrgNode[];
  updatedAt: string;
  /** Drive folder id of the top-level "Handbook" folder, once saved once. */
  driveRootFolderId?: string;
}

export const PILLAR_IDS = [
  "mission",
  "values",
  "organization",
  "policies-and-procedures",
  "activities-and-schedules",
] as const;

export type PillarId = (typeof PILLAR_IDS)[number];

/** Sentinel selectedPageId that means "show the Organization chart," not a real Page. */
export const ORG_CHART_ID = "__org-chart__";
