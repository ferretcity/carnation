import type { Handbook, OrgNode, Page, PageKind, Section, Step } from "./types";
import { makeId } from "./id";

/**
 * A generic starting template for a new handbook: the fixed pillars, empty of
 * any organization's actual content. The only seeded content is a single
 * root role in the org chart, since the chart needs at least one node to
 * function — everything else is left for the org to write themselves.
 */

function step(type: Step["type"], text: string, extra?: Partial<Step>): Step {
  return { id: makeId(), type, text, ...extra };
}

function section(id: string, title: string, slug: string, pages: Page[] = []): Section {
  return { id, title, slug, pages };
}

function org(
  id: string,
  parentId: string | null,
  kind: OrgNode["kind"],
  title: string,
  description: string,
): OrgNode {
  return { id, parentId, kind, title, description };
}

export function createSeedOrgChart(): OrgNode[] {
  return [org("org-root", null, "role", "Leader", "Describe this role")];
}

export function createBlankHandbook(orgName: string): Handbook {
  return {
    id: makeId(),
    orgName,
    updatedAt: new Date().toISOString(),
    orgChart: createSeedOrgChart(),
    sections: [
      section("mission", "Mission", "mission"),
      section("values", "Values", "values"),
      section("organization", "Organization", "organization"),
      section("policies-and-procedures", "Policies & Procedures", "policies-and-procedures"),
      section("activities-and-schedules", "Activities & Schedules", "activities-and-schedules"),
    ],
  };
}

const LEGACY_KIND_MAP: Partial<Record<string, PageKind>> = {
  belief: "value",
  "org-unit": "generic",
};

/** Brings a handbook loaded from storage up to the current shape. */
export function migrateHandbook(handbook: Handbook): Handbook {
  const hasActivities = handbook.sections.some((s) => s.id === "activities-and-schedules");

  const sections = handbook.sections.map((s) => {
    if (s.id === "organization") return { ...s, pages: [] };
    const renamed = s.id === "beliefs" ? { ...s, id: "values", title: "Values" } : s;
    return {
      ...renamed,
      pages: renamed.pages.map((p) => {
        const kind = (LEGACY_KIND_MAP[p.kind] ?? p.kind) as PageKind;
        const steps =
          (kind === "procedure" || kind === "activity") && !p.steps
            ? [step("step", p.body || `Describe the first step of ${p.title}.`)]
            : p.steps;
        return { ...p, kind, steps };
      }),
    };
  });

  return {
    ...handbook,
    orgChart: handbook.orgChart ?? createSeedOrgChart(),
    sections: hasActivities
      ? sections
      : [...sections, section("activities-and-schedules", "Activities & Schedules", "activities-and-schedules")],
  };
}
