import type { Page } from "./types";

export function pageToMarkdownFile(page: Page): string {
  const frontmatter: Record<string, string> = { title: page.title, kind: page.kind };
  if (page.ownerEmail) frontmatter.ownerEmail = page.ownerEmail;
  if (page.lastReviewedAt) frontmatter.lastReviewedAt = page.lastReviewedAt;
  if (page.servesPageId) frontmatter.servesPageId = page.servesPageId;
  if (page.schedule) frontmatter.schedule = page.schedule;
  if (page.linkedOrgNodeIds?.length) frontmatter.linkedOrgNodeIds = page.linkedOrgNodeIds.join(",");
  if (page.editorialNotes?.purpose) frontmatter.purpose = page.editorialNotes.purpose;
  if (page.editorialNotes?.editingGuidance) frontmatter.editingGuidance = page.editorialNotes.editingGuidance;
  if (page.editorialNotes?.audience) frontmatter.audience = page.editorialNotes.audience;

  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join("\n");

  return `---\n${yaml}\n---\n\n${page.body}\n`;
}
